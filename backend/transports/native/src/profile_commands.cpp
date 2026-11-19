#include "commands.hpp"
#include "mogo/contracts/profile_json.hpp"
namespace mogo::native {
nlohmann::json profileCommand(user_profile::ProfileService& service, const std::string& method, const nlohmann::json& body) {
    namespace wire = contracts::profile;
    using Json = nlohmann::json;
    if (method == "getProfile") return wire::profileJson<Json>(service.getProfile());
    if (method == "saveProfile") return wire::profileJson<Json>(service.saveProfile(wire::parseProfile<Json>(body.dump())));
    throw core_shared::ApplicationError(400, "FEATURE_UNAVAILABLE", "Unknown profile operation");
}
}
