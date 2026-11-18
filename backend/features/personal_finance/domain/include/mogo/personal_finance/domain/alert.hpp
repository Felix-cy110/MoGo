#pragma once

#include "mogo/personal_finance/domain/money.hpp"

#include <cstdint>
#include <string>

namespace mogo::personal_finance {

struct Alert {
    std::string code;
    std::string severity;
    int threshold_percent{};
    std::string message_key;
    MoneyCents total_amount_cents{};
    MoneyCents budget_amount_cents{};
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
