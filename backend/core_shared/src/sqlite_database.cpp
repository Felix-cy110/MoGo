#include "mogo/core_shared/sqlite_database.hpp"

#include <filesystem>
#include <stdexcept>

namespace mogo::core_shared {

SqliteDatabase::SqliteDatabase(const std::string& path) {
    if (path != ":memory:") {
        const std::filesystem::path database_path(path);
        if (database_path.has_parent_path()) {
            std::filesystem::create_directories(database_path.parent_path());
        }
    }

    const int result = sqlite3_open_v2(path.c_str(), &database_,
                                       SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX,
                                       nullptr);
    if (result != SQLITE_OK) {
        const std::string message = database_ ? sqlite3_errmsg(database_) : "unknown SQLite error";
        if (database_) sqlite3_close(database_);
        database_ = nullptr;
        throw std::runtime_error("Unable to open SQLite database: " + message);
    }
    sqlite3_busy_timeout(database_, 5000);
    try { execute("PRAGMA foreign_keys = ON"); }
    catch (...) { sqlite3_close(database_); database_ = nullptr; throw; }
}

SqliteDatabase::~SqliteDatabase() {
    if (database_) sqlite3_close(database_);
}

void SqliteDatabase::execute(const std::string& sql) const {
    char* error = nullptr;
    const int result = sqlite3_exec(database_, sql.c_str(), nullptr, nullptr, &error);
    if (result == SQLITE_OK) return;
    const std::string message = error ? error : sqlite3_errmsg(database_);
    sqlite3_free(error);
    throw std::runtime_error("SQLite execution failed: " + message);
}

}  // namespace mogo::core_shared
