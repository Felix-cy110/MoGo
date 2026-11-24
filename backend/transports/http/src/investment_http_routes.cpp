#include "mogo/http/investment_http_routes.hpp"
#include "mogo/contracts/investment_json.hpp"
#include <charconv>
#include <functional>
namespace mogo::http {
namespace {
namespace wire = contracts::investment;
using core_shared::ApplicationError;
using Json = hv::Json;
int respond(const HttpContextPtr& context, const std::function<Json()>& action) {
    context->response->SetHeader("Cache-Control", "no-store");
    try { return context->sendJson(action()); }
    catch (const ApplicationError& error) {
        context->response->status_code = static_cast<http_status>(error.httpStatus());
        return context->sendJson(Json{{"code", error.code()}});
    } catch (const std::exception&) {
        context->response->status_code = HTTP_STATUS_INTERNAL_SERVER_ERROR;
        return context->sendJson(Json{{"code", "INTERNAL_ERROR"}});
    }
}
Json body(const HttpContextPtr& context) {
    const auto json = Json::parse(context->body(), nullptr, false);
    if (!json.is_object()) throw ApplicationError(400, "VALIDATION_ERROR", "Expected an object");
    return json;
}
std::int64_t pathId(const HttpContextPtr& context) {
    const auto text = context->param("id");
    std::int64_t value{};
    auto [end, error] = std::from_chars(text.data(), text.data() + text.size(), value);
    if (error != std::errc{} || end != text.data() + text.size() || value <= 0 || value > 9007199254740991LL)
        throw ApplicationError(400, "VALIDATION_ERROR", "Invalid ID");
    return value;
}
}
void InvestmentHttpRoutes::registerRoutes(hv::HttpService& router) {
    router.GET("/api/investment/targets", [this](const HttpContextPtr& c) {
        return respond(c, [&] {
            const auto archived = c->param("archived", "false");
            if (archived != "true" && archived != "false") throw ApplicationError(400, "VALIDATION_ERROR", "Invalid archived filter");
            return wire::listJson<Json>(service_.list(archived == "true"));
        });
    });
    router.POST("/api/investment/targets", [this](const HttpContextPtr& c) {
        return respond(c, [&] { return wire::targetJson<Json>(service_.saveTarget(wire::targetInput(body(c)))); });
    });
    router.GET("/api/investment/targets/:id", [this](const HttpContextPtr& c) {
        return respond(c, [&] { return wire::detailJson<Json>(service_.detail(pathId(c))); });
    });
    router.PUT("/api/investment/targets/:id", [this](const HttpContextPtr& c) {
        return respond(c, [&] { auto value = wire::targetInput(body(c)); value.id = pathId(c); return wire::targetJson<Json>(service_.saveTarget(value)); });
    });
    router.PUT("/api/investment/targets/:id/archive", [this](const HttpContextPtr& c) {
        return respond(c, [&] { return wire::targetJson<Json>(service_.archiveTarget(pathId(c), wire::boolean(body(c), "archived"))); });
    });
    router.POST("/api/investment/trades", [this](const HttpContextPtr& c) {
        return respond(c, [&] { return wire::tradeJson<Json>(service_.addTrade(wire::tradeInput(body(c), true))); });
    });
    router.PUT("/api/investment/trades/:id", [this](const HttpContextPtr& c) {
        return respond(c, [&] { return wire::tradeJson<Json>(service_.updateTrade(pathId(c), wire::tradeInput(body(c), false))); });
    });
    router.Delete("/api/investment/trades/:id", [this](const HttpContextPtr& c) {
        return respond(c, [&] { service_.deleteTrade(pathId(c)); return Json::object(); });
    });
}
}
