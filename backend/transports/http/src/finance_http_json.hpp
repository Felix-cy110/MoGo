#pragma once

#include "hv/HttpContext.h"
#include "mogo/personal_finance/domain/models.hpp"

#include <cstdint>
#include <functional>
#include <optional>
#include <string>

namespace mogo::http::finance_json {

hv::Json categoryJson(const personal_finance::Category& category);
hv::Json analytics(const personal_finance::AnalyticsDashboard& dashboard);
hv::Json mutation(const personal_finance::ExpenseMutationResult& result);
hv::Json dashboard(const personal_finance::Dashboard& dashboard);

hv::Json parseBody(const HttpContextPtr& context);
std::string requiredString(const hv::Json& body, const char* key);
std::int64_t requiredInteger(const hv::Json& body, const char* key);
std::int64_t pathInteger(const HttpContextPtr& context, const char* key, const char* message);
std::optional<std::string> optionalString(const hv::Json& body, const char* key);
int respond(const HttpContextPtr& context, const std::function<hv::Json()>& action,
            int success_status = 200);

}  // namespace mogo::http::finance_json
