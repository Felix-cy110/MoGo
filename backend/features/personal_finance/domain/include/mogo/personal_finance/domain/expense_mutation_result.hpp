#pragma once

#include "mogo/personal_finance/domain/alert.hpp"
#include "mogo/personal_finance/domain/expense.hpp"

#include <vector>

namespace mogo::personal_finance {

struct ExpenseMutationResult {
    Expense expense;
    MoneyCents total_amount_cents{};
    MoneyCents budget_amount_cents{};
    MoneyCents remaining_amount_cents{};
    int usage_percent{};
    std::vector<Alert> alerts;
};

}  // namespace mogo::personal_finance
