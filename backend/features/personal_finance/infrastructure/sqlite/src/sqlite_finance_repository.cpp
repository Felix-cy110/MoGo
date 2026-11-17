#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

#include <chrono>
#include <ctime>
#include <iomanip>
#include <optional>
#include <sstream>
#include <stdexcept>
#include <string_view>

namespace mogo::personal_finance {
namespace {

class Statement final {
public:
    Statement(sqlite3* database, std::string_view sql) : database_(database) {
        if (sqlite3_prepare_v2(database, sql.data(), static_cast<int>(sql.size()), &statement_, nullptr) != SQLITE_OK) {
            throw std::runtime_error("SQLite prepare failed: " + std::string(sqlite3_errmsg(database)));
        }
    }

    ~Statement() { sqlite3_finalize(statement_); }

    Statement(const Statement&) = delete;
    Statement& operator=(const Statement&) = delete;

    void bind(int index, const std::string& value) {
        check(sqlite3_bind_text(statement_, index, value.c_str(), -1, SQLITE_TRANSIENT));
    }
    void bind(int index, std::int64_t value) { check(sqlite3_bind_int64(statement_, index, value)); }
    void bind(int index, int value) { check(sqlite3_bind_int(statement_, index, value)); }
    void bindNull(int index) { check(sqlite3_bind_null(statement_, index)); }

    bool row() {
        const int result = sqlite3_step(statement_);
        if (result == SQLITE_ROW) return true;
        if (result == SQLITE_DONE) return false;
        throw std::runtime_error("SQLite step failed: " + std::string(sqlite3_errmsg(database_)));
    }

    void execute() {
        if (row()) throw std::runtime_error("SQLite statement unexpectedly returned a row");
    }

    [[nodiscard]] std::int64_t integer(int column) const {
        return sqlite3_column_int64(statement_, column);
    }
    [[nodiscard]] int intValue(int column) const { return sqlite3_column_int(statement_, column); }
    [[nodiscard]] std::string text(int column) const {
        const auto* value = sqlite3_column_text(statement_, column);
        return value ? reinterpret_cast<const char*>(value) : "";
    }
    [[nodiscard]] std::optional<std::string> optionalText(int column) const {
        if (sqlite3_column_type(statement_, column) == SQLITE_NULL) return std::nullopt;
        return text(column);
    }

private:
    void check(int result) const {
        if (result != SQLITE_OK) {
            throw std::runtime_error("SQLite bind failed: " + std::string(sqlite3_errmsg(database_)));
        }
    }

    sqlite3* database_{};
    sqlite3_stmt* statement_{};
};

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

constexpr std::string_view categorySelect = R"SQL(
SELECT id, code, name, i18n_key, note_policy, is_active, is_system, sort_order
FROM expense_categories
)SQL";

constexpr std::string_view expenseSelect = R"SQL(
SELECT e.id, e.expense_date, e.amount_cents, c.id, c.code, c.name, e.note, e.occurred_at
FROM expenses e
JOIN expense_categories c ON c.id = e.category_id
)SQL";

}  // namespace

SqliteFinanceRepository::SqliteFinanceRepository(const std::string& database_path)
    : database_(database_path) {}

void SqliteFinanceRepository::migrateAndSeed() {
    database_.execute("BEGIN IMMEDIATE");
    try {
        database_.execute(R"SQL(
CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY,
    is_active BOOLEAN NOT NULL,
    code VARCHAR(40) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL,
    i18n_key VARCHAR(120),
    name VARCHAR(80) NOT NULL,
    note_policy VARCHAR(20) NOT NULL,
    sort_order INTEGER NOT NULL,
    is_system BOOLEAN NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS daily_budgets (
    id INTEGER PRIMARY KEY,
    budget_date DATE NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL,
    currency_code VARCHAR(8) NOT NULL,
    max_amount_cents BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY,
    amount_cents BIGINT NOT NULL,
    client_request_id VARCHAR(80) UNIQUE,
    created_at TIMESTAMP NOT NULL,
    expense_date DATE NOT NULL,
    note VARCHAR(500),
    occurred_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    category_id BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category_id);
CREATE TABLE IF NOT EXISTS alert_rules (
    id INTEGER PRIMARY KEY,
    is_active BOOLEAN NOT NULL,
    code VARCHAR(60) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL,
    message_key VARCHAR(120) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    threshold_percent INTEGER NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS alert_daily_states (
    budget_date DATE NOT NULL,
    rule_id BIGINT NOT NULL,
    last_expense_id BIGINT,
    last_total_cents BIGINT NOT NULL,
    is_triggered BOOLEAN NOT NULL,
    triggered_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (budget_date, rule_id)
);
CREATE TABLE IF NOT EXISTS alert_events (
    id INTEGER PRIMARY KEY,
    budget_amount_cents BIGINT NOT NULL,
    budget_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    message_key VARCHAR(120) NOT NULL,
    threshold_percent INTEGER NOT NULL,
    total_amount_cents BIGINT NOT NULL,
    expense_id BIGINT,
    rule_id BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alert_events_date ON alert_events (budget_date);

PRAGMA user_version = 1;
)SQL");
        const std::string timestamp = nowLocal();
        struct CategorySeed {
            const char* code;
            const char* name;
            const char* i18n;
            const char* policy;
            int order;
        };
        const CategorySeed categories[] = {
            {"MEAL", "正餐", "category.meal", "OPTIONAL", 10},
            {"COMMUTE", "通勤", "category.commute", "OPTIONAL", 20},
            {"SNACK", "随心吃", "category.snack", "OPTIONAL", 30},
            {"OTHER", "其他", "category.other", "REQUIRED", 40},
        };
        for (const auto& seed : categories) {
            Statement insert(database_.handle(), R"SQL(
INSERT OR IGNORE INTO expense_categories
    (is_active, code, created_at, i18n_key, name, note_policy, sort_order, is_system, updated_at)
VALUES (1, ?, ?, ?, ?, ?, ?, 1, ?)
)SQL");
            insert.bind(1, seed.code);
            insert.bind(2, timestamp);
            insert.bind(3, seed.i18n);
            insert.bind(4, seed.name);
            insert.bind(5, seed.policy);
            insert.bind(6, seed.order);
            insert.bind(7, timestamp);
            insert.execute();
        }

        struct RuleSeed {
            const char* code;
            int threshold;
            const char* severity;
            const char* message;
        };
        const RuleSeed rules[] = {
            {"BUDGET_WARNING", 80, "WARNING", "alert.budget.warning"},
            {"BUDGET_EXCEEDED", 100, "DANGER", "alert.budget.exceeded"},
        };
        for (const auto& seed : rules) {
            Statement insert(database_.handle(), R"SQL(
INSERT OR IGNORE INTO alert_rules
    (is_active, code, created_at, message_key, severity, threshold_percent, updated_at)
VALUES (1, ?, ?, ?, ?, ?, ?)
)SQL");
            insert.bind(1, seed.code);
            insert.bind(2, timestamp);
            insert.bind(3, seed.message);
            insert.bind(4, seed.severity);
            insert.bind(5, seed.threshold);
            insert.bind(6, timestamp);
            insert.execute();
        }
        database_.execute("COMMIT");
    } catch (...) {
        try {
            database_.execute("ROLLBACK");
        } catch (...) {
        }
        throw;
    }
}

void SqliteFinanceRepository::beginTransaction() { database_.execute("BEGIN IMMEDIATE"); }
void SqliteFinanceRepository::commitTransaction() { database_.execute("COMMIT"); }
void SqliteFinanceRepository::rollbackTransaction() noexcept {
    try { database_.execute("ROLLBACK"); } catch (...) {}
}

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

std::optional<MoneyCents> SqliteFinanceRepository::budgetForDate(const std::string& date) {
    Statement query(database_.handle(), "SELECT max_amount_cents FROM daily_budgets WHERE budget_date = ?");
    query.bind(1, date);
    if (!query.row()) return std::nullopt;
    return query.integer(0);
}

void SqliteFinanceRepository::saveBudget(const std::string& date, MoneyCents amount_cents) {
    const std::string timestamp = nowLocal();
    Statement statement(database_.handle(), R"SQL(
INSERT INTO daily_budgets (budget_date, created_at, currency_code, max_amount_cents, updated_at)
VALUES (?, ?, 'CNY', ?, ?)
ON CONFLICT(budget_date) DO UPDATE SET
    max_amount_cents = excluded.max_amount_cents,
    updated_at = excluded.updated_at
)SQL");
    statement.bind(1, date);
    statement.bind(2, timestamp);
    statement.bind(3, amount_cents);
    statement.bind(4, timestamp);
    statement.execute();
}

std::vector<Expense> SqliteFinanceRepository::expensesForDate(const std::string& date) {
    Statement query(database_.handle(), std::string(expenseSelect) +
        " WHERE e.expense_date = ? ORDER BY e.occurred_at DESC, e.id DESC");
    query.bind(1, date);
    std::vector<Expense> result;
    while (query.row()) result.push_back(readExpense(query));
    return result;
}

MoneyCents SqliteFinanceRepository::sumExpensesForDate(const std::string& date) {
    Statement query(database_.handle(),
                    "SELECT COALESCE(SUM(amount_cents), 0) FROM expenses WHERE expense_date = ?");
    query.bind(1, date);
    query.row();
    return query.integer(0);
}

AnalyticsDashboard SqliteFinanceRepository::analyticsForRange(
    const std::string& start_date, const std::string& end_date) {
    AnalyticsDashboard dashboard{
        .start_date = start_date,
        .end_date = end_date,
    };

    Statement daily(database_.handle(), R"SQL(
SELECT expense_date, COALESCE(SUM(amount_cents), 0), COUNT(*)
FROM expenses
WHERE expense_date BETWEEN ? AND ?
GROUP BY expense_date
ORDER BY expense_date ASC
)SQL");
    daily.bind(1, start_date);
    daily.bind(2, end_date);
    while (daily.row()) {
        DailyTotal total{
            .date = daily.text(0),
            .amount_cents = daily.integer(1),
            .expense_count = daily.intValue(2),
        };
        dashboard.total_amount_cents += total.amount_cents;
        dashboard.expense_count += total.expense_count;
        dashboard.days.push_back(std::move(total));
    }

    Statement categories(database_.handle(), R"SQL(
SELECT c.id, c.code, c.name, COALESCE(SUM(e.amount_cents), 0), COUNT(*)
FROM expenses e
JOIN expense_categories c ON c.id = e.category_id
WHERE e.expense_date BETWEEN ? AND ?
GROUP BY c.id, c.code, c.name
ORDER BY SUM(e.amount_cents) DESC, c.id ASC
)SQL");
    categories.bind(1, start_date);
    categories.bind(2, end_date);
    while (categories.row()) {
        dashboard.category_totals.push_back(CategoryTotal{
            .category_id = categories.integer(0),
            .category_code = categories.text(1),
            .category_name = categories.text(2),
            .amount_cents = categories.integer(3),
            .expense_count = categories.intValue(4),
        });
    }
    return dashboard;
}

std::optional<Expense> SqliteFinanceRepository::expenseById(std::int64_t id) {
    Statement query(database_.handle(), std::string(expenseSelect) + " WHERE e.id = ?");
    query.bind(1, id);
    if (!query.row()) return std::nullopt;
    return readExpense(query);
}

std::optional<Expense> SqliteFinanceRepository::expenseByClientRequestId(const std::string& request_id) {
    Statement query(database_.handle(), std::string(expenseSelect) + " WHERE e.client_request_id = ?");
    query.bind(1, request_id);
    if (!query.row()) return std::nullopt;
    return readExpense(query);
}

Expense SqliteFinanceRepository::insertExpense(
    const std::string& date, MoneyCents amount_cents, const Category& category,
    const std::optional<std::string>& note, const std::optional<std::string>& client_request_id,
    const std::string& occurred_at) {
    const std::string timestamp = nowLocal();
    Statement insert(database_.handle(), R"SQL(
INSERT INTO expenses
    (amount_cents, client_request_id, created_at, expense_date, note, occurred_at, updated_at, category_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
)SQL");
    insert.bind(1, amount_cents);
    client_request_id ? insert.bind(2, *client_request_id) : insert.bindNull(2);
    insert.bind(3, timestamp);
    insert.bind(4, date);
    note ? insert.bind(5, *note) : insert.bindNull(5);
    insert.bind(6, occurred_at);
    insert.bind(7, timestamp);
    insert.bind(8, category.id);
    insert.execute();
    return *expenseById(sqlite3_last_insert_rowid(database_.handle()));
}

Expense SqliteFinanceRepository::updateExpense(std::int64_t expense_id, MoneyCents amount_cents,
                                               const Category& category,
                                               const std::optional<std::string>& note) {
    Statement update(database_.handle(), R"SQL(
UPDATE expenses SET amount_cents = ?, category_id = ?, note = ?, updated_at = ? WHERE id = ?
)SQL");
    update.bind(1, amount_cents);
    update.bind(2, category.id);
    note ? update.bind(3, *note) : update.bindNull(3);
    update.bind(4, nowLocal());
    update.bind(5, expense_id);
    update.execute();
    const auto result = expenseById(expense_id);
    if (!result) throw std::runtime_error("Updated expense disappeared");
    return *result;
}

std::vector<AlertRule> SqliteFinanceRepository::activeAlertRules() {
    Statement query(database_.handle(), R"SQL(
SELECT id, code, threshold_percent, severity, message_key
FROM alert_rules WHERE is_active = 1 ORDER BY threshold_percent ASC
)SQL");
    std::vector<AlertRule> rules;
    while (query.row()) {
        rules.push_back(AlertRule{
            .id = query.integer(0),
            .code = query.text(1),
            .threshold_percent = query.intValue(2),
            .severity = query.text(3),
            .message_key = query.text(4),
        });
    }
    return rules;
}

AlertState SqliteFinanceRepository::alertState(const std::string& date, std::int64_t rule_id) {
    Statement query(database_.handle(), R"SQL(
SELECT is_triggered FROM alert_daily_states WHERE budget_date = ? AND rule_id = ?
)SQL");
    query.bind(1, date);
    query.bind(2, rule_id);
    if (!query.row()) return {};
    return AlertState{.exists = true, .triggered = query.intValue(0) != 0};
}

void SqliteFinanceRepository::saveAlertState(
    const std::string& date, const AlertRule& rule, bool triggered, MoneyCents total_cents,
    std::int64_t expense_id, const std::optional<std::string>& triggered_at,
    const std::string& updated_at) {
    Statement statement(database_.handle(), R"SQL(
INSERT INTO alert_daily_states
    (budget_date, rule_id, last_expense_id, last_total_cents, is_triggered, triggered_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(budget_date, rule_id) DO UPDATE SET
    last_expense_id = excluded.last_expense_id,
    last_total_cents = excluded.last_total_cents,
    is_triggered = excluded.is_triggered,
    triggered_at = CASE
        WHEN excluded.is_triggered = 0 THEN NULL
        WHEN alert_daily_states.is_triggered = 1 THEN alert_daily_states.triggered_at
        ELSE excluded.triggered_at
    END,
    updated_at = excluded.updated_at
)SQL");
    statement.bind(1, date);
    statement.bind(2, rule.id);
    statement.bind(3, expense_id);
    statement.bind(4, total_cents);
    statement.bind(5, triggered ? 1 : 0);
    triggered_at ? statement.bind(6, *triggered_at) : statement.bindNull(6);
    statement.bind(7, updated_at);
    statement.execute();
}

void SqliteFinanceRepository::insertAlertEvent(
    const std::string& date, const AlertRule& rule, std::int64_t expense_id,
    MoneyCents total_cents, MoneyCents budget_cents, const std::string& created_at) {
    Statement statement(database_.handle(), R"SQL(
INSERT INTO alert_events
    (budget_amount_cents, budget_date, created_at, event_type, message_key,
     threshold_percent, total_amount_cents, expense_id, rule_id)
VALUES (?, ?, ?, 'THRESHOLD_CROSSED', ?, ?, ?, ?, ?)
)SQL");
    statement.bind(1, budget_cents);
    statement.bind(2, date);
    statement.bind(3, created_at);
    statement.bind(4, rule.message_key);
    statement.bind(5, rule.threshold_percent);
    statement.bind(6, total_cents);
    statement.bind(7, expense_id);
    statement.bind(8, rule.id);
    statement.execute();
}

}  // namespace mogo::personal_finance
