#include "mogo/investment/sqlite/sqlite_repository.hpp"
#include "mogo/investment/application/investment_service.hpp"
#include "mogo/core_shared/error.hpp"
#include <chrono>
#include <filesystem>
#include <iostream>
#include <future>
#include <stdexcept>
using namespace mogo::investment;
void check(bool value, const char* message) { if (!value) throw std::runtime_error(message); }
template<class Action> void rejects(Action action, const char* code) {
    try { action(); } catch (const mogo::core_shared::ApplicationError& e) { check(e.code() == code, "Unexpected error code"); return; }
    throw std::runtime_error("Expected rejection");
}
Trade buy(std::int64_t target, const std::string& price, const std::string& amount, const std::string& request) {
    Trade v; v.target_id = target; v.unit_price = price; v.quote_amount = amount;
    v.occurred_at = "2026-11-24T03:04:05.000Z"; v.client_request_id = request;
    return v;
}
struct TemporaryData {
    std::filesystem::path path = std::filesystem::temp_directory_path() / ("mogo-investment-" + std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()) + ".db");
    ~TemporaryData() { std::error_code e; std::filesystem::remove(path, e); }
};
int main() {
    try {
        check(normalizePositiveDecimal("000060.50000") == "60.5", "Canonical decimal");
        for (const auto* bad : {"0", "-1", "NaN", "Infinity", "1e3", "1.", ".5", "1000000000000000000", "0.0000000000000000001"})
            rejects([&] { normalizePositiveDecimal(bad); }, "INVESTMENT_DECIMAL_INVALID");
        auto summary = calculateSummary({buy(1,"60000","600","request-1"),buy(1,"66000","1320","request-2")});
        check(summary.total_quote_amount == "1920" && summary.total_quantity == "0.03" && summary.average_entry_price == "64000", "USDT-weighted entry price");
        check(calculateSummary({buy(1,"10","100","request-1"),buy(1,"20","100","request-2")}).average_entry_price == "13.333333333333333333", "Do not average prices or weight by USDT");
        check(calculateSummary({buy(1,"3","1","request-1"),buy(1,"6","2","request-2")}).average_entry_price == "4.5", "Exact repeating quantities");
        check(calculateSummary({buy(1,"999999999999999999","0.000000000000000001","request-1")}).average_entry_price == "999999999999999999", "No display quantity in average calculation");
        check(calculateSummary({buy(1,"0.000000000000000001","999999999999999999","request-1")}).total_quantity == "999999999999999999000000000000000000", "Large exact quantities");
        check(calculateSummary({}).average_entry_price == std::nullopt, "Empty average is null");
        TemporaryData file;
        std::int64_t id{}, first_id{};
        {
            mogo::core_shared::SqliteDatabase prior(file.path.string());
            prior.execute("CREATE TABLE legacy_data(value TEXT); INSERT INTO legacy_data VALUES('keep');");
            SqliteInvestmentRepository repo(file.path.string()); InvestmentService service(repo);
            Target target; target.name = " 比特币 "; target.symbol = "btc";
            target = service.saveTarget(target); id = target.id;
            check(target.name == "比特币" && target.symbol == "BTC", "Normalized target");
            Target duplicate = target; duplicate.id = 0;
            rejects([&] { service.saveTarget(duplicate); }, "INVESTMENT_TARGET_EXISTS");
            auto first = service.addTrade(buy(id,"60000","600","request-1")); first_id = first.id;
            check(service.addTrade(buy(id,"60000.0","600.00","request-1")).id == first_id, "Idempotent normalized retry");
            rejects([&] { service.addTrade(buy(id,"60000","601","request-1")); }, "INVESTMENT_REQUEST_CONFLICT");
            auto second = service.addTrade(buy(id,"66000","1320","request-2"));
            check(service.detail(id).summary.average_entry_price == "64000", "Persisted summary");
            auto changed_symbol = target; changed_symbol.symbol = "ETH";
            rejects([&] { service.saveTarget(changed_symbol); }, "INVESTMENT_SYMBOL_LOCKED");
            auto wrong_date = buy(id,"1","1","request-date"); wrong_date.occurred_at = "2026-02-30T12:00:00.000Z";
            rejects([&] { service.addTrade(wrong_date); }, "INVESTMENT_DATE_INVALID");
            auto sell = buy(id,"1","1","request-sell"); sell.side = "SELL";
            rejects([&] { service.addTrade(sell); }, "VALIDATION_ERROR");
            rejects([&] { service.addTrade(buy(id + 99,"1","1","request-missing")); }, "INVESTMENT_TARGET_NOT_FOUND");
            service.updateTrade(second.id, buy(id,"60000","1200","unused-key"));
            check(service.detail(id).summary.average_entry_price == "60000", "Edit recalculates");
            service.deleteTrade(second.id);
            check(service.detail(id).summary.total_quote_amount == "600", "Delete excludes cost and quantity");
            rejects([&] { service.addTrade(buy(id,"66000","1320","request-2")); }, "INVESTMENT_REQUEST_CONFLICT");
            prior.execute("UPDATE investment_targets SET archived_at='legacy' WHERE id=" + std::to_string(id));
            check(service.list().size() == 3, "All legacy archived targets remain listed");
            target.note = "Updated legacy note";
            check(service.saveTarget(target).note == target.note, "Legacy targets remain editable");
            const auto legacy_buy = service.addTrade(buy(id,"10","20","request-legacy"));
            service.updateTrade(legacy_buy.id, buy(id,"10","30","unused-key"));
            check(service.detail(id).summary.total_quote_amount == "630", "Legacy targets accept and edit buys");
            service.deleteTrade(legacy_buy.id);
            Target replacement; replacement.name = target.name; replacement.symbol = "BTC";
            rejects([&] { service.saveTarget(replacement); }, "INVESTMENT_TARGET_EXISTS");
            bool restricted = false;
            try { prior.execute("PRAGMA foreign_keys=ON; DELETE FROM investment_targets WHERE id=" + std::to_string(id)); }
            catch (const std::exception&) { restricted = true; }
            check(restricted, "Foreign key restricts target deletion");
            sqlite3_stmt* statement{};
            sqlite3_prepare_v2(prior.handle(), "SELECT value FROM legacy_data", -1, &statement, nullptr);
            check(sqlite3_step(statement) == SQLITE_ROW, "Existing database preserved"); sqlite3_finalize(statement);
        }
        {
            SqliteInvestmentRepository repo(file.path.string()); InvestmentService service(repo);
            check(service.detail(id).summary.total_quote_amount == "600", "Reopen database");
            service.deleteTrade(first_id);
            check(!service.detail(id).summary.average_entry_price && service.detail(id).symbol_locked, "All records deleted: empty summary but immutable symbol");
            check(repo.trades(id, true).size() == 3, "Soft delete retains history");
            auto target = service.detail(id).target; target.symbol = "ETH";
            rejects([&] { service.saveTarget(target); }, "INVESTMENT_SYMBOL_LOCKED");
        }
        {
            TemporaryData concurrent_file;
            SqliteInvestmentRepository repo1(concurrent_file.path.string()), repo2(concurrent_file.path.string());
            InvestmentService first(repo1), second(repo2);
            Target value; value.name = "Concurrent"; value.symbol = "BTC";
            value = first.saveTarget(value);
            const auto input = buy(value.id, "60000", "600", "concurrent-request");
            auto a = std::async(std::launch::async, [&] { return first.addTrade(input); });
            auto b = std::async(std::launch::async, [&] { return second.addTrade(input); });
            check(a.get().id == b.get().id && first.detail(value.id).summary.buy_count == 1, "Cross-connection idempotent transaction");
        }
        std::cout << "Investment precision, persistence and lifecycle tests passed\n";
    } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
