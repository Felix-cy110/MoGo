#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

#include "sqlite_support.hpp"

#include <stdexcept>

namespace mogo::personal_finance {

using sqlite_support::Statement;
using sqlite_support::expenseSelect;
using sqlite_support::nowLocal;
using sqlite_support::readExpense;

std::vector<Expense> SqliteFinanceRepository::expensesForDate(const std::string& date) {
    Statement query(database_.handle(), std::string(expenseSelect) +
        " WHERE e.expense_date = ? ORDER BY e.occurred_at DESC, e.id DESC");
    query.bind(1, date);
    std::vector<Expense> result;
    while (query.row()) result.push_back(readExpense(query));
    return result;
}

MoneyCents SqliteFinanceRepository::sumExpensesForDate(const std::string& date) {
    Statement query(database_.handle(),
                    "SELECT COALESCE(SUM(amount_cents), 0) FROM expenses WHERE expense_date = ?");
    query.bind(1, date);
    query.row();
    return query.integer(0);
}

std::optional<Expense> SqliteFinanceRepository::expenseById(std::int64_t id) {
    Statement query(database_.handle(), std::string(expenseSelect) + " WHERE e.id = ?");
    query.bind(1, id);
    if (!query.row()) return std::nullopt;
    return readExpense(query);
}

std::optional<Expense> SqliteFinanceRepository::expenseByClientRequestId(const std::string& request_id) {
    Statement query(database_.handle(), std::string(expenseSelect) + " WHERE e.client_request_id = ?");
    query.bind(1, request_id);
    if (!query.row()) return std::nullopt;
    return readExpense(query);
}

Expense SqliteFinanceRepository::insertExpense(
    const std::string& date, MoneyCents amount_cents, const Category& category,
    const std::optional<std::string>& note, const std::optional<std::string>& client_request_id,
    const std::string& occurred_at) {
    const std::string timestamp = nowLocal();
    Statement insert(database_.handle(), R"SQL(
INSERT INTO expenses
    (amount_cents, client_request_id, created_at, expense_date, note, occurred_at, updated_at, category_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
)SQL");
    insert.bind(1, amount_cents);
    client_request_id ? insert.bind(2, *client_request_id) : insert.bindNull(2);
    insert.bind(3, timestamp);
    insert.bind(4, date);
    note ? insert.bind(5, *note) : insert.bindNull(5);
    insert.bind(6, occurred_at);
    insert.bind(7, timestamp);
    insert.bind(8, category.id);
    insert.execute();
    return *expenseById(sqlite3_last_insert_rowid(database_.handle()));
}

Expense SqliteFinanceRepository::updateExpense(std::int64_t expense_id, MoneyCents amount_cents,
                                               const Category& category,
                                               const std::optional<std::string>& note) {
    Statement update(database_.handle(), R"SQL(
UPDATE expenses SET amount_cents = ?, category_id = ?, note = ?, updated_at = ? WHERE id = ?
)SQL");
    update.bind(1, amount_cents);
    update.bind(2, category.id);
    note ? update.bind(3, *note) : update.bindNull(3);
    update.bind(4, nowLocal());
    update.bind(5, expense_id);
    update.execute();
    const auto result = expenseById(expense_id);
    if (!result) throw std::runtime_error("Updated expense disappeared");
    return *result;
}


}  // namespace mogo::personal_finance
