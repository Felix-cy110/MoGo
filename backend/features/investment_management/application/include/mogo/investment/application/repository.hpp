#pragma once
#include "mogo/investment/domain/models.hpp"
#include <functional>
namespace mogo::investment {
class InvestmentRepository {
public:
    virtual ~InvestmentRepository() = default;
    virtual void transaction(const std::function<void()>& action) = 0;
    virtual std::vector<Target> targets(bool archived) = 0;
    virtual std::optional<Target> target(std::int64_t id) = 0;
    virtual bool nameExists(const std::string& name, std::int64_t except_id) = 0;
    virtual Target saveTarget(const Target& value) = 0;
    virtual std::vector<Trade> trades(std::int64_t target_id, bool include_deleted = false) = 0;
    virtual std::optional<Trade> trade(std::int64_t id) = 0;
    virtual std::optional<Trade> request(const std::string& request_id) = 0;
    virtual Trade saveTrade(const Trade& value) = 0;
};
}
