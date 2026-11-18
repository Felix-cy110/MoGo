#include "mogo/personal_finance/application/finance_query_service.hpp"

#include "mogo/personal_finance/application/application_support.hpp"
#include "mogo/core_shared/error.hpp"

#include <algorithm>
#include <map>
#include <numeric>

namespace mogo::personal_finance {

Dashboard FinanceQueryService::getDashboard(const std::string& date) {
    validateDate(date);
    const auto budget = budgets_.budgetForDate(date);
    auto expenses = expenses_.expensesForDate(date);
    const MoneyCents total = std::accumulate(expenses.begin(), expenses.end(), MoneyCents{},
                                             [](MoneyCents sum, const Expense& expense) {
                                                 return sum + expense.amount_cents;
                                             });

    std::map<std::int64_t, CategoryTotal> totals_by_category;
    for (const auto& expense : expenses) {
        auto& category_total = totals_by_category[expense.category_id];
        category_total.category_id = expense.category_id;
        category_total.category_code = expense.category_code;
        category_total.category_name = expense.category_name;
        category_total.amount_cents += expense.amount_cents;
        ++category_total.expense_count;
    }

    std::vector<CategoryTotal> category_totals;
    for (auto& [_, category_total] : totals_by_category) {
        category_totals.push_back(std::move(category_total));
    }
    std::sort(category_totals.begin(), category_totals.end(), [](const auto& left, const auto& right) {
        return left.amount_cents > right.amount_cents;
    });

    const MoneyCents budget_cents = budget.value_or(0);
    const BudgetUsage usage(total, budget_cents);
    return Dashboard{
        .date = date,
        .budget_set = budget.has_value() && budget_cents > 0,
        .budget_amount_cents = budget_cents,
        .total_amount_cents = total,
        .remaining_amount_cents = usage.remainingCents(),
        .usage_percent = usage.percentage(),
        .expense_count = static_cast<int>(expenses.size()),
        .category_totals = std::move(category_totals),
        .expenses = std::move(expenses),
    };
}

AnalyticsDashboard FinanceQueryService::getAnalytics(const std::string& start_date,
                                                      const std::string& end_date) {
    validateDate(start_date);
    validateDate(end_date);
    if (start_date > end_date) {
        throw mogo::core_shared::ApplicationError(400, "VALIDATION_ERROR",
                                                  "统计开始日期不能晚于结束日期");
    }
    return reads_.analyticsForRange(start_date, end_date);
}

}  // namespace mogo::personal_finance
