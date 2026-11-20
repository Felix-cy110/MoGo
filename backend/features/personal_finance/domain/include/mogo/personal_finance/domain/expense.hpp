#pragma once

#include "mogo/personal_finance/domain/money.hpp"

#include <cstdint>
#include <optional>
#include <string>

namespace mogo::personal_finance {

struct Expense {
    std::int64_t id{};
    std::string expense_date;
    MoneyCents amount_cents{};
    std::int64_t category_id{};
    std::string category_code;
    std::string category_name;
    std::optional<std::string> note;
    std::string occurred_at;

    [[nodiscard]] bool canEditOn(const std::string& today) const {
        return expense_date == today || occurred_at.starts_with(today);
    }
};

}  // namespace mogo::personal_finance
