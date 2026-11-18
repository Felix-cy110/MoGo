#include "mogo/user_profile/json/json_profile_repository.hpp"

#include "mogo/core_shared/error.hpp"

#include <nlohmann/json.hpp>

#include <fstream>
#include <system_error>
#include <utility>

namespace mogo::user_profile {
namespace {

using Json = nlohmann::json;
using core_shared::ApplicationError;

template <typename Value>
Json nullable(const std::optional<Value>& value) {
    return value ? Json(*value) : Json(nullptr);
}

std::optional<std::string> readText(const Json& body, const char* field) {
    if (!body.contains(field) || body.at(field).is_null()) return std::nullopt;
    if (!body.at(field).is_string()) throw std::runtime_error("Invalid profile field");
    return body.at(field).get<std::string>();
}

Profile readProfile(const std::filesystem::path& path) {
    if (!std::filesystem::exists(path)) return {};
    std::ifstream input(path, std::ios::binary);
    if (!input) throw std::runtime_error("Cannot open profile");
    const auto body = Json::parse(input);
    if (!body.is_object() || !body.contains("schemaVersion") || !body.at("schemaVersion").is_number_integer()) {
        throw std::runtime_error("Invalid profile format");
    }
    if (body.at("schemaVersion") != 1) {
        throw ApplicationError(500, "PROFILE_VERSION_UNSUPPORTED", "Unsupported profile version");
    }
    std::optional<int> age;
    if (body.contains("age") && !body.at("age").is_null()) {
        if (!body.at("age").is_number_integer() || body.at("age") < 0 || body.at("age") > 150) {
            throw std::runtime_error("Invalid age in profile");
        }
        age = body.at("age").get<int>();
    }
    const auto gender = readText(body, "gender");
    if (gender && *gender != "MALE" && *gender != "FEMALE" && *gender != "OTHER") {
        throw std::runtime_error("Invalid gender in profile");
    }
    return Profile{
        .name = readText(body, "name"), .gender = gender, .age = age,
        .country = readText(body, "country"), .occupation = readText(body, "occupation"),
    };
}

}  // namespace

JsonProfileRepository::JsonProfileRepository(std::filesystem::path path) : path_(std::move(path)) {}

Profile JsonProfileRepository::load() {
    const std::lock_guard lock(mutex_);
    try {
        return readProfile(path_);
    } catch (const ApplicationError&) {
        throw;
    } catch (const std::exception&) {
        throw ApplicationError(500, "PROFILE_READ_FAILED", "Unable to read local profile");
    }
}

void JsonProfileRepository::save(const Profile& profile) {
    const std::lock_guard lock(mutex_);
    const std::filesystem::path temporary = path_.string() + ".tmp";
    try {
        // Never replace corrupt or newer-version data with an apparently empty profile.
        readProfile(path_);
        if (!path_.parent_path().empty()) std::filesystem::create_directories(path_.parent_path());
        const Json body = {
            {"schemaVersion", 1}, {"name", nullable(profile.name)}, {"gender", nullable(profile.gender)},
            {"age", nullable(profile.age)}, {"country", nullable(profile.country)},
            {"occupation", nullable(profile.occupation)},
        };
        {
            std::ofstream output(temporary, std::ios::binary | std::ios::trunc);
            if (!output) throw std::runtime_error("Cannot create temporary profile");
            std::filesystem::permissions(temporary, std::filesystem::perms::owner_read |
                std::filesystem::perms::owner_write, std::filesystem::perm_options::replace);
            output << body.dump(2) << '\n';
            output.flush();
            if (!output) throw std::runtime_error("Cannot write profile");
            output.close();
            if (!output) throw std::runtime_error("Cannot close profile");
        }
        // The temporary file lives alongside the original, so rename replaces it atomically.
        std::filesystem::rename(temporary, path_);
    } catch (const ApplicationError&) {
        throw;
    } catch (const std::exception&) {
        std::error_code ignored;
        std::filesystem::remove(temporary, ignored);
        throw ApplicationError(500, "PROFILE_WRITE_FAILED", "Unable to save local profile");
    }
}

}  // namespace mogo::user_profile
