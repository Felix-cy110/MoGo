#pragma once

#include <sqlite3.h>

#include <string>

namespace mogo::personal_finance {

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

}  // namespace mogo::personal_finance
