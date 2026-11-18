#include "mogo/personal_finance/application/application_support.hpp"

#include "mogo/core_shared/error.hpp"

#include <algorithm>
#include <chrono>
#include <cctype>
#include <ctime>
#include <iomanip>
#include <regex>
#include <sstream>

namespace mogo::personal_finance {

using mogo::core_shared::ApplicationError;

FinanceTransaction::FinanceTransaction(FinanceTransactionRepository& repository)
    : repository_(repository) {
    repository_.beginTransaction();
}

FinanceTransaction::~FinanceTransaction() {
    if (!committed_) repository_.rollbackTransaction();
}

void FinanceTransaction::commit() {
    repository_.commitTransaction();
    committed_ = true;
}

std::string trimText(std::string value) {
    const auto not_space = [](unsigned char ch) { return !std::isspace(ch); };
    value.erase(value.begin(), std::find_if(value.begin(), value.end(), not_space));
    value.erase(std::find_if(value.rbegin(), value.rend(), not_space).base(), value.end());
    return value;
}

std::size_t utf8Length(const std::string& value) {
    return static_cast<std::size_t>(std::count_if(value.begin(), value.end(), [](unsigned char ch) {
        return (ch & 0xC0U) != 0x80U;
    }));
}

void validateDate(const std::string& date) {
    static const std::regex format(R"(^\d{4}-\d{2}-\d{2}$)");
    if (!std::regex_match(date, format)) {
        throw ApplicationError(400, "VALIDATION_ERROR", "日期格式必须为 YYYY-MM-DD");
    }

    const int year = std::stoi(date.substr(0, 4));
    const unsigned month = static_cast<unsigned>(std::stoi(date.substr(5, 2)));
    const unsigned day = static_cast<unsigned>(std::stoi(date.substr(8, 2)));
    if (!std::chrono::year_month_day{std::chrono::year{year}, std::chrono::month{month},
                                     std::chrono::day{day}}.ok()) {
        throw ApplicationError(400, "VALIDATION_ERROR", "日期无效");
    }
}

std::string nowLocal() {
    const auto now = std::chrono::system_clock::now();
    const std::time_t time = std::chrono::system_clock::to_time_t(now);
    std::tm local{};
#if defined(_WIN32)
    localtime_s(&local, &time);
#else
    localtime_r(&time, &local);
#endif
    std::ostringstream output;
    output << std::put_time(&local, "%Y-%m-%dT%H:%M:%S");
    return output.str();
}

}  // namespace mogo::personal_finance
