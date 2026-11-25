#include "mogo/native/native_core.hpp"
#include <nlohmann/json.hpp>
#include <chrono>
#include <filesystem>
#include <iostream>
using Json = nlohmann::json;
void check(bool value, const char* message) { if (!value) throw std::runtime_error(message); }
int main() {
    const auto path = std::filesystem::temp_directory_path() / ("mogo-investment-native-" + std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));
    try {
        std::int64_t id{};
        {
            mogo::native::NativeCore core(path);
            auto call = [&](const std::string& method, Json value) { return Json::parse(core.execute("investment." + method, value.dump())); };
            auto defaults = call("listTargets", Json::object());
            check(defaults.at("data").size() == 2, "Native initialization includes BTC and ETH");
            for (const auto& item : defaults.at("data")) {
                const auto target = item.at("target");
                check(target.at("builtinCode") == target.at("symbol"), "Native returns stable builtinCode");
                check(!target.contains("archivedAt"), "Native targets have no archive lifecycle");
                check(call("getTarget", {{"id",target.at("id")}}).at("data").at("symbolLocked") == true, "Native builtin symbol locked");
                check(call("updateTarget", {{"id",target.at("id")},{"name","renamed"},{"symbol","SOL"}}).at("code") == "INVESTMENT_BUILTIN_PROTECTED", "Native cannot replace defaults");
            }
            auto result = call("addTarget", {{"name","Bitcoin"},{"symbol","BTC"}});
            check(result.at("ok") == true, "Native target"); id = result.at("data").at("id");
            Json buy = {{"targetId",id},{"unitPrice","60000"},{"quoteAmount","600"},{"occurredAt","2026-11-24T01:02:03.000Z"},{"clientRequestId","native-buy-1"}};
            auto trade = call("addTrade", buy); check(trade.at("ok") == true, "Native buy");
            check(trade.at("data").at("quantity") == "0.01", "Quantity stays a string");
            buy["unitPrice"] = 60000;
            check(call("addTrade", buy).at("code") == "VALIDATION_ERROR", "Reject JSON numbers");
            check(call("getTarget", {{"id", id}}).at("data").at("summary").at("averageEntryPrice") == "60000", "Native summary");
            check(call("getTarget", {{"id", 1.5}}).at("code") == "VALIDATION_ERROR", "Reject fractional IDs");
            check(call("listTargets", Json::object()).at("data").size() == 3, "Native list includes the two built-ins");
        }
        {
            mogo::native::NativeCore core(path);
            const auto result = Json::parse(core.execute("investment.getTarget", Json{{"id",id}}.dump()));
            check(result.at("data").at("summary").at("totalQuoteAmount") == "600", "Native persistence");
        }
        std::filesystem::remove_all(path);
        std::cout << "Investment native contracts passed\n";
    } catch (const std::exception& e) { std::filesystem::remove_all(path); std::cerr << e.what() << '\n'; return 1; }
}
