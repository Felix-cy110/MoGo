#pragma once
#include "mogo/core_shared/sqlite_statement.hpp"

#include "mogo/personal_finance/domain/category.hpp"
#include "mogo/personal_finance/domain/expense.hpp"

#include <optional>
#include <sqlite3.h>
#include <string>
#include <string_view>

namespace mogo::personal_finance::sqlite_support {

using Statement = core_shared::Statement;

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
