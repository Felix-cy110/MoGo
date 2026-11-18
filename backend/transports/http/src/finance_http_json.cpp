#include "finance_http_json.hpp"

#include "mogo/core_shared/error.hpp"

namespace mogo::http::finance_json {

using mogo::core_shared::ApplicationError;
using namespace mogo::personal_finance;

hv::Json categoryJson(const Category& value) {
    return {{"id", value.id}, {"code", value.code}, {"name", value.name},
            {"i18nKey", value.i18n_key ? hv::Json(*value.i18n_key) : hv::Json(nullptr)},
            {"notePolicy", value.note_policy}, {"active", value.active},
            {"system", value.system}, {"sortOrder", value.sort_order}};
}

namespace {

hv::Json expense(const Expense& value) {
    return {{"id", value.id}, {"expenseDate", value.expense_date},
            {"amountCents", value.amount_cents}, {"categoryId", value.category_id},
            {"categoryCode", value.category_code}, {"categoryName", value.category_name},
            {"note", value.note ? hv::Json(*value.note) : hv::Json(nullptr)},
            {"occurredAt", value.occurred_at}};
}

hv::Json alert(const Alert& value) {
    return {{"code", value.code}, {"severity", value.severity},
            {"thresholdPercent", value.threshold_percent}, {"messageKey", value.message_key},
            {"totalAmountCents", value.total_amount_cents},
            {"budgetAmountCents", value.budget_amount_cents}};
}

hv::Json categoryTotals(const std::vector<CategoryTotal>& values) {
    hv::Json totals = hv::Json::array();
    for (const auto& value : values) {
        totals.push_back({{"categoryId", value.category_id}, {"categoryCode", value.category_code},
                          {"categoryName", value.category_name}, {"amountCents", value.amount_cents},
                          {"expenseCount", value.expense_count}});
    }
    return totals;
}

}  // namespace

hv::Json analytics(const AnalyticsDashboard& value) {
    hv::Json days = hv::Json::array();
    for (const auto& day : value.days) {
        days.push_back({{"date", day.date}, {"amountCents", day.amount_cents},
                        {"expenseCount", day.expense_count}});
    }
    return {{"startDate", value.start_date}, {"endDate", value.end_date},
            {"totalAmountCents", value.total_amount_cents}, {"expenseCount", value.expense_count},
            {"days", std::move(days)}, {"categoryTotals", categoryTotals(value.category_totals)}};
}

hv::Json mutation(const ExpenseMutationResult& value) {
    hv::Json alerts = hv::Json::array();
    for (const auto& item : value.alerts) alerts.push_back(alert(item));
    return {{"expense", expense(value.expense)}, {"totalAmountCents", value.total_amount_cents},
            {"budgetAmountCents", value.budget_amount_cents},
            {"remainingAmountCents", value.remaining_amount_cents},
            {"usagePercent", value.usage_percent}, {"alerts", std::move(alerts)}};
}

hv::Json dashboard(const Dashboard& value) {
    hv::Json expenses = hv::Json::array();
    for (const auto& item : value.expenses) expenses.push_back(expense(item));
    return {{"date", value.date}, {"budgetSet", value.budget_set},
            {"budgetAmountCents", value.budget_amount_cents},
            {"totalAmountCents", value.total_amount_cents},
            {"remainingAmountCents", value.remaining_amount_cents},
            {"usagePercent", value.usage_percent}, {"expenseCount", value.expense_count},
            {"categoryTotals", categoryTotals(value.category_totals)},
            {"expenses", std::move(expenses)}};
}

hv::Json parseBody(const HttpContextPtr& context) {
    if (context->body().empty()) throw ApplicationError(400, "VALIDATION_ERROR", "请求体不能为空");
    try {
        const auto body = hv::Json::parse(context->body());
        if (!body.is_object()) throw ApplicationError(400, "VALIDATION_ERROR", "请求体必须是 JSON 对象");
        return body;
    } catch (const ApplicationError&) {
        throw;
    } catch (const std::exception&) {
        throw ApplicationError(400, "VALIDATION_ERROR", "JSON 请求体无效");
    }
}

std::string requiredString(const hv::Json& body, const char* key) {
    if (!body.contains(key) || !body.at(key).is_string()) {
        throw ApplicationError(400, "VALIDATION_ERROR", std::string("缺少字段：") + key);
    }
    return body.at(key).get<std::string>();
}

std::int64_t requiredInteger(const hv::Json& body, const char* key) {
    if (!body.contains(key) || !body.at(key).is_number_integer()) {
        throw ApplicationError(400, "VALIDATION_ERROR", std::string("缺少字段：") + key);
    }
    return body.at(key).get<std::int64_t>();
}

std::int64_t pathInteger(const HttpContextPtr& context, const char* key, const char* message) {
    try {
        const auto value = std::stoll(context->param(key));
        if (value <= 0) throw std::invalid_argument("non-positive id");
        return value;
    } catch (const std::exception&) {
        throw ApplicationError(400, "VALIDATION_ERROR", message);
    }
}

std::optional<std::string> optionalString(const hv::Json& body, const char* key) {
    if (!body.contains(key) || body.at(key).is_null()) return std::nullopt;
    if (!body.at(key).is_string()) {
        throw ApplicationError(400, "VALIDATION_ERROR", std::string("字段类型错误：") + key);
    }
    return body.at(key).get<std::string>();
}

int respond(const HttpContextPtr& context, const std::function<hv::Json()>& action,
            int success_status) {
    try {
        context->response->status_code = static_cast<http_status>(success_status);
        return context->sendJson(action());
    } catch (const ApplicationError& error) {
        context->response->status_code = static_cast<http_status>(error.httpStatus());
        return context->sendJson(hv::Json{{"code", error.code()}, {"message", error.what()}});
    } catch (const std::exception& error) {
        context->response->status_code = HTTP_STATUS_INTERNAL_SERVER_ERROR;
        return context->sendJson(hv::Json{{"code", "INTERNAL_ERROR"}, {"message", error.what()}});
    }
}

}  // namespace mogo::http::finance_json
