#pragma once

#include "hv/HttpService.h"
#include "mogo/user_profile/application/profile_service.hpp"

namespace mogo::http {

class UserProfileHttpRoutes final {
public:
    explicit UserProfileHttpRoutes(user_profile::ProfileService& service) : service_(service) {}
    void registerRoutes(hv::HttpService& router);

private:
    user_profile::ProfileService& service_;
};

}  // namespace mogo::http
