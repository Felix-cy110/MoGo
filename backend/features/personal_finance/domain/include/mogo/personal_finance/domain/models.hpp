#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace mogo::personal_finance {

using MoneyCents = std::int64_t;

struct Category {
    std::int64_t id{};
    std::string code;
    std::string name;
    std::optional<std::string> i18n_key;
    std::string note_policy;
    bool system{};
    int sort_order{};
};

struct Expense {
    std::int64_t id{};
    std::string expense_date;
    MoneyCents amount_cents{};
    std::int64_t category_id{};
    std::string category_code;
    std::string category_name;
    std::optional<std::string> note;
    std::string occurred_at;
};

struct Alert {
    std::string code;
    std::string severity;
    int threshold_percent{};
    std::string message_key;
    MoneyCents total_amount_cents{};
    MoneyCents budget_amount_cents{};
};

struct CategoryTotal {
    std::int64_t category_id{};
    std::string category_code;
    std::string category_name;
    MoneyCents amount_cents{};
    int expense_count{};
};

struct Dashboard {
    std::string date;
    bool budget_set{};
    MoneyCents budget_amount_cents{};
    MoneyCents total_amount_cents{};
    MoneyCents remaining_amount_cents{};
    int usage_percent{};
    int expense_count{};
    std::vector<CategoryTotal> category_totals;
    std::vector<Expense> expenses;
};

struct ExpenseMutationResult {
    Expense expense;
    MoneyCents total_amount_cents{};
    MoneyCents budget_amount_cents{};
    MoneyCents remaining_amount_cents{};
    int usage_percent{};
    std::vector<Alert> alerts;
};

struct AlertRule {
    std::int64_t id{};
    std::string code;
    int threshold_percent{};
    std::string severity;
    std::string message_key;
};

struct AlertState {
    bool exists{};
    bool triggered{};
};

}  // namespace mogo::personal_finance
