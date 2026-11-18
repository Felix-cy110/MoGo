#pragma once

#include "mogo/personal_finance/application/alert_service.hpp"
#include "mogo/personal_finance/application/budget_service.hpp"
#include "mogo/personal_finance/application/category_service.hpp"
#include "mogo/personal_finance/application/expense_service.hpp"
#include "mogo/personal_finance/application/finance_query_service.hpp"

#include <mutex>

namespace mogo::personal_finance {

// Stable facade used by HTTP and future native adapters. Domain use cases live in focused services.
class FinanceService final {
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
    FinanceRepository& repository_;
    CategoryService category_service_;
    BudgetService budget_service_;
    AlertService alert_service_;
    FinanceQueryService query_service_;
    ExpenseService expense_service_;
    std::mutex mutex_;
};

}  // namespace mogo::personal_finance
