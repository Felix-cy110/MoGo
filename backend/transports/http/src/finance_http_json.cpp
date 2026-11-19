#include "finance_http_json.hpp"
#include "mogo/contracts/finance_json.hpp"

#include "mogo/core_shared/error.hpp"

namespace mogo::http::finance_json {

using mogo::core_shared::ApplicationError;
using namespace mogo::personal_finance;

hv::Json categoryJson(const Category& value) {
    return contracts::finance::categoryJson<hv::Json>(value);
}
hv::Json analytics(const AnalyticsDashboard& value) {
    return contracts::finance::analytics<hv::Json>(value);
}
hv::Json mutation(const ExpenseMutationResult& value) {
    return contracts::finance::mutation<hv::Json>(value);
}
hv::Json dashboard(const Dashboard& value) {
    return contracts::finance::dashboard<hv::Json>(value);
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
