#pragma once

#include "mogo/user_profile/application/profile_repository.hpp"

namespace mogo::user_profile {

class ProfileService final {
public:
    explicit ProfileService(ProfileRepository& repository) : repository_(repository) {}
    [[nodiscard]] Profile getProfile();
    Profile saveProfile(Profile profile);

private:
    ProfileRepository& repository_;
};

}  // namespace mogo::user_profile
