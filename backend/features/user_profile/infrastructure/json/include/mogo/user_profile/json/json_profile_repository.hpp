#pragma once

#include "mogo/user_profile/application/profile_repository.hpp"

#include <filesystem>
#include <mutex>

namespace mogo::user_profile {

class JsonProfileRepository final : public ProfileRepository {
public:
    explicit JsonProfileRepository(std::filesystem::path path);
    [[nodiscard]] Profile load() override;
    void save(const Profile& profile) override;

private:
    std::filesystem::path path_;
    std::mutex mutex_;
};

}  // namespace mogo::user_profile
