#include "mogo/core_shared/error.hpp"
#include "mogo/personal_finance/application/finance_service.hpp"
#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

#include <chrono>
#include <filesystem>
#include <functional>
#include <iostream>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

using mogo::core_shared::ApplicationError;
using namespace mogo::personal_finance;

class TemporaryDatabase final {
public:
    TemporaryDatabase() {
        const auto nonce = std::chrono::steady_clock::now().time_since_epoch().count();
        path_ = std::filesystem::temp_directory_path() /
                ("mogo-personal-finance-" + std::to_string(nonce) + ".db");
    }

    ~TemporaryDatabase() {
        std::error_code error;
        std::filesystem::remove(path_, error);
        std::filesystem::remove(path_.string() + "-shm", error);
        std::filesystem::remove(path_.string() + "-wal", error);
    }

    [[nodiscard]] std::string path() const { return path_.string(); }

private:
    std::filesystem::path path_;
};

void require(bool condition, const std::string& message) {
    if (!condition) throw std::runtime_error(message);
}

template <typename Action>
void requireApplicationError(const std::string& expected_code, Action action) {
    try {
        action();
    } catch (const ApplicationError& error) {
        require(error.code() == expected_code,
                "expected error " + expected_code + ", got " + error.code());
        return;
    }
    throw std::runtime_error("expected ApplicationError with code " + expected_code);
}

const Category& categoryByCode(const std::vector<Category>& categories, const std::string& code) {
    for (const auto& category : categories) {
        if (category.code == code) return category;
    }
    throw std::runtime_error("missing category " + code);
}

void testSeedAndCategories() {
    TemporaryDatabase database;
    SqliteFinanceRepository repository(database.path());
    FinanceService service(repository);

    const auto categories = service.getCategories();
    require(categories.size() == 4, "expected four seeded categories");
    require(categoryByCode(categories, "MEAL").note_policy == "OPTIONAL", "meal must allow notes");
    require(categoryByCode(categories, "OTHER").note_policy == "REQUIRED", "other must require notes");

    const Category custom = service.addCategory(CategoryInput{.name = "  日用品  "});
    require(custom.name == "日用品", "custom category name must be trimmed");
    require(custom.note_policy == "OPTIONAL", "custom category notes must be optional");
    require(!custom.system, "custom category must not be a system category");
    requireApplicationError("CATEGORY_NAME_EXISTS", [&] {
        service.addCategory(CategoryInput{.name = "日用品"});
    });

    const Category renamed = service.updateCategory(custom.id, CategoryInput{.name = "家庭用品"});
    require(renamed.name == "家庭用品", "category name must be editable");
    require(!renamed.i18n_key, "edited category must use its user-defined name");
    require(service.searchCategories("家庭").size() == 1, "category search must support partial names");

    const Category deleted = service.deleteCategory(custom.id);
    require(!deleted.active, "deleting a category must deactivate it");
    require(service.getCategories().size() == 4, "deleted category must leave the expense selector");
    const auto all_categories = service.searchCategories("");
    require(all_categories.size() == 5, "management search must include deleted categories");
    require(!all_categories.back().active, "deleted categories must sort after active categories");
    requireApplicationError("CATEGORY_NOT_FOUND", [&] {
        service.updateCategory(custom.id, CategoryInput{.name = "不能修改"});
    });
}

void testDeletedCategoryKeepsHistoricalName() {
    TemporaryDatabase database;
    SqliteFinanceRepository repository(database.path());
    FinanceService service(repository);
    const std::string date = "2026-11-17";
    const Category category = service.addCategory(CategoryInput{.name = "旅行"});

    service.saveBudget(BudgetInput{.date = date, .amount_cents = 10000});
    service.addExpense(ExpenseInput{
        .date = date,
        .amount_cents = 1200,
        .category_id = category.id,
        .note = "车票",
    });
    service.deleteCategory(category.id);

    const Dashboard dashboard = service.getDashboard(date);
    require(dashboard.expense_count == 1, "historical expense must survive category deletion");
    require(dashboard.expenses.front().category_name == "旅行",
            "historical expense must retain the deleted category name");
    require(dashboard.category_totals.front().category_name == "旅行",
            "historical category summary must retain the deleted category name");
    requireApplicationError("CATEGORY_NOT_FOUND", [&] {
        service.addExpense(ExpenseInput{
            .date = date,
            .amount_cents = 100,
            .category_id = category.id,
        });
    });
}

void testExpenseWorkflow() {
    TemporaryDatabase database;
    SqliteFinanceRepository repository(database.path());
    FinanceService service(repository);
    const auto categories = service.getCategories();
    const auto meal = categoryByCode(categories, "MEAL");
    const auto commute = categoryByCode(categories, "COMMUTE");
    const auto other = categoryByCode(categories, "OTHER");
    const std::string date = "2026-11-17";

    service.saveBudget(BudgetInput{.date = date, .amount_cents = 10000});
    requireApplicationError("NOTE_REQUIRED", [&] {
        service.addExpense(ExpenseInput{
            .date = date,
            .amount_cents = 100,
            .category_id = other.id,
        });
    });

    const auto first = service.addExpense(ExpenseInput{
        .date = date,
        .amount_cents = 7900,
        .category_id = meal.id,
        .note = "午餐",
        .client_request_id = "request-1",
    });
    require(first.alerts.empty(), "79 percent must not trigger an alert");

    const auto warning = service.addExpense(ExpenseInput{
        .date = date,
        .amount_cents = 100,
        .category_id = commute.id,
        .client_request_id = "request-2",
    });
    require(warning.alerts.size() == 1, "80 percent must trigger one alert");
    require(warning.alerts.front().code == "BUDGET_WARNING", "expected warning alert");

    const auto duplicate = service.addExpense(ExpenseInput{
        .date = date,
        .amount_cents = 100,
        .category_id = commute.id,
        .client_request_id = "request-2",
    });
    require(duplicate.expense.id == warning.expense.id, "idempotent request must reuse expense");
    require(duplicate.total_amount_cents == 8000, "idempotent request must not change total");
    requireApplicationError("VALIDATION_ERROR", [&] {
        service.addExpense(ExpenseInput{
            .date = date,
            .amount_cents = 100,
            .category_id = commute.id,
            .client_request_id = std::string(81, 'x'),
        });
    });

    service.addExpense(ExpenseInput{
        .date = date,
        .amount_cents = 100,
        .category_id = commute.id,
        .client_request_id = "   ",
    });
    service.addExpense(ExpenseInput{
        .date = date,
        .amount_cents = 100,
        .category_id = commute.id,
        .client_request_id = "",
    });

    const auto exceeded = service.addExpense(ExpenseInput{
        .date = date,
        .amount_cents = 2000,
        .category_id = other.id,
        .note = "临时支出",
        .client_request_id = "request-3",
    });
    require(exceeded.alerts.size() == 1, "100 percent must trigger one new alert");
    require(exceeded.alerts.front().code == "BUDGET_EXCEEDED", "expected exceeded alert");

    const auto updated = service.updateExpense(first.expense.id, ExpenseUpdateInput{
        .amount_cents = 7000,
        .category_id = commute.id,
        .note = std::nullopt,
    });
    require(updated.expense.id == first.expense.id, "editing must preserve the expense id");
    require(updated.expense.category_code == "COMMUTE", "editing must update the category");
    require(updated.total_amount_cents == 9300, "editing must recalculate the total");

    const Dashboard dashboard = service.getDashboard(date);
    require(dashboard.expense_count == 5, "editing must not insert a new expense");
    require(dashboard.total_amount_cents == 9300, "dashboard total must reflect the edit");
    require(dashboard.category_totals.size() == 2, "dashboard must rebuild category totals");
}


}  // namespace

int main() {
    const std::vector<std::pair<std::string, std::function<void()>>> tests = {
        {"seed and categories", testSeedAndCategories},
        {"deleted category history", testDeletedCategoryKeepsHistoricalName},
        {"expense workflow", testExpenseWorkflow},
    };

    int failures = 0;
    for (const auto& [name, test] : tests) {
        try {
            test();
            std::cout << "[PASS] " << name << '\n';
        } catch (const std::exception& error) {
            ++failures;
            std::cerr << "[FAIL] " << name << ": " << error.what() << '\n';
        }
    }
    return failures == 0 ? 0 : 1;
}
