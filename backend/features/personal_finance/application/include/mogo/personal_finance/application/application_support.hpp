#pragma once

#include "mogo/personal_finance/application/finance_repository.hpp"

#include <cstddef>
#include <string>

namespace mogo::personal_finance {

class FinanceTransaction final {
public:
    explicit FinanceTransaction(FinanceTransactionRepository& repository);
    ~FinanceTransaction();

    FinanceTransaction(const FinanceTransaction&) = delete;
    FinanceTransaction& operator=(const FinanceTransaction&) = delete;

    void commit();

private:
    FinanceTransactionRepository& repository_;
    bool committed_{};
};

std::string trimText(std::string value);
std::size_t utf8Length(const std::string& value);
void validateDate(const std::string& date);
std::string nowLocal();

}  // namespace mogo::personal_finance
