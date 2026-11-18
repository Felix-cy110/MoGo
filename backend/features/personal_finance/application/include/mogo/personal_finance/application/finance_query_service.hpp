#pragma once

#include "mogo/personal_finance/application/finance_repository.hpp"

namespace mogo::personal_finance {

class FinanceQueryService final {
public:
    FinanceQueryService(BudgetRepository& budgets, ExpenseRepository& expenses,
                        FinanceReadRepository& reads)
        : budgets_(budgets), expenses_(expenses), reads_(reads) {}

    Dashboard getDashboard(const std::string& date);
    AnalyticsDashboard getAnalytics(const std::string& start_date, const std::string& end_date);

private:
    BudgetRepository& budgets_;
    ExpenseRepository& expenses_;
    FinanceReadRepository& reads_;
};

}  // namespace mogo::personal_finance
