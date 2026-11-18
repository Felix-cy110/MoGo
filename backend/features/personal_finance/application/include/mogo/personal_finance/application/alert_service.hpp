#pragma once

#include "mogo/personal_finance/application/finance_repository.hpp"

namespace mogo::personal_finance {

class AlertService final {
public:
    explicit AlertService(AlertRepository& alerts) : alerts_(alerts) {}

    std::vector<Alert> evaluate(const std::string& date, const Expense& expense,
                                MoneyCents total_cents, MoneyCents budget_cents);

private:
    AlertRepository& alerts_;
};

}  // namespace mogo::personal_finance
