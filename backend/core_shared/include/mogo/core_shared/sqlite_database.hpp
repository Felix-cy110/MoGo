#pragma once

#include <sqlite3.h>

#include <string>

namespace mogo::core_shared {

class SqliteDatabase final {
public:
    explicit SqliteDatabase(const std::string& path);
    ~SqliteDatabase();

    SqliteDatabase(const SqliteDatabase&) = delete;
    SqliteDatabase& operator=(const SqliteDatabase&) = delete;

    [[nodiscard]] sqlite3* handle() const noexcept { return database_; }
    void execute(const std::string& sql) const;

private:
    sqlite3* database_{};
};

}  // namespace mogo::core_shared
