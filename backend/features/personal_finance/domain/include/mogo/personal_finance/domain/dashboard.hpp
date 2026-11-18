#pragma once

#include "mogo/personal_finance/domain/expense.hpp"

#include <cstdint>
#include <string>
#include <vector>

namespace mogo::personal_finance {

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

}  // namespace mogo::personal_finance
