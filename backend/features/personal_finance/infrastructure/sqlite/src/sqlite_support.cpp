#include "sqlite_support.hpp"

#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <stdexcept>

namespace mogo::personal_finance::sqlite_support {

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

Category readCategory(const Statement& statement) {
    return Category{
        .id = statement.integer(0),
        .code = statement.text(1),
        .name = statement.text(2),
        .i18n_key = statement.optionalText(3),
        .note_policy = statement.text(4),
        .active = statement.intValue(5) != 0,
        .system = statement.intValue(6) != 0,
        .sort_order = statement.intValue(7),
    };
}

Expense readExpense(const Statement& statement) {
    return Expense{
        .id = statement.integer(0),
        .expense_date = statement.text(1),
        .amount_cents = statement.integer(2),
        .category_id = statement.integer(3),
        .category_code = statement.text(4),
        .category_name = statement.text(5),
        .note = statement.optionalText(6),
        .occurred_at = statement.text(7),
    };
}

}  // namespace mogo::personal_finance::sqlite_support
