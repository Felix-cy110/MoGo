#include "sqlite_support.hpp"

#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <stdexcept>

namespace mogo::personal_finance::sqlite_support {

Statement::Statement(sqlite3* database, std::string_view sql) : database_(database) {
    if (sqlite3_prepare_v2(database, sql.data(), static_cast<int>(sql.size()), &statement_, nullptr) !=
        SQLITE_OK) {
        throw std::runtime_error("SQLite prepare failed: " + std::string(sqlite3_errmsg(database)));
    }
}

Statement::~Statement() { sqlite3_finalize(statement_); }

void Statement::bind(int index, const std::string& value) {
    check(sqlite3_bind_text(statement_, index, value.c_str(), -1, SQLITE_TRANSIENT));
}
void Statement::bind(int index, std::int64_t value) {
    check(sqlite3_bind_int64(statement_, index, value));
}
void Statement::bind(int index, int value) { check(sqlite3_bind_int(statement_, index, value)); }
void Statement::bindNull(int index) { check(sqlite3_bind_null(statement_, index)); }

bool Statement::row() {
    const int result = sqlite3_step(statement_);
    if (result == SQLITE_ROW) return true;
    if (result == SQLITE_DONE) return false;
    throw std::runtime_error("SQLite step failed: " + std::string(sqlite3_errmsg(database_)));
}

void Statement::execute() {
    if (row()) throw std::runtime_error("SQLite statement unexpectedly returned a row");
}

std::int64_t Statement::integer(int column) const { return sqlite3_column_int64(statement_, column); }
int Statement::intValue(int column) const { return sqlite3_column_int(statement_, column); }
std::string Statement::text(int column) const {
    const auto* value = sqlite3_column_text(statement_, column);
    return value ? reinterpret_cast<const char*>(value) : "";
}
std::optional<std::string> Statement::optionalText(int column) const {
    if (sqlite3_column_type(statement_, column) == SQLITE_NULL) return std::nullopt;
    return text(column);
}

void Statement::check(int result) const {
    if (result != SQLITE_OK) {
        throw std::runtime_error("SQLite bind failed: " + std::string(sqlite3_errmsg(database_)));
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
