#pragma once
#include <nlohmann/json.hpp>
#include <string>
#ifdef MOGO_FEATURE_PERSONAL_FINANCE
#include "mogo/personal_finance/application/finance_service.hpp"
namespace mogo::native {
nlohmann::json financeCommand(personal_finance::FinanceService&, const std::string&, const nlohmann::json&);
}
#endif
#ifdef MOGO_FEATURE_USER_PROFILE
#include "mogo/user_profile/application/profile_service.hpp"
namespace mogo::native {
nlohmann::json profileCommand(user_profile::ProfileService&, const std::string&, const nlohmann::json&);
}
#endif
