#include "mogo/user_profile/application/profile_service.hpp"

#include "mogo/core_shared/error.hpp"

#include <algorithm>

namespace mogo::user_profile {
namespace {

constexpr std::int64_t kMaximumMonthlyIncomeCents = 99'999'999'999;

std::optional<std::string> normalizeText(const std::optional<std::string>& value) {
    if (!value) return std::nullopt;
    const auto first = value->find_first_not_of(" \t\r\n\f\v");
    if (first == std::string::npos) return std::nullopt;
    const auto last = value->find_last_not_of(" \t\r\n\f\v");
    const auto text = value->substr(first, last - first + 1);
    const auto length = std::count_if(text.begin(), text.end(), [](unsigned char c) {
        return (c & 0xc0) != 0x80;
    });
    if (length > 100) {
        throw core_shared::ApplicationError(400, "PROFILE_TEXT_TOO_LONG", "Profile text exceeds 100 characters");
    }
    return text;
}

}  // namespace

Profile ProfileService::getProfile() {
    return repository_.load();
}

Profile ProfileService::saveProfile(Profile profile) {
    profile.name = normalizeText(profile.name);
    profile.country = normalizeText(profile.country);
    profile.occupation = normalizeText(profile.occupation);
    profile.gender = normalizeText(profile.gender);
    if (profile.gender && *profile.gender != "MALE" && *profile.gender != "FEMALE" && *profile.gender != "OTHER") {
        throw core_shared::ApplicationError(400, "PROFILE_GENDER_INVALID", "Unsupported gender");
    }
    if (profile.age && (*profile.age < 0 || *profile.age > 150)) {
        throw core_shared::ApplicationError(400, "PROFILE_AGE_INVALID", "Age must be an integer between 0 and 150");
    }
    if (profile.monthlyIncomeCents && (*profile.monthlyIncomeCents < 0 || *profile.monthlyIncomeCents > kMaximumMonthlyIncomeCents)) {
        throw core_shared::ApplicationError(400, "PROFILE_MONTHLY_INCOME_INVALID", "Monthly income is outside the supported range");
    }
    repository_.save(profile);
    return profile;
}

}  // namespace mogo::user_profile
