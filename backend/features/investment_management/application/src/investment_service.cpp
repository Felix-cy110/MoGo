#include "mogo/investment/application/investment_service.hpp"
#include "mogo/core_shared/error.hpp"
#include "validation.hpp"
namespace mogo::investment {
using core_shared::ApplicationError;
Target InvestmentService::requireTarget(std::int64_t id, bool writable) {
    auto value = repository_.target(id);
    if (!value) throw ApplicationError(404, "INVESTMENT_TARGET_NOT_FOUND", "Target not found");
    if (writable && value->archived_at) throw ApplicationError(409, "INVESTMENT_TARGET_ARCHIVED", "Target archived");
    return *value;
}
Trade InvestmentService::requireTrade(std::int64_t id) {
    auto value = repository_.trade(id);
    if (!value || value->deleted_at) throw ApplicationError(404, "INVESTMENT_TRADE_NOT_FOUND", "Trade not found");
    return *value;
}
std::vector<TargetView> InvestmentService::list(bool archived) {
    std::lock_guard lock(mutex_);
    std::vector<TargetView> result;
    repository_.transaction([&] {
        for (const auto& target : repository_.targets(archived))
            result.push_back({target, calculateSummary(repository_.trades(target.id))});
    });
    return result;
}
Detail InvestmentService::detail(std::int64_t target_id) {
    std::lock_guard lock(mutex_);
    Detail result;
    repository_.transaction([&] {
        result.target = requireTarget(target_id);
        result.trades = repository_.trades(target_id);
        result.summary = calculateSummary(result.trades);
        result.symbol_locked = result.target.builtin_code.has_value() || !repository_.trades(target_id, true).empty();
    });
    return result;
}
Target InvestmentService::saveTarget(Target input) {
    input.builtin_code.reset(); // Built-in identity comes only from persisted initialization.
    validateTarget(input);
    std::lock_guard lock(mutex_);
    repository_.transaction([&] {
        if (repository_.nameExists(input.name, input.id))
            throw ApplicationError(409, "INVESTMENT_TARGET_EXISTS", "Target already exists");
        if (input.id) {
            const auto existing = requireTarget(input.id, true);
            if (input.symbol != existing.symbol || input.quote_currency != existing.quote_currency) {
                if (existing.builtin_code)
                    throw ApplicationError(403, "INVESTMENT_BUILTIN_PROTECTED", "Built-in target identity is immutable");
                if (!repository_.trades(input.id, true).empty())
                    throw ApplicationError(409, "INVESTMENT_SYMBOL_LOCKED", "Symbol is locked after trading");
            }
            input.builtin_code = existing.builtin_code;
            input.created_at = existing.created_at;
        } else input.created_at = nowUtc();
        input.updated_at = nowUtc();
        input = repository_.saveTarget(input);
    });
    return input;
}
Target InvestmentService::archiveTarget(std::int64_t id, bool archived) {
    std::lock_guard lock(mutex_);
    Target value;
    repository_.transaction([&] {
        value = requireTarget(id);
        if (archived && value.builtin_code)
            throw ApplicationError(403, "INVESTMENT_BUILTIN_PROTECTED", "Built-in targets cannot be removed");
        if (!archived && repository_.nameExists(value.name, id))
            throw ApplicationError(409, "INVESTMENT_TARGET_EXISTS", "Target name already in use");
        value.archived_at = archived ? std::optional{nowUtc()} : std::nullopt;
        value.updated_at = nowUtc();
        value = repository_.saveTarget(value);
    });
    return value;
}
Trade InvestmentService::addTrade(Trade input) {
    validateTrade(input, true);
    std::lock_guard lock(mutex_);
    repository_.transaction([&] {
        // A retry cannot silently recreate a deleted/edited trade or change the original request.
        if (const auto existing = repository_.request(input.client_request_id)) {
            if (existing->deleted_at || existing->target_id != input.target_id ||
                existing->unit_price != input.unit_price || existing->quote_amount != input.quote_amount ||
                existing->occurred_at != input.occurred_at || existing->note != input.note)
                throw ApplicationError(409, "INVESTMENT_REQUEST_CONFLICT", "Request was already used");
            input = *existing;
            return;
        }
        requireTarget(input.target_id, true);
        input.created_at = input.updated_at = nowUtc();
        input = repository_.saveTrade(input);
    });
    return input;
}
Trade InvestmentService::updateTrade(std::int64_t id, Trade input) {
    validateTrade(input, false);
    std::lock_guard lock(mutex_);
    repository_.transaction([&] {
        const auto existing = requireTrade(id);
        requireTarget(existing.target_id, true);
        input.id = id; input.target_id = existing.target_id;
        input.client_request_id = existing.client_request_id;
        input.created_at = existing.created_at; input.updated_at = nowUtc();
        input = repository_.saveTrade(input);
    });
    return input;
}
void InvestmentService::deleteTrade(std::int64_t id) {
    std::lock_guard lock(mutex_);
    repository_.transaction([&] {
        auto value = requireTrade(id);
        requireTarget(value.target_id, true);
        value.deleted_at = value.updated_at = nowUtc();
        repository_.saveTrade(value);
    });
}
}
