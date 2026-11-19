#pragma once
#include <filesystem>
#include <memory>
#include <string>

namespace mogo::native {
// Platform shells supply a private directory and serialize calls on their worker queue.
// No RN, JNI, HTTP or UI types cross this boundary.
class NativeCore final {
public:
    explicit NativeCore(const std::filesystem::path& data_directory);
    ~NativeCore();
    NativeCore(const NativeCore&) = delete;
    NativeCore& operator=(const NativeCore&) = delete;
    std::string execute(const std::string& method, const std::string& payload);
private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};
}
