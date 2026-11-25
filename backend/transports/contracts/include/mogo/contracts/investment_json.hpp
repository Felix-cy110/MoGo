#pragma once
#include "mogo/investment/application/investment_service.hpp"
#include "mogo/core_shared/error.hpp"
namespace mogo::contracts::investment {
using namespace mogo::investment;
using core_shared::ApplicationError;
template<class Json> Json targetJson(const Target& v) {
    return {{"id", v.id}, {"name", v.name}, {"symbol", v.symbol}, {"quoteCurrency", v.quote_currency}, {"note", v.note},
        {"builtinCode", v.builtin_code ? Json(*v.builtin_code) : Json(nullptr)},
        {"createdAt", v.created_at}, {"updatedAt", v.updated_at}};
}
template<class Json> Json summaryJson(const Summary& v) {
    return {{"totalQuoteAmount", v.total_quote_amount}, {"totalQuantity", v.total_quantity},
        {"averageEntryPrice", v.average_entry_price ? Json(*v.average_entry_price) : Json(nullptr)}, {"buyCount", v.buy_count}};
}
template<class Json> Json tradeJson(const Trade& v) {
    return {{"id", v.id}, {"targetId", v.target_id}, {"side", v.side}, {"unitPrice", v.unit_price}, {"quoteAmount", v.quote_amount},
        {"quantity", calculateQuantity(v)}, {"occurredAt", v.occurred_at}, {"note", v.note}, {"clientRequestId", v.client_request_id},
        {"createdAt", v.created_at}, {"updatedAt", v.updated_at}};
}
template<class Json> std::string text(const Json& body, const char* name, bool required = true) {
    if (!body.contains(name) && !required) return "";
    if (!body.contains(name) || !body.at(name).is_string()) throw ApplicationError(400, "VALIDATION_ERROR", "Expected string");
    return body.at(name).template get<std::string>();
}
template<class Json> std::int64_t id(const Json& body, const char* key = "id") {
    if (!body.contains(key) || !body.at(key).is_number_integer() || body.at(key) <= 0 || body.at(key) > 9007199254740991LL)
        throw ApplicationError(400, "VALIDATION_ERROR", "Expected a positive safe integer ID");
    return body.at(key).template get<std::int64_t>();
}
template<class Json> Target targetInput(const Json& body) {
    Target v; v.name = text(body, "name"); v.symbol = text(body, "symbol"); v.note = text(body, "note", false);
    if (body.contains("quoteCurrency")) v.quote_currency = text(body, "quoteCurrency");
    return v;
}
template<class Json> Trade tradeInput(const Json& body, bool creating) {
    Trade v; v.unit_price = text(body, "unitPrice"); v.quote_amount = text(body, "quoteAmount");
    v.occurred_at = text(body, "occurredAt"); v.note = text(body, "note", false);
    if (body.contains("side")) v.side = text(body, "side");
    if (creating) { v.target_id = id(body, "targetId"); v.client_request_id = text(body, "clientRequestId"); }
    return v;
}
template<class Json> Json listJson(const std::vector<TargetView>& values) {
    Json result = Json::array();
    for (const auto& v : values) result.push_back({{"target", targetJson<Json>(v.target)}, {"summary", summaryJson<Json>(v.summary)}});
    return result;
}
template<class Json> Json detailJson(const Detail& value) {
    Json trades = Json::array();
    for (const auto& t : value.trades) trades.push_back(tradeJson<Json>(t));
    return {{"target", targetJson<Json>(value.target)}, {"summary", summaryJson<Json>(value.summary)}, {"trades", trades}, {"symbolLocked", value.symbol_locked}};
}
}
