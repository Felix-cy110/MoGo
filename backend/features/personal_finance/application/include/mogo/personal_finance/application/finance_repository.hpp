#pragma once

#include "mogo/personal_finance/domain/models.hpp"

#include <optional>
#include <string>
#include <vector>

namespace mogo::personal_finance {

class FinanceTransactionRepository {
public:
    virtual ~FinanceTransactionRepository() = default;
    virtual void migrateAndSeed() = 0;
    virtual void beginTransaction() = 0;
    virtual void commitTransaction() = 0;
    virtual void rollbackTransaction() noexcept = 0;
};

class CategoryRepository {
public:
    virtual ~CategoryRepository() = default;
    virtual std::vector<Category> categories() = 0;
    virtual std::vector<Category> searchCategories(const std::string& query) = 0;
    virtual std::optional<Category> categoryById(std::int64_t id) = 0;
    virtual std::optional<Category> categoryByIdIncludingInactive(std::int64_t id) = 0;
    virtual bool categoryNameExists(const std::string& name,
                                    std::optional<std::int64_t> excluding_id = std::nullopt) = 0;
    virtual int maxCategorySortOrder() = 0;
    virtual Category insertCategory(const Category& category) = 0;
    virtual Category updateCategory(std::int64_t id, const std::string& name) = 0;
    virtual Category deactivateCategory(std::int64_t id) = 0;
};

class BudgetRepository {
public:
    virtual ~BudgetRepository() = default;
    virtual std::optional<MoneyCents> budgetForDate(const std::string& date) = 0;
    virtual void saveBudget(const std::string& date, MoneyCents amount_cents) = 0;
};

class ExpenseRepository {
public:
    virtual ~ExpenseRepository() = default;
    virtual std::vector<Expense> expensesForDate(const std::string& date) = 0;
    virtual MoneyCents sumExpensesForDate(const std::string& date) = 0;
    virtual std::optional<Expense> expenseById(std::int64_t id) = 0;
    virtual std::optional<Expense> expenseByClientRequestId(const std::string& request_id) = 0;
    virtual Expense insertExpense(const std::string& date, MoneyCents amount_cents,
                                  const Category& category, const std::optional<std::string>& note,
                                  const std::optional<std::string>& client_request_id,
                                  const std::string& occurred_at) = 0;
    virtual Expense updateExpense(std::int64_t expense_id, MoneyCents amount_cents,
                                  const Category& category, const std::optional<std::string>& note) = 0;
};

class AlertRepository {
public:
    virtual ~AlertRepository() = default;
    virtual std::vector<AlertRule> activeAlertRules() = 0;
    virtual AlertState alertState(const std::string& date, std::int64_t rule_id) = 0;
    virtual void saveAlertState(const std::string& date, const AlertRule& rule, bool triggered,
                                MoneyCents total_cents, std::int64_t expense_id,
                                const std::optional<std::string>& triggered_at,
                                const std::string& updated_at) = 0;
    virtual void insertAlertEvent(const std::string& date, const AlertRule& rule,
                                  std::int64_t expense_id, MoneyCents total_cents,
                                  MoneyCents budget_cents, const std::string& created_at) = 0;
};

class FinanceReadRepository {
public:
    virtual ~FinanceReadRepository() = default;
    virtual AnalyticsDashboard analyticsForRange(const std::string& start_date,
                                                 const std::string& end_date) = 0;
};

// Composition interface used by the current SQLite adapter and application facade.
class FinanceRepository : public FinanceTransactionRepository,
                          public CategoryRepository,
                          public BudgetRepository,
                          public ExpenseRepository,
                          public AlertRepository,
                          public FinanceReadRepository {
public:
    ~FinanceRepository() override = default;
};

}  // namespace mogo::personal_finance
