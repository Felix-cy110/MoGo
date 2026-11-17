#pragma once

#include "mogo/user_profile/domain/profile.hpp"

namespace mogo::user_profile {

class ProfileRepository {
public:
    virtual ~ProfileRepository() = default;
    [[nodiscard]] virtual Profile load() = 0;
    virtual void save(const Profile& profile) = 0;
};

}  // namespace mogo::user_profile
