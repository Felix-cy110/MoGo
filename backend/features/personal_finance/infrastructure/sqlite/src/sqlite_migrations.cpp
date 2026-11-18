#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

#include "sqlite_support.hpp"

namespace mogo::personal_finance {

using sqlite_support::Statement;
using sqlite_support::nowLocal;

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


}  // namespace mogo::personal_finance
