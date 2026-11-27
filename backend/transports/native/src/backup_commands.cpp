#include "commands.hpp"

#include "mogo/core_shared/error.hpp"

namespace mogo::native {
namespace {

using Json = nlohmann::json;
using core_shared::ApplicationError;

std::string requiredString(const Json& payload, const char* field) {
    if (!payload.contains(field) || !payload.at(field).is_string()) {
        throw ApplicationError(400, "VALIDATION_ERROR", "Expected a string field");
    }
    return payload.at(field).get<std::string>();
}

}  // namespace

Json backupCommand(data_backup::BackupService& service, const std::string& command, const Json& payload) {
    if (command == "exportData") {
        const auto exported = service.exportData(requiredString(payload, "password"));
        return {{"fileName", exported.file_name}, {"content", exported.content}};
    }
    if (command == "importData") {
        const auto policy = requiredString(payload, "conflictPolicy");
        if (policy != "OVERWRITE" && policy != "KEEP_EXISTING") {
            throw ApplicationError(400, "VALIDATION_ERROR", "Unknown conflict policy");
        }
        const auto result = service.importData(
            requiredString(payload, "content"), requiredString(payload, "password"),
            policy == "OVERWRITE" ? data_backup::ConflictPolicy::overwrite : data_backup::ConflictPolicy::keep_existing);
        return {{"databaseImported", result.database_imported}, {"profileImported", result.profile_imported}};
    }
    throw ApplicationError(400, "FEATURE_UNAVAILABLE", "Unknown backup operation");
}

}  // namespace mogo::native
