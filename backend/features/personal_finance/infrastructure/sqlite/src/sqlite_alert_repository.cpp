#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

#include "sqlite_support.hpp"

namespace mogo::personal_finance {

using sqlite_support::Statement;

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
