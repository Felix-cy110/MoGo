#include "mogo/http/user_profile_http_routes.hpp"

#include "mogo/core_shared/error.hpp"
#include "mogo/contracts/profile_json.hpp"

#include <functional>

namespace mogo::http {
namespace {

using core_shared::ApplicationError;
using user_profile::Profile;

int respond(const HttpContextPtr& context, const std::function<Profile()>& action) {
    context->response->SetHeader("Cache-Control", "no-store");
    try {
        return context->sendJson(contracts::profile::profileJson<hv::Json>(action()));
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
        return respond(context, [this, context] { return service_.saveProfile(contracts::profile::parseProfile<hv::Json>(context->body())); });
    });
}

}  // namespace mogo::http
