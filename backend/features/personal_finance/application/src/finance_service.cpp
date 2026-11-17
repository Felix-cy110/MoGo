#include "mogo/personal_finance/application/finance_service.hpp"

#include "mogo/core_shared/error.hpp"

#include <algorithm>
#include <chrono>
#include <cctype>
#include <iomanip>
#include <map>
#include <limits>
#include <numeric>
#include <random>
#include <regex>
#include <sstream>
#include <utility>

namespace mogo::personal_finance {
namespace {

using mogo::core_shared::ApplicationError;

class Transaction final {
public:
    explicit Transaction(FinanceRepository& repository) : repository_(repository) {
        repository_.beginTransaction();
    }

    ~Transaction() {
        if (!committed_) repository_.rollbackTransaction();
    }

    void commit() {
        repository_.commitTransaction();
        committed_ = true;
    }

private:
    FinanceRepository& repository_;
    bool committed_{};
};

std::string trim(std::string value) {
    const auto not_space = [](unsigned char ch) { return !std::isspace(ch); };
    value.erase(value.begin(), std::find_if(value.begin(), value.end(), not_space));
    value.erase(std::find_if(value.rbegin(), value.rend(), not_space).base(), value.end());
    return value;
}

std::size_t utf8Length(const std::string& value) {
    return static_cast<std::size_t>(std::count_if(value.begin(), value.end(), [](unsigned char ch) {
        return (ch & 0xC0U) != 0x80U;
    }));
}

void validateDate(const std::string& date) {
    static const std::regex format(R"(^\d{4}-\d{2}-\d{2}$)");
    if (!std::regex_match(date, format)) {
        throw ApplicationError(400, "VALIDATION_ERROR", "日期格式必须为 YYYY-MM-DD");
    }

    const int year = std::stoi(date.substr(0, 4));
    const unsigned month = static_cast<unsigned>(std::stoi(date.substr(5, 2)));
    const unsigned day = static_cast<unsigned>(std::stoi(date.substr(8, 2)));
    if (!std::chrono::year_month_day{std::chrono::year{year}, std::chrono::month{month},
                                     std::chrono::day{day}}.ok()) {
        throw ApplicationError(400, "VALIDATION_ERROR", "日期无效");
    }
}

std::string nowLocal() {
    const auto now = std::chrono::system_clock::now();
    const std::time_t time = std::chrono::system_clock::to_time_t(now);
    std::tm local{};
#if defined(_WIN32)
    localtime_s(&local, &time);
#else
    localtime_r(&time, &local);
#endif
    std::ostringstream output;
    output << std::put_time(&local, "%Y-%m-%dT%H:%M:%S");
    return output.str();
}

std::string randomCategoryCode() {
    static constexpr char hex[] = "0123456789ABCDEF";
    std::random_device device;
    std::mt19937_64 generator(device());
    std::uniform_int_distribution<int> distribution(0, 15);
    std::string code = "CUSTOM_";
    code.reserve(39);
    for (int index = 0; index < 32; ++index) code.push_back(hex[distribution(generator)]);
    return code;
}

}  // namespace

int usagePercent(MoneyCents total_cents, MoneyCents budget_cents) {
    if (budget_cents <= 0) return 0;
    const long double percentage =
        static_cast<long double>(total_cents) * 100.0L / static_cast<long double>(budget_cents);
    return percentage >= static_cast<long double>(std::numeric_limits<int>::max())
               ? std::numeric_limits<int>::max()
               : static_cast<int>(percentage);
}

bool reachedThreshold(MoneyCents total_cents, MoneyCents budget_cents, int threshold_percent) {
    return budget_cents > 0 &&
           static_cast<long double>(total_cents) * 100.0L >=
               static_cast<long double>(budget_cents) * threshold_percent;
}

FinanceService::FinanceService(FinanceRepository& repository) : repository_(repository) {
    repository_.migrateAndSeed();
}

std::vector<Category> FinanceService::getCategories() {
    std::scoped_lock lock(mutex_);
    return repository_.categories();
}

Category FinanceService::addCategory(const CategoryInput& input) {
    std::scoped_lock lock(mutex_);
    const std::string name = trim(input.name);
    if (name.empty() || utf8Length(name) > 80) {
        throw ApplicationError(400, "VALIDATION_ERROR", "分类名称不能为空且不能超过 80 个字符");
    }
    if (repository_.categoryNameExists(name)) {
        throw ApplicationError(409, "CATEGORY_NAME_EXISTS", "分类名称已存在");
    }

    Transaction transaction(repository_);
    Category category{
        .code = randomCategoryCode(),
        .name = name,
        .i18n_key = std::nullopt,
        .note_policy = "OPTIONAL",
        .system = false,
        .sort_order = repository_.maxCategorySortOrder() + 10,
    };
    category = repository_.insertCategory(category);
    transaction.commit();
    return category;
}

Dashboard FinanceService::getDashboard(const std::string& date) {
    std::scoped_lock lock(mutex_);
    validateDate(date);
    const auto budget = repository_.budgetForDate(date);
    auto expenses = repository_.expensesForDate(date);
    const MoneyCents total = std::accumulate(expenses.begin(), expenses.end(), MoneyCents{},
                                             [](MoneyCents sum, const Expense& expense) {
                                                 return sum + expense.amount_cents;
                                             });

    std::map<std::int64_t, CategoryTotal> totals_by_category;
    for (const auto& expense : expenses) {
        auto& total_for_category = totals_by_category[expense.category_id];
        total_for_category.category_id = expense.category_id;
        total_for_category.category_code = expense.category_code;
        total_for_category.category_name = expense.category_name;
        total_for_category.amount_cents += expense.amount_cents;
        ++total_for_category.expense_count;
    }
    std::vector<CategoryTotal> category_totals;
    for (auto& [_, total_for_category] : totals_by_category) {
        category_totals.push_back(std::move(total_for_category));
    }
    std::sort(category_totals.begin(), category_totals.end(), [](const auto& left, const auto& right) {
        return left.amount_cents > right.amount_cents;
    });

    const MoneyCents budget_cents = budget.value_or(0);
    return Dashboard{
        .date = date,
        .budget_set = budget.has_value() && budget_cents > 0,
        .budget_amount_cents = budget_cents,
        .total_amount_cents = total,
        .remaining_amount_cents = std::max<MoneyCents>(0, budget_cents - total),
        .usage_percent = usagePercent(total, budget_cents),
        .expense_count = static_cast<int>(expenses.size()),
        .category_totals = std::move(category_totals),
        .expenses = std::move(expenses),
    };
}

BudgetInput FinanceService::saveBudget(const BudgetInput& input) {
    std::scoped_lock lock(mutex_);
    validateDate(input.date);
    if (input.amount_cents <= 0) {
        throw ApplicationError(400, "VALIDATION_ERROR", "预算金额必须大于零");
    }
    Transaction transaction(repository_);
    repository_.saveBudget(input.date, input.amount_cents);
    transaction.commit();
    return input;
}

ExpenseMutationResult FinanceService::addExpense(const ExpenseInput& input) {
    std::scoped_lock lock(mutex_);
    validateDate(input.date);
    if (input.amount_cents <= 0) {
        throw ApplicationError(400, "VALIDATION_ERROR", "消费金额必须大于零");
    }
    std::optional<std::string> request_id;
    if (input.client_request_id) {
        const std::string normalized = trim(*input.client_request_id);
        if (utf8Length(normalized) > 80) {
            throw ApplicationError(400, "VALIDATION_ERROR", "客户端请求 ID 不能超过 80 个字符");
        }
        if (!normalized.empty()) request_id = normalized;
    }
    if (request_id) {
        if (const auto existing = repository_.expenseByClientRequestId(*request_id)) {
            return responseFor(*existing, {});
        }
    }

    const Category category = requireActiveCategory(input.category_id);
    const auto note = normalizeNote(category, input.note);
    Transaction transaction(repository_);
    const Expense expense = repository_.insertExpense(input.date, input.amount_cents, category, note,
                                                       request_id, nowLocal());
    const MoneyCents total = repository_.sumExpensesForDate(input.date);
    const MoneyCents budget = repository_.budgetForDate(input.date).value_or(0);
    auto alerts = budget > 0 ? evaluateAlerts(input.date, expense, total, budget) : std::vector<Alert>{};
    transaction.commit();
    return ExpenseMutationResult{
        .expense = expense,
        .total_amount_cents = total,
        .budget_amount_cents = budget,
        .remaining_amount_cents = std::max<MoneyCents>(0, budget - total),
        .usage_percent = usagePercent(total, budget),
        .alerts = std::move(alerts),
    };
}

ExpenseMutationResult FinanceService::updateExpense(std::int64_t expense_id,
                                                     const ExpenseUpdateInput& input) {
    std::scoped_lock lock(mutex_);
    if (input.amount_cents <= 0) {
        throw ApplicationError(400, "VALIDATION_ERROR", "消费金额必须大于零");
    }
    const auto existing = repository_.expenseById(expense_id);
    if (!existing) throw ApplicationError(404, "EXPENSE_NOT_FOUND", "消费记录不存在");

    const Category category = requireActiveCategory(input.category_id);
    const auto note = normalizeNote(category, input.note);
    Transaction transaction(repository_);
    const Expense expense = repository_.updateExpense(expense_id, input.amount_cents, category, note);
    const MoneyCents total = repository_.sumExpensesForDate(expense.expense_date);
    const MoneyCents budget = repository_.budgetForDate(expense.expense_date).value_or(0);
    auto alerts = budget > 0 ? evaluateAlerts(expense.expense_date, expense, total, budget)
                             : std::vector<Alert>{};
    transaction.commit();
    return ExpenseMutationResult{
        .expense = expense,
        .total_amount_cents = total,
        .budget_amount_cents = budget,
        .remaining_amount_cents = std::max<MoneyCents>(0, budget - total),
        .usage_percent = usagePercent(total, budget),
        .alerts = std::move(alerts),
    };
}

Category FinanceService::requireActiveCategory(std::int64_t category_id) {
    const auto category = repository_.categoryById(category_id);
    if (!category) throw ApplicationError(400, "CATEGORY_NOT_FOUND", "所选分类不可用");
    return *category;
}

std::optional<std::string> FinanceService::normalizeNote(
    const Category& category, const std::optional<std::string>& raw_note) {
    std::optional<std::string> note;
    if (raw_note) {
        const std::string normalized = trim(*raw_note);
        if (!normalized.empty()) note = normalized;
    }
    if (category.note_policy == "REQUIRED" && !note) {
        throw ApplicationError(400, "NOTE_REQUIRED", "此分类需要填写备注");
    }
    if (category.note_policy == "FORBIDDEN") return std::nullopt;
    if (note && utf8Length(*note) > 500) {
        throw ApplicationError(400, "VALIDATION_ERROR", "备注不能超过 500 个字符");
    }
    return note;
}

std::vector<Alert> FinanceService::evaluateAlerts(const std::string& date, const Expense& expense,
                                                  MoneyCents total_cents, MoneyCents budget_cents) {
    std::vector<Alert> alerts;
    const std::string timestamp = nowLocal();
    for (const auto& rule : repository_.activeAlertRules()) {
        const AlertState state = repository_.alertState(date, rule.id);
        const bool reached = reachedThreshold(total_cents, budget_cents, rule.threshold_percent);
        const bool crossed_now = reached && (!state.exists || !state.triggered);
        repository_.saveAlertState(date, rule, reached, total_cents, expense.id,
                                   reached ? std::optional<std::string>{timestamp} : std::nullopt,
                                   timestamp);
        if (!crossed_now) continue;

        repository_.insertAlertEvent(date, rule, expense.id, total_cents, budget_cents, timestamp);
        alerts.push_back(Alert{
            .code = rule.code,
            .severity = rule.severity,
            .threshold_percent = rule.threshold_percent,
            .message_key = rule.message_key,
            .total_amount_cents = total_cents,
            .budget_amount_cents = budget_cents,
        });
    }
    return alerts;
}

ExpenseMutationResult FinanceService::responseFor(const Expense& expense, std::vector<Alert> alerts) {
    const MoneyCents total = repository_.sumExpensesForDate(expense.expense_date);
    const MoneyCents budget = repository_.budgetForDate(expense.expense_date).value_or(0);
    return ExpenseMutationResult{
        .expense = expense,
        .total_amount_cents = total,
        .budget_amount_cents = budget,
        .remaining_amount_cents = std::max<MoneyCents>(0, budget - total),
        .usage_percent = usagePercent(total, budget),
        .alerts = std::move(alerts),
    };
}

}  // namespace mogo::personal_finance
