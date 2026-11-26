#pragma once
#include "mogo/investment/application/repository.hpp"
#include <mutex>
namespace mogo::investment {
class InvestmentService final {
public:
    explicit InvestmentService(InvestmentRepository& repository) : repository_(repository) {}
    std::vector<TargetView> list();
    Detail detail(std::int64_t target_id);
    Target saveTarget(Target input);
    void deleteTarget(std::int64_t id);
    Trade addTrade(Trade input);
    Trade updateTrade(std::int64_t id, Trade input);
    void deleteTrade(std::int64_t id);
private:
    Target requireTarget(std::int64_t id);
    Trade requireTrade(std::int64_t id);
    InvestmentRepository& repository_;
    std::mutex mutex_;
};
}
