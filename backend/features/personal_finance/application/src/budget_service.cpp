#include "mogo/personal_finance/application/budget_service.hpp"

#include "mogo/personal_finance/application/application_support.hpp"
#include "mogo/core_shared/error.hpp"

namespace mogo::personal_finance {

BudgetInput BudgetService::saveBudget(const BudgetInput& input) {
    validateDate(input.date);
    if (input.amount_cents <= 0) {
        throw mogo::core_shared::ApplicationError(400, "VALIDATION_ERROR", "预算金额必须大于零");
    }
    FinanceTransaction transaction(transactions_);
    budgets_.saveBudget(input.date, input.amount_cents);
    transaction.commit();
    return input;
}

}  // namespace mogo::personal_finance
