BEGIN IMMEDIATE;

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

INSERT OR IGNORE INTO expense_categories
    (is_active, code, created_at, i18n_key, name, note_policy, sort_order, is_system, updated_at)
VALUES
    (1, 'MEAL', CURRENT_TIMESTAMP, 'category.meal', '正餐', 'OPTIONAL', 10, 1, CURRENT_TIMESTAMP),
    (1, 'COMMUTE', CURRENT_TIMESTAMP, 'category.commute', '通勤', 'OPTIONAL', 20, 1, CURRENT_TIMESTAMP),
    (1, 'SNACK', CURRENT_TIMESTAMP, 'category.snack', '随心吃', 'OPTIONAL', 30, 1, CURRENT_TIMESTAMP),
    (1, 'OTHER', CURRENT_TIMESTAMP, 'category.other', '其他', 'REQUIRED', 40, 1, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO alert_rules
    (is_active, code, created_at, message_key, severity, threshold_percent, updated_at)
VALUES
    (1, 'BUDGET_WARNING', CURRENT_TIMESTAMP, 'alert.budget.warning', 'WARNING', 80, CURRENT_TIMESTAMP),
    (1, 'BUDGET_EXCEEDED', CURRENT_TIMESTAMP, 'alert.budget.exceeded', 'DANGER', 100, CURRENT_TIMESTAMP);

PRAGMA user_version = 1;
COMMIT;
