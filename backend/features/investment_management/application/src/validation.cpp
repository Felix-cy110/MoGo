#include "validation.hpp"
#include "mogo/core_shared/error.hpp"
#include <algorithm>
#include <chrono>
#include <cctype>
#include <ctime>
#include <iomanip>
#include <regex>
#include <sstream>
namespace mogo::investment {
namespace {
using core_shared::ApplicationError;
std::string trim(const std::string& value) {
    const auto start = value.find_first_not_of(" \t\r\n");
    if (start == std::string::npos) return "";
    return value.substr(start, value.find_last_not_of(" \t\r\n") - start + 1);
}
void text(std::string& value, std::size_t max_bytes, bool required) {
    value = trim(value);
    if ((required && value.empty()) || value.size() > max_bytes ||
        std::any_of(value.begin(), value.end(), [](unsigned char c) { return c < 32 || c == 127; }))
        throw ApplicationError(400, "INVESTMENT_TEXT_INVALID", "Invalid text");
}
}
std::string nowUtc() {
    const auto now = std::chrono::system_clock::now();
    const auto time = std::chrono::system_clock::to_time_t(now);
    std::tm utc{};
#if defined(_WIN32)
    gmtime_s(&utc, &time);
#else
    gmtime_r(&time, &utc);
#endif
    std::ostringstream out;
    out << std::put_time(&utc, "%Y-%m-%dT%H:%M:%S") << ".000Z";
    return out.str();
}
void validateTarget(Target& value) {
    text(value.name, 240, true); text(value.symbol, 20, true); text(value.note, 1500, false);
    std::transform(value.symbol.begin(), value.symbol.end(), value.symbol.begin(), [](unsigned char c) { return std::toupper(c); });
    static const std::regex symbol("^[A-Z0-9][A-Z0-9._-]{0,19}$");
    if (!std::regex_match(value.symbol, symbol) || value.quote_currency != "USDT")
        throw ApplicationError(400, "INVESTMENT_SYMBOL_INVALID", "Invalid symbol or quote currency");
}
void validateTrade(Trade& value, bool creating) {
    value.unit_price = normalizePositiveDecimal(trim(value.unit_price));
    value.quote_amount = normalizePositiveDecimal(trim(value.quote_amount));
    text(value.note, 1500, false);
    static const std::regex timestamp(R"(^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$)");
    std::smatch match;
    bool valid = std::regex_match(value.occurred_at, match, timestamp);
    if (valid) {
        const int year = std::stoi(match[1]);
        const std::chrono::year_month_day date{std::chrono::year{year}, std::chrono::month{static_cast<unsigned>(std::stoi(match[2]))}, std::chrono::day{static_cast<unsigned>(std::stoi(match[3]))}};
        valid = year >= 1 && date.ok() && std::stoi(match[4]) < 24 && std::stoi(match[5]) < 60 && std::stoi(match[6]) < 60;
    }
    if (!valid) throw ApplicationError(400, "INVESTMENT_DATE_INVALID", "Expected a valid UTC timestamp");
    static const std::regex request_id("^[A-Za-z0-9_-]{8,80}$");
    if (value.side != "BUY" || (creating && !std::regex_match(value.client_request_id, request_id)))
        throw ApplicationError(400, "VALIDATION_ERROR", "Invalid buy request");
}
}
