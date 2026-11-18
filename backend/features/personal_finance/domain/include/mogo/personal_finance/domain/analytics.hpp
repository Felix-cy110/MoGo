#pragma once

#include "mogo/personal_finance/domain/dashboard.hpp"

#include <string>
#include <vector>

namespace mogo::personal_finance {

struct DailyTotal {
    std::string date;
    MoneyCents amount_cents{};
    int expense_count{};
};

struct AnalyticsDashboard {
    std::string start_date;
    std::string end_date;
    MoneyCents total_amount_cents{};
    int expense_count{};
    std::vector<DailyTotal> days;
    std::vector<CategoryTotal> category_totals;
};

}  // namespace mogo::personal_finance
