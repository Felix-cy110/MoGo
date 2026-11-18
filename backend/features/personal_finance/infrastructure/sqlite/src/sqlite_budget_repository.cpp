#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

#include "sqlite_support.hpp"

namespace mogo::personal_finance {

using sqlite_support::Statement;
using sqlite_support::nowLocal;

std::optional<MoneyCents> SqliteFinanceRepository::budgetForDate(const std::string& date) {
    Statement query(database_.handle(), "SELECT max_amount_cents FROM daily_budgets WHERE budget_date = ?");
    query.bind(1, date);
    if (!query.row()) return std::nullopt;
    return query.integer(0);
}

void SqliteFinanceRepository::saveBudget(const std::string& date, MoneyCents amount_cents) {
    const std::string timestamp = nowLocal();
    Statement statement(database_.handle(), R"SQL(
INSERT INTO daily_budgets (budget_date, created_at, currency_code, max_amount_cents, updated_at)
VALUES (?, ?, 'CNY', ?, ?)
ON CONFLICT(budget_date) DO UPDATE SET
    max_amount_cents = excluded.max_amount_cents,
    updated_at = excluded.updated_at
)SQL");
    statement.bind(1, date);
    statement.bind(2, timestamp);
    statement.bind(3, amount_cents);
    statement.bind(4, timestamp);
    statement.execute();
}


}  // namespace mogo::personal_finance
