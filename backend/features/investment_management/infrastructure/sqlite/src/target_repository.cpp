#include "mogo/investment/sqlite/sqlite_repository.hpp"
#include "mogo/core_shared/sqlite_statement.hpp"
namespace mogo::investment {
namespace {
using core_shared::Statement;
const std::string selectTarget = "SELECT id, name, symbol, quote_currency, note, archived_at, created_at, updated_at FROM investment_targets";
Target read(const Statement& s) {
    return {s.integer(0), s.text(1), s.text(2), s.text(3), s.text(4), s.optionalText(5), s.text(6), s.text(7)};
}
}
std::vector<Target> SqliteInvestmentRepository::targets(bool archived) {
    Statement query(database_.handle(), selectTarget + (archived ? " WHERE archived_at IS NOT NULL" : " WHERE archived_at IS NULL") + " ORDER BY id DESC");
    std::vector<Target> result;
    while (query.row()) result.push_back(read(query));
    return result;
}
std::optional<Target> SqliteInvestmentRepository::target(std::int64_t id) {
    Statement query(database_.handle(), selectTarget + " WHERE id = ?");
    query.bind(1, id);
    return query.row() ? std::optional{read(query)} : std::nullopt;
}
bool SqliteInvestmentRepository::nameExists(const std::string& name, std::int64_t except_id) {
    Statement query(database_.handle(), "SELECT id FROM investment_targets WHERE name = ? COLLATE NOCASE AND quote_currency = 'USDT' AND archived_at IS NULL AND id <> ?");
    query.bind(1, name); query.bind(2, except_id);
    return query.row();
}
Target SqliteInvestmentRepository::saveTarget(const Target& value) {
    const auto sql = value.id
        ? "UPDATE investment_targets SET name=?, symbol=?, quote_currency=?, note=?, archived_at=?, created_at=?, updated_at=? WHERE id=?"
        : "INSERT INTO investment_targets(name,symbol,quote_currency,note,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?)";
    Statement statement(database_.handle(), sql);
    statement.bind(1, value.name); statement.bind(2, value.symbol); statement.bind(3, value.quote_currency); statement.bind(4, value.note);
    if (value.archived_at) statement.bind(5, *value.archived_at); else statement.bindNull(5);
    statement.bind(6, value.created_at); statement.bind(7, value.updated_at);
    if (value.id) statement.bind(8, value.id);
    statement.execute();
    auto result = value;
    if (!result.id) result.id = sqlite3_last_insert_rowid(database_.handle());
    return result;
}
}
