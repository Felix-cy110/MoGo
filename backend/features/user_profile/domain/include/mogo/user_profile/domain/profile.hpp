#pragma once

#include <optional>
#include <cstdint>
#include <string>

namespace mogo::user_profile {

struct Profile {
    std::optional<std::string> name;
    std::optional<std::string> gender;
    std::optional<int> age;
    std::optional<std::string> country;
    std::optional<std::string> occupation;
    std::optional<std::int64_t> monthlyIncomeCents;
};

}  // namespace mogo::user_profile
