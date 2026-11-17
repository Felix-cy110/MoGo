#include "mogo/core_shared/error.hpp"
#include "mogo/personal_finance/application/finance_service.hpp"
#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

#include <sqlite3.h>

#include <chrono>
#include <ctime>
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

void executeSql(const std::string& path, const std::string& sql) {
    sqlite3* database = nullptr;
    if (sqlite3_open(path.c_str(), &database) != SQLITE_OK) {
        const std::string message = database ? sqlite3_errmsg(database) : "unknown error";
        if (database) sqlite3_close(database);
        throw std::runtime_error("unable to create legacy database: " + message);
    }
    char* error = nullptr;
    const int result = sqlite3_exec(database, sql.c_str(), nullptr, nullptr, &error);
    const std::string message = error ? error : "";
    sqlite3_free(error);
    sqlite3_close(database);
    if (result != SQLITE_OK) throw std::runtime_error("legacy database setup failed: " + message);
}

std::int64_t localEpochMillis(int year, int month, int day, int hour = 0) {
    std::tm value{};
    value.tm_year = year - 1900;
    value.tm_mon = month - 1;
    value.tm_mday = day;
    value.tm_hour = hour;
    value.tm_isdst = -1;
    return static_cast<std::int64_t>(std::mktime(&value)) * 1000;
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

void testLegacySchemaCompatibility() {
    TemporaryDatabase database;
    const auto created_at = localEpochMillis(2026, 1, 1);
    const auto budget_date = localEpochMillis(2026, 1, 2);
    const auto occurred_at = localEpochMillis(2026, 1, 2, 8);
    executeSql(database.path(), R"SQL(
CREATE TABLE expense_categories (
    id INTEGER PRIMARY KEY, is_active BOOLEAN NOT NULL, code VARCHAR(40) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL, i18n_key VARCHAR(120), name VARCHAR(80) NOT NULL,
    note_policy VARCHAR(20) NOT NULL, sort_order INTEGER NOT NULL,
    is_system BOOLEAN NOT NULL, updated_at TIMESTAMP NOT NULL
);
CREATE TABLE daily_budgets (
    id INTEGER PRIMARY KEY, budget_date DATE NOT NULL UNIQUE, created_at TIMESTAMP NOT NULL,
    currency_code VARCHAR(8) NOT NULL, max_amount_cents BIGINT NOT NULL, updated_at TIMESTAMP NOT NULL
);
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY, amount_cents BIGINT NOT NULL, client_request_id VARCHAR(80) UNIQUE,
    created_at TIMESTAMP NOT NULL, expense_date DATE NOT NULL, note VARCHAR(500),
    occurred_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL, category_id BIGINT NOT NULL
);
CREATE TABLE alert_rules (
    id INTEGER PRIMARY KEY, is_active BOOLEAN NOT NULL, code VARCHAR(60) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL, message_key VARCHAR(120) NOT NULL,
    severity VARCHAR(20) NOT NULL, threshold_percent INTEGER NOT NULL, updated_at TIMESTAMP NOT NULL
);
CREATE TABLE alert_daily_states (
    budget_date DATE NOT NULL, rule_id BIGINT NOT NULL, last_expense_id BIGINT,
    last_total_cents BIGINT NOT NULL, is_triggered BOOLEAN NOT NULL,
    triggered_at TIMESTAMP, updated_at TIMESTAMP NOT NULL, PRIMARY KEY (budget_date, rule_id)
);
CREATE TABLE alert_events (
    id INTEGER PRIMARY KEY, budget_amount_cents BIGINT NOT NULL, budget_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL, event_type VARCHAR(40) NOT NULL,
    message_key VARCHAR(120) NOT NULL, threshold_percent INTEGER NOT NULL,
    total_amount_cents BIGINT NOT NULL, expense_id BIGINT, rule_id BIGINT NOT NULL
);
)SQL" + std::string("INSERT INTO expense_categories VALUES ") +
        "(7, 1, 'LEGACY', " + std::to_string(created_at) +
        ", NULL, '旧分类', 'OPTIONAL', 5, 0, " + std::to_string(created_at) + ");" +
        "INSERT INTO daily_budgets VALUES (3, " + std::to_string(budget_date) + ", " +
        std::to_string(created_at) + ", 'CNY', 5000, " + std::to_string(created_at) + ");" +
        "INSERT INTO expenses VALUES (9, 1200, 'legacy-request', " +
        std::to_string(occurred_at) + ", " + std::to_string(budget_date) +
        ", NULL, " + std::to_string(occurred_at) + ", " + std::to_string(occurred_at) + ", 7);");

    SqliteFinanceRepository repository(database.path());
    FinanceService service(repository);
    const Dashboard dashboard = service.getDashboard("2026-01-02");
    require(dashboard.budget_set, "legacy budget must remain readable");
    require(dashboard.budget_amount_cents == 5000, "legacy budget amount must be preserved");
    require(dashboard.expense_count == 1, "legacy expense must remain readable");
    require(dashboard.expenses.front().category_code == "LEGACY", "legacy category must remain readable");
    require(dashboard.expenses.front().expense_date == "2026-01-02",
            "legacy date must be normalized to ISO format");
}

}  // namespace

int main() {
    const std::vector<std::pair<std::string, std::function<void()>>> tests = {
        {"seed and categories", testSeedAndCategories},
        {"expense workflow", testExpenseWorkflow},
        {"legacy schema compatibility", testLegacySchemaCompatibility},
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
