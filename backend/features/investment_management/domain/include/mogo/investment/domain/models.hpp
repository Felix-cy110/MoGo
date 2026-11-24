#pragma once
#include <cstdint>
#include <optional>
#include <string>
#include <vector>
namespace mogo::investment {
struct Target {
    std::int64_t id{};
    std::string name, symbol, quote_currency = "USDT", note;
    std::optional<std::string> archived_at;
    std::string created_at, updated_at;
    std::optional<std::string> builtin_code;
};
struct Trade {
    std::int64_t id{}, target_id{};
    std::string side = "BUY", unit_price, quote_amount, occurred_at, note, client_request_id;
    std::string created_at, updated_at;
    std::optional<std::string> deleted_at;
};
struct Summary {
    std::string total_quote_amount = "0", total_quantity = "0";
    std::optional<std::string> average_entry_price;
    std::size_t buy_count{};
};
struct TargetView { Target target; Summary summary; };
struct Detail { Target target; Summary summary; std::vector<Trade> trades; bool symbol_locked{}; };
Summary calculateSummary(const std::vector<Trade>& trades);
std::string calculateQuantity(const Trade& trade);
std::string normalizePositiveDecimal(const std::string& value);
}
