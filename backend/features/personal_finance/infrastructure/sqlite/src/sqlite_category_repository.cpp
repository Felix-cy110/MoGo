#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

#include "sqlite_support.hpp"

#include <stdexcept>

namespace mogo::personal_finance {

using sqlite_support::Statement;
using sqlite_support::categorySelect;
using sqlite_support::nowLocal;
using sqlite_support::readCategory;

std::vector<Category> SqliteFinanceRepository::categories() {
    Statement query(database_.handle(), std::string(categorySelect) +
        " WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
    std::vector<Category> result;
    while (query.row()) result.push_back(readCategory(query));
    return result;
}

std::vector<Category> SqliteFinanceRepository::searchCategories(const std::string& query) {
    std::string pattern;
    pattern.reserve(query.size() + 2);
    pattern.push_back('%');
    for (const char value : query) {
        if (value == '%' || value == '_' || value == '\\') pattern.push_back('\\');
        pattern.push_back(value);
    }
    pattern.push_back('%');

    Statement statement(database_.handle(), std::string(categorySelect) + R"SQL(
WHERE (? = '' OR name LIKE ? ESCAPE '\' COLLATE NOCASE OR code LIKE ? ESCAPE '\' COLLATE NOCASE)
ORDER BY is_active DESC, sort_order ASC, id ASC
)SQL");
    statement.bind(1, query);
    statement.bind(2, pattern);
    statement.bind(3, pattern);
    std::vector<Category> result;
    while (statement.row()) result.push_back(readCategory(statement));
    return result;
}

std::optional<Category> SqliteFinanceRepository::categoryById(std::int64_t id) {
    Statement query(database_.handle(), std::string(categorySelect) + " WHERE id = ? AND is_active = 1");
    query.bind(1, id);
    if (!query.row()) return std::nullopt;
    return readCategory(query);
}

std::optional<Category> SqliteFinanceRepository::categoryByIdIncludingInactive(std::int64_t id) {
    Statement query(database_.handle(), std::string(categorySelect) + " WHERE id = ?");
    query.bind(1, id);
    if (!query.row()) return std::nullopt;
    return readCategory(query);
}

bool SqliteFinanceRepository::categoryNameExists(
    const std::string& name, std::optional<std::int64_t> excluding_id) {
    Statement query(database_.handle(), R"SQL(
SELECT 1 FROM expense_categories
WHERE name = ? COLLATE NOCASE AND (? IS NULL OR id != ?)
LIMIT 1
)SQL");
    query.bind(1, name);
    excluding_id ? query.bind(2, *excluding_id) : query.bindNull(2);
    excluding_id ? query.bind(3, *excluding_id) : query.bindNull(3);
    return query.row();
}

int SqliteFinanceRepository::maxCategorySortOrder() {
    Statement query(database_.handle(), "SELECT COALESCE(MAX(sort_order), 0) FROM expense_categories");
    query.row();
    return query.intValue(0);
}

Category SqliteFinanceRepository::insertCategory(const Category& category) {
    const std::string timestamp = nowLocal();
    Statement insert(database_.handle(), R"SQL(
INSERT INTO expense_categories
    (is_active, code, created_at, i18n_key, name, note_policy, sort_order, is_system, updated_at)
VALUES (1, ?, ?, NULL, ?, ?, ?, 0, ?)
)SQL");
    insert.bind(1, category.code);
    insert.bind(2, timestamp);
    insert.bind(3, category.name);
    insert.bind(4, category.note_policy);
    insert.bind(5, category.sort_order);
    insert.bind(6, timestamp);
    insert.execute();
    return *categoryById(sqlite3_last_insert_rowid(database_.handle()));
}

Category SqliteFinanceRepository::updateCategory(std::int64_t id, const std::string& name) {
    Statement update(database_.handle(), R"SQL(
UPDATE expense_categories
SET name = ?, i18n_key = NULL, updated_at = ?
WHERE id = ? AND is_active = 1
)SQL");
    update.bind(1, name);
    update.bind(2, nowLocal());
    update.bind(3, id);
    update.execute();
    const auto category = categoryById(id);
    if (!category) throw std::runtime_error("Updated category disappeared");
    return *category;
}

Category SqliteFinanceRepository::deactivateCategory(std::int64_t id) {
    Statement update(database_.handle(), R"SQL(
UPDATE expense_categories SET is_active = 0, updated_at = ? WHERE id = ? AND is_active = 1
)SQL");
    update.bind(1, nowLocal());
    update.bind(2, id);
    update.execute();
    const auto category = categoryByIdIncludingInactive(id);
    if (!category) throw std::runtime_error("Deleted category disappeared");
    return *category;
}


}  // namespace mogo::personal_finance
