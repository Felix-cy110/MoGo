#pragma once

#include "mogo/personal_finance/domain/money.hpp"

#include <cstdint>
#include <optional>
#include <string>

namespace mogo::personal_finance {

struct BudgetInput {
    std::string date;
    MoneyCents amount_cents{};
};

struct CategoryInput {
    std::string name;
};

struct ExpenseInput {
    std::string date;
    MoneyCents amount_cents{};
    std::int64_t category_id{};
    std::optional<std::string> note;
    std::optional<std::string> client_request_id;
};

struct ExpenseUpdateInput {
    MoneyCents amount_cents{};
    std::int64_t category_id{};
    std::optional<std::string> note;
};

}  // namespace mogo::personal_finance
