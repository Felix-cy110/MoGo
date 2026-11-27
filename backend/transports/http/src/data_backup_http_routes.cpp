#include "mogo/http/data_backup_http_routes.hpp"

#include "mogo/core_shared/error.hpp"

#include <functional>

namespace mogo::http {
namespace {

using core_shared::ApplicationError;

std::string requiredString(const hv::Json& body, const char* field) {
    if (!body.contains(field) || !body.at(field).is_string()) {
        throw ApplicationError(400, "VALIDATION_ERROR", "Expected a string field");
    }
    return body.at(field).get<std::string>();
}

int respond(const HttpContextPtr& context, const std::function<hv::Json()>& action) {
    context->response->SetHeader("Cache-Control", "no-store");
    try {
        return context->sendJson(action());
    } catch (const ApplicationError& error) {
        context->response->status_code = static_cast<http_status>(error.httpStatus());
        return context->sendJson(hv::Json{{"code", error.code()}, {"message", error.what()}});
    } catch (const hv::Json::exception&) {
        context->response->status_code = HTTP_STATUS_BAD_REQUEST;
        return context->sendJson(hv::Json{{"code", "VALIDATION_ERROR"}});
    } catch (const std::exception&) {
        context->response->status_code = HTTP_STATUS_INTERNAL_SERVER_ERROR;
        return context->sendJson(hv::Json{{"code", "INTERNAL_ERROR"}});
    }
}

}  // namespace

void DataBackupHttpRoutes::registerRoutes(hv::HttpService& router) {
    router.POST("/api/backup/export", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            const auto body = hv::Json::parse(context->body());
            const auto result = service_.exportData(requiredString(body, "password"));
            return hv::Json{{"fileName", result.file_name}, {"content", result.content}};
        });
    });
    router.POST("/api/backup/import", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            const auto body = hv::Json::parse(context->body());
            const auto policy = requiredString(body, "conflictPolicy");
            if (policy != "OVERWRITE" && policy != "KEEP_EXISTING") {
                throw ApplicationError(400, "VALIDATION_ERROR", "Unknown conflict policy");
            }
            const auto result = service_.importData(
                requiredString(body, "content"), requiredString(body, "password"),
                policy == "OVERWRITE" ? data_backup::ConflictPolicy::overwrite : data_backup::ConflictPolicy::keep_existing);
            return hv::Json{{"databaseImported", result.database_imported}, {"profileImported", result.profile_imported}};
        });
    });
}

}  // namespace mogo::http
