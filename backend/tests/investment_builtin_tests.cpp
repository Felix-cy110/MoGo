#include "mogo/investment/sqlite/sqlite_repository.hpp"
#include "mogo/investment/application/investment_service.hpp"
#include "mogo/core_shared/error.hpp"
#include "mogo/core_shared/sqlite_statement.hpp"
#include <chrono>
#include <filesystem>
#include <fstream>
#include <future>
#include <iostream>
#include <iterator>
using namespace mogo::investment;
using mogo::core_shared::SqliteDatabase;
using mogo::core_shared::Statement;
namespace {
void check(bool value, const char* message) { if (!value) throw std::runtime_error(message); }
struct TemporaryData {
    std::filesystem::path path = std::filesystem::temp_directory_path() / ("mogo-builtins-" + std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()) + ".db");
    ~TemporaryData() { std::error_code e; std::filesystem::remove(path, e); }
};
std::string auditSql(const char* filename) {
    std::ifstream file(std::filesystem::path(__FILE__).parent_path().parent_path() / "database/migrations" / filename);
    check(file.good(), "Missing audit SQL");
    return {std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>()};
}
Target builtin(InvestmentService& service, const char* code) {
    for (const auto& item : service.list()) if (item.target.builtin_code == code) return item.target;
    throw std::runtime_error("Missing built-in target");
}
template<class Action> void protectedOperation(Action action) {
    try { action(); }
    catch (const mogo::core_shared::ApplicationError& error) {
        check(error.code() == "INVESTMENT_BUILTIN_PROTECTED", "Wrong protection error"); return;
    }
    throw std::runtime_error("Built-in operation was not blocked");
}
void rejectsSql(SqliteDatabase& db, const std::string& sql) {
    try { db.execute(sql); } catch (const std::exception&) { return; }
    throw std::runtime_error("Storage allowed removing a built-in");
}
void freshDatabase() {
    TemporaryData file;
    std::int64_t btc_id{}, eth_id{};
    {
        SqliteInvestmentRepository repo(file.path.string()); InvestmentService service(repo);
        check(service.list().size() == 2, "Exactly two defaults");
        auto btc = builtin(service, "BTC"); auto eth = builtin(service, "ETH");
        btc_id = btc.id; eth_id = eth.id;
        for (auto value : {btc, eth}) {
            check(service.detail(value.id).symbol_locked, "Default symbols locked before trading");
            protectedOperation([&] { service.archiveTarget(value.id, true); });
            value.symbol = "SOL";
            protectedOperation([&] { service.saveTarget(value); });
        }
        btc.name = "My Bitcoin"; btc.note = "Keep my note"; btc.builtin_code.reset();
        btc = service.saveTarget(btc);
        check(btc.builtin_code == "BTC", "Editing cannot clear built-in identity");
        Trade buy; buy.target_id = btc.id; buy.unit_price = "60000"; buy.quote_amount = "600";
        buy.occurred_at = "2026-11-24T00:00:00.000Z"; buy.client_request_id = "builtin-buy";
        buy = service.addTrade(buy);
        check(service.detail(btc.id).summary.average_entry_price == "60000", "Built-in buys use normal calculation");
        service.deleteTrade(buy.id);
        check(service.detail(btc.id).symbol_locked, "Removing trades does not unlock a default");
        Target custom; custom.name = "Solana"; custom.symbol = "SOL"; custom.builtin_code = "BTC";
        custom = service.saveTarget(custom);
        check(!custom.builtin_code, "Clients cannot forge built-in identity");
        service.archiveTarget(custom.id, true);
        SqliteDatabase raw(file.path.string());
        const auto id = std::to_string(eth.id);
        rejectsSql(raw, "DELETE FROM investment_targets WHERE id=" + id);
        rejectsSql(raw, "UPDATE investment_targets SET builtin_code=NULL WHERE id=" + id);
        rejectsSql(raw, "UPDATE investment_targets SET symbol='SOL' WHERE id=" + id);
        rejectsSql(raw, "UPDATE investment_targets SET archived_at='now' WHERE id=" + id);
        rejectsSql(raw, "INSERT OR REPLACE INTO investment_targets(id,name,symbol,created_at,updated_at) VALUES(" + id + ",'replacement','SOL','now','now')");
    }
    SqliteInvestmentRepository reopened(file.path.string()); InvestmentService service(reopened);
    check(service.list().size() == 2 && service.list(true).size() == 1, "Reopen never duplicates defaults");
    const auto btc = builtin(service, "BTC");
    check(btc.id == btc_id && builtin(service, "ETH").id == eth_id, "Stable default IDs");
    check(btc.name == "My Bitcoin" && btc.note == "Keep my note", "Reopen preserves edited name and note");
}
void migrateExisting(bool use_audit) {
    TemporaryData file;
    {
        SqliteDatabase old(file.path.string()); old.execute(auditSql("V002__investment_management_initial.sql"));
        old.execute(R"SQL(
INSERT INTO investment_targets(id,name,symbol,note,archived_at,created_at,updated_at) VALUES
(42,'我的比特币','BTC','retain',NULL,'old','old'),
(43,'以太坊','ETH','archived note','old','old','old'),
(44,'BTC savings','BTC','separate',NULL,'old','old');
INSERT INTO investment_trades(id,target_id,unit_price,quote_amount,occurred_at,client_request_id,created_at,updated_at)
VALUES(200,42,'60000','600','2026-11-24T00:00:00.000Z','legacy-buy','old','old');
)SQL");
        if (use_audit) old.execute(auditSql("V003__investment_builtin_targets.sql"));
    }
    SqliteInvestmentRepository repo(file.path.string()); InvestmentService service(repo);
    check(builtin(service, "BTC").id == 42 && builtin(service, "ETH").id == 43, "Reuse existing active and safely restorable targets");
    check(service.detail(42).summary.average_entry_price == "60000", "Historical buy and average preserved");
    check(service.detail(42).target.note == "retain" && service.detail(42).target.name == "我的比特币", "Custom fields preserved");
    check(service.detail(43).target.note == "archived note" && !service.detail(43).target.archived_at, "Restore an archived default");
    check(!service.detail(44).target.builtin_code && service.list().size() == 3, "Do not merge duplicate coin histories");
}
void migrateNameConflicts() {
    TemporaryData file;
    {
        SqliteDatabase old(file.path.string()); old.execute(auditSql("V002__investment_management_initial.sql"));
        old.execute(R"SQL(
INSERT INTO investment_targets(id,name,symbol,archived_at,created_at,updated_at) VALUES
(1,'btc','SOL',NULL,'old','old'), (2,'BTC (1)','SOL',NULL,'old','old'),
(3,'ETH','DOGE',NULL,'old','old'), (4,'ETH','ETH','old','old','old'),
(5,'btc','BTC','old','old','old');
)SQL");
    }
    SqliteInvestmentRepository repo(file.path.string()); InvestmentService service(repo);
    check(builtin(service, "BTC").name == "BTC (2)" && builtin(service, "ETH").name == "ETH (1)", "Default names avoid active case-insensitive conflicts");
    check(service.detail(1).target.symbol == "SOL" && !service.detail(1).target.builtin_code, "Do not adopt by name");
    check(service.list(true).size() == 2, "Conflicting archived histories remain untouched");
}
void concurrentInitialization() {
    TemporaryData file;
    auto open = [&] { SqliteInvestmentRepository repo(file.path.string()); InvestmentService service(repo); return service.list().size(); };
    auto first = std::async(std::launch::async, open); auto second = std::async(std::launch::async, open);
    check(first.get() == 2 && second.get() == 2, "Concurrent initialization seeds once");
}
}
int main() {
    try {
        freshDatabase(); migrateExisting(false); migrateExisting(true); migrateNameConflicts(); concurrentInitialization();
        std::cout << "Built-in defaults, upgrade compatibility and protection passed\n";
    } catch (const std::exception& error) { std::cerr << error.what() << '\n'; return 1; }
}
