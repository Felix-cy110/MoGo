#pragma once

#include "mogo/personal_finance/domain/models.hpp"

#include <optional>
#include <string>
#include <vector>

namespace mogo::personal_finance {

class FinanceRepository {
public:
    virtual ~FinanceRepository() = default;

    virtual void migrateAndSeed() = 0;
    virtual void beginTransaction() = 0;
    virtual void commitTransaction() = 0;
    virtual void rollbackTransaction() noexcept = 0;

    virtual std::vector<Category> categories() = 0;
    virtual std::optional<Category> categoryById(std::int64_t id) = 0;
    virtual bool categoryNameExists(const std::string& name) = 0;
    virtual int maxCategorySortOrder() = 0;
    virtual Category insertCategory(const Category& category) = 0;

    virtual std::optional<MoneyCents> budgetForDate(const std::string& date) = 0;
    virtual void saveBudget(const std::string& date, MoneyCents amount_cents) = 0;

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

}  // namespace mogo::personal_finance
