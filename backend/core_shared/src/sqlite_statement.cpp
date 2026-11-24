#include "mogo/core_shared/sqlite_statement.hpp"
#include <stdexcept>
namespace mogo::core_shared {
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

}
