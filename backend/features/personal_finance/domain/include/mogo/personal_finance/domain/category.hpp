#pragma once

#include <cstdint>
#include <optional>
#include <string>

namespace mogo::personal_finance {

struct Category {
    std::int64_t id{};
    std::string code;
    std::string name;
    std::optional<std::string> i18n_key;
    std::string note_policy;
    bool active{};
    bool system{};
    int sort_order{};

    [[nodiscard]] bool isProtected() const { return code == "OTHER"; }
    [[nodiscard]] bool requiresNote() const { return note_policy == "REQUIRED"; }
    [[nodiscard]] bool forbidsNote() const { return note_policy == "FORBIDDEN"; }
};

}  // namespace mogo::personal_finance
