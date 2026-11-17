#pragma once

#include "mogo/personal_finance/application/finance_repository.hpp"

#include <cstdint>
#include <mutex>
#include <optional>
#include <string>

namespace mogo::personal_finance {

struct BudgetInput {
    std::string date;
    MoneyCents amount_cents{};
};

struct CategoryInput {
    std::string name;
};

struct ExpenseInput {
    std::string date;
    MoneyCents amount_cents{};
    std::int64_t category_id{};
    std::optional<std::string> note;
    std::optional<std::string> client_request_id;
};

struct ExpenseUpdateInput {
    MoneyCents amount_cents{};
    std::int64_t category_id{};
    std::optional<std::string> note;
};

class FinanceService {
public:
    explicit FinanceService(FinanceRepository& repository);

    std::vector<Category> getCategories();
    std::vector<Category> searchCategories(const std::string& query);
    Category addCategory(const CategoryInput& input);
    Category updateCategory(std::int64_t category_id, const CategoryInput& input);
    Category deleteCategory(std::int64_t category_id);
    Dashboard getDashboard(const std::string& date);
    AnalyticsDashboard getAnalytics(const std::string& start_date, const std::string& end_date);
    BudgetInput saveBudget(const BudgetInput& input);
    ExpenseMutationResult addExpense(const ExpenseInput& input);
    ExpenseMutationResult updateExpense(std::int64_t expense_id, const ExpenseUpdateInput& input);

private:
    std::string validateCategoryName(const std::string& raw_name);
    Category requireActiveCategory(std::int64_t category_id);
    std::optional<std::string> normalizeNote(const Category& category,
                                             const std::optional<std::string>& note);
    std::vector<Alert> evaluateAlerts(const std::string& date, const Expense& expense,
                                      MoneyCents total_cents, MoneyCents budget_cents);
    ExpenseMutationResult responseFor(const Expense& expense, std::vector<Alert> alerts);

    FinanceRepository& repository_;
    std::mutex mutex_;
};

int usagePercent(MoneyCents total_cents, MoneyCents budget_cents);
bool reachedThreshold(MoneyCents total_cents, MoneyCents budget_cents, int threshold_percent);

}  // namespace mogo::personal_finance
