#pragma once
#include <cstdint>
#include <optional>
#include <sqlite3.h>
#include <string>
#include <string_view>
namespace mogo::core_shared {
class Statement final {
public:
    Statement(sqlite3* database, std::string_view sql);
    ~Statement();

    Statement(const Statement&) = delete;
    Statement& operator=(const Statement&) = delete;

    void bind(int index, const std::string& value);
    void bind(int index, std::int64_t value);
    void bind(int index, int value);
    void bindNull(int index);
    bool row();
    void execute();

    [[nodiscard]] std::int64_t integer(int column) const;
    [[nodiscard]] int intValue(int column) const;
    [[nodiscard]] std::string text(int column) const;
    [[nodiscard]] std::optional<std::string> optionalText(int column) const;

private:
    void check(int result) const;

    sqlite3* database_{};
    sqlite3_stmt* statement_{};
};

}
