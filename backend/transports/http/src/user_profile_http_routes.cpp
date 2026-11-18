#include "mogo/http/user_profile_http_routes.hpp"

#include "mogo/core_shared/error.hpp"

#include <functional>

namespace mogo::http {
namespace {

using core_shared::ApplicationError;
using user_profile::Profile;

template <typename Value>
hv::Json nullable(const std::optional<Value>& value) {
    return value ? hv::Json(*value) : hv::Json(nullptr);
}

hv::Json profileJson(const Profile& profile) {
    return {
        {"name", nullable(profile.name)}, {"gender", nullable(profile.gender)},
        {"age", nullable(profile.age)}, {"country", nullable(profile.country)},
        {"occupation", nullable(profile.occupation)},
        {"monthlyIncomeCents", nullable(profile.monthlyIncomeCents)},
    };
}

std::optional<std::string> optionalText(const hv::Json& body, const char* field) {
    if (!body.contains(field) || body.at(field).is_null()) return std::nullopt;
    if (!body.at(field).is_string()) throw ApplicationError(400, "VALIDATION_ERROR", "Expected a string");
    return body.at(field).get<std::string>();
}

Profile parseProfile(const std::string& text) {
    const auto body = hv::Json::parse(text, nullptr, false);
    if (!body.is_object()) throw ApplicationError(400, "VALIDATION_ERROR", "Expected a JSON object");
    std::optional<int> age;
    if (body.contains("age") && !body.at("age").is_null()) {
        const auto& value = body.at("age");
        if (!value.is_number_integer() || value < 0 || value > 150) {
            throw ApplicationError(400, "PROFILE_AGE_INVALID", "Age must be an integer between 0 and 150");
        }
        age = value.get<int>();
    }
    std::optional<std::int64_t> monthlyIncomeCents;
    if (body.contains("monthlyIncomeCents") && !body.at("monthlyIncomeCents").is_null()) {
        const auto& value = body.at("monthlyIncomeCents");
        if (!value.is_number_integer() || value < 0 || value > 99'999'999'999LL) {
            throw ApplicationError(400, "PROFILE_MONTHLY_INCOME_INVALID", "Monthly income is outside the supported range");
        }
        monthlyIncomeCents = value.get<std::int64_t>();
    }
    return Profile{
        .name = optionalText(body, "name"), .gender = optionalText(body, "gender"), .age = age,
        .country = optionalText(body, "country"), .occupation = optionalText(body, "occupation"),
        .monthlyIncomeCents = monthlyIncomeCents,
    };
}

int respond(const HttpContextPtr& context, const std::function<Profile()>& action) {
    context->response->SetHeader("Cache-Control", "no-store");
    try {
        return context->sendJson(profileJson(action()));
    } catch (const ApplicationError& error) {
        context->response->status_code = static_cast<http_status>(error.httpStatus());
        return context->sendJson(hv::Json{{"code", error.code()}, {"message", error.what()}});
    } catch (const std::exception&) {
        context->response->status_code = HTTP_STATUS_INTERNAL_SERVER_ERROR;
        return context->sendJson(hv::Json{{"code", "INTERNAL_ERROR"}});
    }
}

}  // namespace

void UserProfileHttpRoutes::registerRoutes(hv::HttpService& router) {
    router.GET("/api/profile", [this](const HttpContextPtr& context) {
        return respond(context, [this] { return service_.getProfile(); });
    });
    router.PUT("/api/profile", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] { return service_.saveProfile(parseProfile(context->body())); });
    });
}

}  // namespace mogo::http
