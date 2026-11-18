#pragma once

#include "mogo/personal_finance/application/alert_service.hpp"
#include "mogo/personal_finance/application/category_service.hpp"
#include "mogo/personal_finance/application/finance_inputs.hpp"

namespace mogo::personal_finance {

class ExpenseService final {
public:
    ExpenseService(ExpenseRepository& expenses, BudgetRepository& budgets,
                   FinanceTransactionRepository& transactions, CategoryService& categories,
                   AlertService& alerts)
        : expenses_(expenses), budgets_(budgets), transactions_(transactions),
          categories_(categories), alerts_(alerts) {}

    ExpenseMutationResult addExpense(const ExpenseInput& input);
    ExpenseMutationResult updateExpense(std::int64_t expense_id, const ExpenseUpdateInput& input);

private:
    std::optional<std::string> normalizeNote(const Category& category,
                                             const std::optional<std::string>& raw_note);
    ExpenseMutationResult responseFor(const Expense& expense, std::vector<Alert> alerts);

    ExpenseRepository& expenses_;
    BudgetRepository& budgets_;
    FinanceTransactionRepository& transactions_;
    CategoryService& categories_;
    AlertService& alerts_;
};

}  // namespace mogo::personal_finance
