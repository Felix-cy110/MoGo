#include "commands.hpp"
#include "mogo/contracts/investment_json.hpp"
namespace mogo::native {
nlohmann::json investmentCommand(investment::InvestmentService& service, const std::string& method, const nlohmann::json& body) {
    namespace wire = contracts::investment;
    using Json = nlohmann::json;
    if (method == "listTargets") return wire::listJson<Json>(service.list());
    if (method == "getTarget") return wire::detailJson<Json>(service.detail(wire::id(body)));
    if (method == "addTarget") return wire::targetJson<Json>(service.saveTarget(wire::targetInput(body)));
    if (method == "updateTarget") { auto value = wire::targetInput(body); value.id = wire::id(body); return wire::targetJson<Json>(service.saveTarget(value)); }
    if (method == "addTrade") return wire::tradeJson<Json>(service.addTrade(wire::tradeInput(body, true)));
    if (method == "updateTrade") return wire::tradeJson<Json>(service.updateTrade(wire::id(body), wire::tradeInput(body, false)));
    if (method == "deleteTrade") { service.deleteTrade(wire::id(body)); return Json::object(); }
    throw core_shared::ApplicationError(400, "FEATURE_UNAVAILABLE", "Unknown investment operation");
}
}
