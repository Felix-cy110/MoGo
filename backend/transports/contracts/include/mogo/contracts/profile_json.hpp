#pragma once
#include "mogo/core_shared/error.hpp"
#include "mogo/user_profile/domain/profile.hpp"

namespace mogo::contracts::profile {
using core_shared::ApplicationError;
using user_profile::Profile;
template <typename Json, typename Value>
Json nullable(const std::optional<Value>& value) {
    return value ? Json(*value) : Json(nullptr);
}

template <typename Json>
Json profileJson(const Profile& profile) {
    return {
        {"name", nullable<Json>(profile.name)}, {"gender", nullable<Json>(profile.gender)},
        {"age", nullable<Json>(profile.age)}, {"country", nullable<Json>(profile.country)},
        {"occupation", nullable<Json>(profile.occupation)},
        {"monthlyIncomeCents", nullable<Json>(profile.monthlyIncomeCents)},
    };
}

template <typename Json>
std::optional<std::string> optionalText(const Json& body, const char* field) {
    if (!body.contains(field) || body.at(field).is_null()) return std::nullopt;
    if (!body.at(field).is_string()) throw ApplicationError(400, "VALIDATION_ERROR", "Expected a string");
    return body.at(field).template get<std::string>();
}

template <typename Json>
Profile parseProfile(const std::string& text) {
    const auto body = Json::parse(text, nullptr, false);
    if (!body.is_object()) throw ApplicationError(400, "VALIDATION_ERROR", "Expected a JSON object");
    std::optional<int> age;
    if (body.contains("age") && !body.at("age").is_null()) {
        const auto& value = body.at("age");
        if (!value.is_number_integer() || value < 0 || value > 150) {
            throw ApplicationError(400, "PROFILE_AGE_INVALID", "Age must be an integer between 0 and 150");
        }
        age = value.template get<int>();
    }
    std::optional<std::int64_t> monthlyIncomeCents;
    if (body.contains("monthlyIncomeCents") && !body.at("monthlyIncomeCents").is_null()) {
        const auto& value = body.at("monthlyIncomeCents");
        if (!value.is_number_integer() || value < 0 || value > 99'999'999'999LL) {
            throw ApplicationError(400, "PROFILE_MONTHLY_INCOME_INVALID", "Monthly income is outside the supported range");
        }
        monthlyIncomeCents = value.template get<std::int64_t>();
    }
    return Profile{
        .name = optionalText(body, "name"), .gender = optionalText(body, "gender"), .age = age,
        .country = optionalText(body, "country"), .occupation = optionalText(body, "occupation"),
        .monthlyIncomeCents = monthlyIncomeCents,
    };
}

}  // namespace mogo::contracts::profile
