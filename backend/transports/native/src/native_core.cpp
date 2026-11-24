#include "mogo/native/native_core.hpp"
#include "mogo/core_shared/error.hpp"
#include "commands.hpp"
#ifdef MOGO_FEATURE_PERSONAL_FINANCE
#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"
#endif
#ifdef MOGO_FEATURE_USER_PROFILE
#include "mogo/user_profile/json/json_profile_repository.hpp"
#endif

#ifdef MOGO_FEATURE_INVESTMENT_MANAGEMENT
#include "mogo/investment/sqlite/sqlite_repository.hpp"
#endif

namespace mogo::native {
using Json = nlohmann::json;
using core_shared::ApplicationError;
struct NativeCore::Impl {
#ifdef MOGO_FEATURE_INVESTMENT_MANAGEMENT
    std::unique_ptr<investment::SqliteInvestmentRepository> investment_repository;
    std::unique_ptr<investment::InvestmentService> investment;
#endif
#ifdef MOGO_FEATURE_PERSONAL_FINANCE
    std::unique_ptr<personal_finance::SqliteFinanceRepository> finance_repository;
    std::unique_ptr<personal_finance::FinanceService> finance;
#endif
#ifdef MOGO_FEATURE_USER_PROFILE
    std::unique_ptr<user_profile::JsonProfileRepository> profile_repository;
    std::unique_ptr<user_profile::ProfileService> profile;
#endif
    explicit Impl(const std::filesystem::path& directory) {
        if (directory.empty() || !directory.is_absolute()) {
            throw std::invalid_argument("Private absolute directory required");
        }
        std::filesystem::create_directories(directory);
#ifdef MOGO_FEATURE_INVESTMENT_MANAGEMENT
        investment_repository = std::make_unique<investment::SqliteInvestmentRepository>((directory / "mogo.db").string());
        investment = std::make_unique<investment::InvestmentService>(*investment_repository);
#endif
#ifdef MOGO_FEATURE_PERSONAL_FINANCE
        finance_repository = std::make_unique<personal_finance::SqliteFinanceRepository>(
            (directory / "mogo.db").string());
        finance = std::make_unique<personal_finance::FinanceService>(*finance_repository);
#endif
#ifdef MOGO_FEATURE_USER_PROFILE
        profile_repository = std::make_unique<user_profile::JsonProfileRepository>(
            directory / "user-profile.json");
        profile = std::make_unique<user_profile::ProfileService>(*profile_repository);
#endif
    }
    Json dispatch(const std::string& method, const Json& payload) {
        if (method == "capabilities") {
            Json features = Json::array();
#ifdef MOGO_FEATURE_INVESTMENT_MANAGEMENT
            features.push_back("investment-management");
#endif
#ifdef MOGO_FEATURE_PERSONAL_FINANCE
            features.push_back("personal-finance");
#endif
#ifdef MOGO_FEATURE_USER_PROFILE
            features.push_back("user-profile");
#endif
            return {{"features", features}};
        }
#ifdef MOGO_FEATURE_PERSONAL_FINANCE
        if (method.starts_with("finance.")) return financeCommand(*finance, method.substr(8), payload);
#endif
#ifdef MOGO_FEATURE_USER_PROFILE
        if (method.starts_with("profile.")) return profileCommand(*profile, method.substr(8), payload);
#endif
#ifdef MOGO_FEATURE_INVESTMENT_MANAGEMENT
        if (method.starts_with("investment.")) return investmentCommand(*investment, method.substr(11), payload);
#endif
        throw ApplicationError(400, "FEATURE_UNAVAILABLE", "Unknown or disabled native operation");
    }
};
NativeCore::NativeCore(const std::filesystem::path& directory) : impl_(std::make_unique<Impl>(directory)) {}
NativeCore::~NativeCore() = default;
std::string NativeCore::execute(const std::string& method, const std::string& payload) {
    try {
        const auto body = Json::parse(payload);
        if (!body.is_object()) throw ApplicationError(400, "VALIDATION_ERROR", "Expected an object");
        return Json{{"ok", true}, {"data", impl_->dispatch(method, body)}}.dump();
    } catch (const ApplicationError& error) {
        return Json{{"ok", false}, {"code", error.code()}, {"status", error.httpStatus()}}.dump();
    } catch (const Json::exception&) {
        return Json{{"ok", false}, {"code", "VALIDATION_ERROR"}, {"status", 400}}.dump();
    } catch (const std::exception&) {
        return Json{{"ok", false}, {"code", "INTERNAL_ERROR"}, {"status", 500}}.dump();
    }
}
}
