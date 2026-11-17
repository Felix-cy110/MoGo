#pragma once

#include "hv/HttpService.h"
#include "mogo/personal_finance/application/finance_service.hpp"

namespace mogo::http {

class FinanceHttpRoutes final {
public:
    explicit FinanceHttpRoutes(personal_finance::FinanceService& service) : service_(service) {}
    void registerRoutes(hv::HttpService& router);

private:
    personal_finance::FinanceService& service_;
};

}  // namespace mogo::http
