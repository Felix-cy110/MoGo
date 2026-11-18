#include "mogo/personal_finance/application/alert_service.hpp"

#include "mogo/personal_finance/application/application_support.hpp"

namespace mogo::personal_finance {

std::vector<Alert> AlertService::evaluate(const std::string& date, const Expense& expense,
                                          MoneyCents total_cents, MoneyCents budget_cents) {
    std::vector<Alert> result;
    const std::string timestamp = nowLocal();
    const BudgetUsage usage(total_cents, budget_cents);
    for (const auto& rule : alerts_.activeAlertRules()) {
        const AlertState state = alerts_.alertState(date, rule.id);
        const bool reached = usage.reached(rule.threshold_percent);
        const bool crossed_now = reached && (!state.exists || !state.triggered);
        alerts_.saveAlertState(date, rule, reached, total_cents, expense.id,
                               reached ? std::optional<std::string>{timestamp} : std::nullopt,
                               timestamp);
        if (!crossed_now) continue;

        alerts_.insertAlertEvent(date, rule, expense.id, total_cents, budget_cents, timestamp);
        result.push_back(Alert{
            .code = rule.code,
            .severity = rule.severity,
            .threshold_percent = rule.threshold_percent,
            .message_key = rule.message_key,
            .total_amount_cents = total_cents,
            .budget_amount_cents = budget_cents,
        });
    }
    return result;
}

}  // namespace mogo::personal_finance
