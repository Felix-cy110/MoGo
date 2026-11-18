#pragma once

#include "mogo/personal_finance/application/finance_inputs.hpp"
#include "mogo/personal_finance/application/finance_repository.hpp"

namespace mogo::personal_finance {

class BudgetService final {
public:
    BudgetService(BudgetRepository& budgets, FinanceTransactionRepository& transactions)
        : budgets_(budgets), transactions_(transactions) {}

    BudgetInput saveBudget(const BudgetInput& input);

private:
    BudgetRepository& budgets_;
    FinanceTransactionRepository& transactions_;
};

}  // namespace mogo::personal_finance
