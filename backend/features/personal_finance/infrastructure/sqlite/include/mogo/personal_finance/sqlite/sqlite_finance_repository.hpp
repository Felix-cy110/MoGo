#pragma once

#include "mogo/personal_finance/application/finance_repository.hpp"
#include "mogo/personal_finance/sqlite/sqlite_database.hpp"

#include <string>

namespace mogo::personal_finance {

class SqliteFinanceRepository final : public FinanceRepository {
public:
    explicit SqliteFinanceRepository(const std::string& database_path);

    void migrateAndSeed() override;
    void beginTransaction() override;
    void commitTransaction() override;
    void rollbackTransaction() noexcept override;

    std::vector<Category> categories() override;
    std::optional<Category> categoryById(std::int64_t id) override;
    bool categoryNameExists(const std::string& name) override;
    int maxCategorySortOrder() override;
    Category insertCategory(const Category& category) override;

    std::optional<MoneyCents> budgetForDate(const std::string& date) override;
    void saveBudget(const std::string& date, MoneyCents amount_cents) override;

    std::vector<Expense> expensesForDate(const std::string& date) override;
    MoneyCents sumExpensesForDate(const std::string& date) override;
    std::optional<Expense> expenseById(std::int64_t id) override;
    std::optional<Expense> expenseByClientRequestId(const std::string& request_id) override;
    Expense insertExpense(const std::string& date, MoneyCents amount_cents,
                          const Category& category, const std::optional<std::string>& note,
                          const std::optional<std::string>& client_request_id,
                          const std::string& occurred_at) override;
    Expense updateExpense(std::int64_t expense_id, MoneyCents amount_cents,
                          const Category& category, const std::optional<std::string>& note) override;

    std::vector<AlertRule> activeAlertRules() override;
    AlertState alertState(const std::string& date, std::int64_t rule_id) override;
    void saveAlertState(const std::string& date, const AlertRule& rule, bool triggered,
                        MoneyCents total_cents, std::int64_t expense_id,
                        const std::optional<std::string>& triggered_at,
                        const std::string& updated_at) override;
    void insertAlertEvent(const std::string& date, const AlertRule& rule,
                          std::int64_t expense_id, MoneyCents total_cents,
                          MoneyCents budget_cents, const std::string& created_at) override;

private:
    SqliteDatabase database_;
};

}  // namespace mogo::personal_finance
