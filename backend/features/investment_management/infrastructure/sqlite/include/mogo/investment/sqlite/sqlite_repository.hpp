#pragma once
#include "mogo/core_shared/sqlite_database.hpp"
#include "mogo/investment/application/repository.hpp"
namespace mogo::investment {
class SqliteInvestmentRepository final : public InvestmentRepository {
public:
    explicit SqliteInvestmentRepository(const std::string& path);
    void transaction(const std::function<void()>& action) override;
    std::vector<Target> targets() override;
    std::optional<Target> target(std::int64_t id) override;
    bool nameExists(const std::string& name, std::int64_t except_id) override;
    Target saveTarget(const Target& value) override;
    std::vector<Trade> trades(std::int64_t target_id, bool include_deleted = false) override;
    std::optional<Trade> trade(std::int64_t id) override;
    std::optional<Trade> request(const std::string& request_id) override;
    Trade saveTrade(const Trade& value) override;
private:
    core_shared::SqliteDatabase database_;
};
}
