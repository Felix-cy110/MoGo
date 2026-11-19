#include "commands.hpp"
#include "mogo/contracts/finance_json.hpp"
#include "mogo/core_shared/error.hpp"

namespace mogo::native {
using Json = nlohmann::json;
using namespace personal_finance;

namespace {
std::int64_t integer(const Json& body, const char* key) {
    const auto& value = body.at(key);
    if (!value.is_number_integer() || value < -9'007'199'254'740'991LL ||
        value > 9'007'199'254'740'991LL) {
        throw core_shared::ApplicationError(400, "VALIDATION_ERROR", "Expected a safe integer");
    }
    return value.get<std::int64_t>();
}

std::optional<std::string> optionalText(const Json& body, const char* key) {
    if (!body.contains(key) || body.at(key).is_null()) return std::nullopt;
    return body.at(key).get<std::string>();
}
}  // namespace

Json financeCommand(FinanceService& service, const std::string& method, const Json& body) {
    namespace wire = contracts::finance;
    if (method == "getCategories" || method == "searchCategories") {
        Json items = Json::array();
        const auto categories = method == "getCategories"
            ? service.getCategories() : service.searchCategories(body.value("query", ""));
        for (const auto& category : categories) items.push_back(wire::categoryJson<Json>(category));
        return items;
    }
    if (method == "addCategory") {
        return wire::categoryJson<Json>(service.addCategory({body.at("name").get<std::string>()}));
    }
    if (method == "updateCategory") {
        return wire::categoryJson<Json>(service.updateCategory(
            integer(body, "id"), {body.at("name").get<std::string>()}));
    }
    if (method == "deleteCategory") {
        return wire::categoryJson<Json>(service.deleteCategory(integer(body, "id")));
    }
    if (method == "getDashboard") {
        return wire::dashboard<Json>(service.getDashboard(body.at("date").get<std::string>()));
    }
    if (method == "getAnalytics") {
        return wire::analytics<Json>(service.getAnalytics(
            body.at("startDate").get<std::string>(), body.at("endDate").get<std::string>()));
    }
    if (method == "saveBudget") {
        const auto saved = service.saveBudget({
            body.at("date").get<std::string>(), integer(body, "amountCents")});
        return {{"date", saved.date}, {"amountCents", saved.amount_cents}, {"currencyCode", "CNY"}};
    }
    if (method == "addExpense") {
        return wire::mutation<Json>(service.addExpense({
            .date = body.at("date").get<std::string>(),
            .amount_cents = integer(body, "amountCents"),
            .category_id = integer(body, "categoryId"),
            .note = optionalText(body, "note"),
            .client_request_id = optionalText(body, "clientRequestId"),
        }));
    }
    if (method == "updateExpense") {
        return wire::mutation<Json>(service.updateExpense(integer(body, "id"), {
            .amount_cents = integer(body, "amountCents"),
            .category_id = integer(body, "categoryId"),
            .note = optionalText(body, "note"),
        }));
    }
    throw core_shared::ApplicationError(400, "FEATURE_UNAVAILABLE", "Unknown finance operation");
}
}  // namespace mogo::native
