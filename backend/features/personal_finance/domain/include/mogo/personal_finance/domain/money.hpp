#pragma once

#include <algorithm>
#include <cstdint>
#include <limits>

namespace mogo::personal_finance {

using MoneyCents = std::int64_t;

class BudgetUsage final {
public:
    BudgetUsage(MoneyCents total_cents, MoneyCents budget_cents)
        : total_cents_(total_cents), budget_cents_(budget_cents) {}

    [[nodiscard]] MoneyCents remainingCents() const {
        return std::max<MoneyCents>(0, budget_cents_ - total_cents_);
    }

    [[nodiscard]] int percentage() const {
        if (budget_cents_ <= 0) return 0;
        const long double value = static_cast<long double>(total_cents_) * 100.0L /
                                  static_cast<long double>(budget_cents_);
        return value >= static_cast<long double>(std::numeric_limits<int>::max())
                   ? std::numeric_limits<int>::max()
                   : static_cast<int>(value);
    }

    [[nodiscard]] bool reached(int threshold_percent) const {
        return budget_cents_ > 0 &&
               static_cast<long double>(total_cents_) * 100.0L >=
                   static_cast<long double>(budget_cents_) * threshold_percent;
    }

private:
    MoneyCents total_cents_{};
    MoneyCents budget_cents_{};
};

}  // namespace mogo::personal_finance
