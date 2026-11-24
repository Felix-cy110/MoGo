#pragma once
#include "hv/HttpService.h"
#include "mogo/investment/application/investment_service.hpp"
namespace mogo::http {
class InvestmentHttpRoutes final {
public:
    explicit InvestmentHttpRoutes(investment::InvestmentService& service) : service_(service) {}
    void registerRoutes(hv::HttpService& router);
private:
    investment::InvestmentService& service_;
};
}
