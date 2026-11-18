#include "mogo/personal_finance/application/finance_service.hpp"

namespace mogo::personal_finance {

FinanceService::FinanceService(FinanceRepository& repository)
    : repository_(repository),
      category_service_(repository, repository),
      budget_service_(repository, repository),
      alert_service_(repository),
      query_service_(repository, repository, repository),
      expense_service_(repository, repository, repository, category_service_, alert_service_) {
    repository_.migrateAndSeed();
}

std::vector<Category> FinanceService::getCategories() {
    std::scoped_lock lock(mutex_);
    return category_service_.getCategories();
}

std::vector<Category> FinanceService::searchCategories(const std::string& query) {
    std::scoped_lock lock(mutex_);
    return category_service_.searchCategories(query);
}

Category FinanceService::addCategory(const CategoryInput& input) {
    std::scoped_lock lock(mutex_);
    return category_service_.addCategory(input);
}

Category FinanceService::updateCategory(std::int64_t category_id, const CategoryInput& input) {
    std::scoped_lock lock(mutex_);
    return category_service_.updateCategory(category_id, input);
}

Category FinanceService::deleteCategory(std::int64_t category_id) {
    std::scoped_lock lock(mutex_);
    return category_service_.deleteCategory(category_id);
}

Dashboard FinanceService::getDashboard(const std::string& date) {
    std::scoped_lock lock(mutex_);
    return query_service_.getDashboard(date);
}

AnalyticsDashboard FinanceService::getAnalytics(const std::string& start_date,
                                                 const std::string& end_date) {
    std::scoped_lock lock(mutex_);
    return query_service_.getAnalytics(start_date, end_date);
}

BudgetInput FinanceService::saveBudget(const BudgetInput& input) {
    std::scoped_lock lock(mutex_);
    return budget_service_.saveBudget(input);
}

ExpenseMutationResult FinanceService::addExpense(const ExpenseInput& input) {
    std::scoped_lock lock(mutex_);
    return expense_service_.addExpense(input);
}

ExpenseMutationResult FinanceService::updateExpense(std::int64_t expense_id,
                                                     const ExpenseUpdateInput& input) {
    std::scoped_lock lock(mutex_);
    return expense_service_.updateExpense(expense_id, input);
}

}  // namespace mogo::personal_finance
