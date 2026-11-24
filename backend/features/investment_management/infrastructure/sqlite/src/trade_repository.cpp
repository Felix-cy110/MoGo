#include "mogo/investment/sqlite/sqlite_repository.hpp"
#include "mogo/core_shared/sqlite_statement.hpp"
namespace mogo::investment {
namespace {
using core_shared::Statement;
const std::string selectTrade = "SELECT id,target_id,side,unit_price,quote_amount,occurred_at,note,client_request_id,created_at,updated_at,deleted_at FROM investment_trades";
Trade read(const Statement& s) {
    return {s.integer(0), s.integer(1), s.text(2), s.text(3), s.text(4), s.text(5), s.text(6), s.text(7), s.text(8), s.text(9), s.optionalText(10)};
}
}
std::vector<Trade> SqliteInvestmentRepository::trades(std::int64_t target_id, bool include_deleted) {
    Statement query(database_.handle(), selectTrade + " WHERE target_id = ?" + (include_deleted ? "" : " AND deleted_at IS NULL") + " ORDER BY occurred_at DESC, id DESC");
    query.bind(1, target_id);
    std::vector<Trade> result;
    while (query.row()) result.push_back(read(query));
    return result;
}
std::optional<Trade> SqliteInvestmentRepository::trade(std::int64_t id) {
    Statement query(database_.handle(), selectTrade + " WHERE id = ?");
    query.bind(1, id);
    return query.row() ? std::optional{read(query)} : std::nullopt;
}
std::optional<Trade> SqliteInvestmentRepository::request(const std::string& request_id) {
    Statement query(database_.handle(), selectTrade + " WHERE client_request_id = ?");
    query.bind(1, request_id);
    return query.row() ? std::optional{read(query)} : std::nullopt;
}
Trade SqliteInvestmentRepository::saveTrade(const Trade& value) {
    const auto sql = value.id
        ? "UPDATE investment_trades SET target_id=?,side=?,unit_price=?,quote_amount=?,occurred_at=?,note=?,client_request_id=?,created_at=?,updated_at=?,deleted_at=? WHERE id=?"
        : "INSERT INTO investment_trades(target_id,side,unit_price,quote_amount,occurred_at,note,client_request_id,created_at,updated_at,deleted_at) VALUES(?,?,?,?,?,?,?,?,?,?)";
    Statement s(database_.handle(), sql);
    s.bind(1, value.target_id); s.bind(2, value.side); s.bind(3, value.unit_price); s.bind(4, value.quote_amount);
    s.bind(5, value.occurred_at); s.bind(6, value.note); s.bind(7, value.client_request_id);
    s.bind(8, value.created_at); s.bind(9, value.updated_at);
    if (value.deleted_at) s.bind(10, *value.deleted_at); else s.bindNull(10);
    if (value.id) s.bind(11, value.id);
    s.execute();
    auto result = value;
    if (!result.id) result.id = sqlite3_last_insert_rowid(database_.handle());
    return result;
}
}
