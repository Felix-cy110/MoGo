#pragma once

#include "mogo/personal_finance/domain/category.hpp"
#include "mogo/personal_finance/domain/expense.hpp"

#include <optional>
#include <sqlite3.h>
#include <string>
#include <string_view>

namespace mogo::personal_finance::sqlite_support {

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

std::string nowLocal();
Category readCategory(const Statement& statement);
Expense readExpense(const Statement& statement);

inline constexpr std::string_view categorySelect = R"SQL(
SELECT id, code, name, i18n_key, note_policy, is_active, is_system, sort_order
FROM expense_categories
)SQL";

inline constexpr std::string_view expenseSelect = R"SQL(
SELECT e.id, e.expense_date, e.amount_cents, c.id, c.code, c.name, e.note, e.occurred_at
FROM expenses e
JOIN expense_categories c ON c.id = e.category_id
)SQL";

}  // namespace mogo::personal_finance::sqlite_support
