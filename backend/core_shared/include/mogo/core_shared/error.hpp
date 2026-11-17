#pragma once

#include <stdexcept>
#include <string>
#include <utility>

namespace mogo::core_shared {

class ApplicationError final : public std::runtime_error {
public:
    ApplicationError(int http_status, std::string code, std::string message)
        : std::runtime_error(std::move(message)), http_status_(http_status), code_(std::move(code)) {}

    [[nodiscard]] int httpStatus() const noexcept { return http_status_; }
    [[nodiscard]] const std::string& code() const noexcept { return code_; }

private:
    int http_status_;
    std::string code_;
};

}  // namespace mogo::core_shared
