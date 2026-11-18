#include "mogo/core_shared/error.hpp"
#include "mogo/user_profile/application/profile_service.hpp"
#include "mogo/user_profile/json/json_profile_repository.hpp"

#include <chrono>
#include <filesystem>
#include <fstream>
#include <functional>
#include <iostream>
#include <stdexcept>
#include <thread>
#include <vector>

namespace {

using namespace mogo::user_profile;
using mogo::core_shared::ApplicationError;

class TemporaryProfile final {
public:
    TemporaryProfile() {
        directory_ = std::filesystem::temp_directory_path() /
            ("mogo-profile-" + std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));
        std::filesystem::create_directories(directory_);
    }
    ~TemporaryProfile() {
        std::error_code ignored;
        std::filesystem::remove_all(directory_, ignored);
    }
    [[nodiscard]] std::filesystem::path path() const { return directory_ / "nested" / "user-profile.json"; }

private:
    std::filesystem::path directory_;
};

void require(bool condition, const std::string& message) {
    if (!condition) throw std::runtime_error(message);
}

template <typename Action>
void requireError(const std::string& code, Action action) {
    try { action(); }
    catch (const ApplicationError& error) {
        require(error.code() == code, "expected " + code + ", got " + error.code());
        return;
    }
    throw std::runtime_error("expected " + code);
}

std::string readFile(const std::filesystem::path& path) {
    std::ifstream input(path);
    return {std::istreambuf_iterator<char>(input), std::istreambuf_iterator<char>()};
}

void writeFixture(const std::filesystem::path& path, const std::string& contents) {
    std::filesystem::create_directories(path.parent_path());
    std::ofstream output(path);
    output << contents;
}

void testOptionalAndPersistence() {
    TemporaryProfile file;
    JsonProfileRepository repository(file.path());
    ProfileService service(repository);
    const auto empty = service.getProfile();
    require(!empty.name && !empty.gender && !empty.age && !empty.country && !empty.occupation, "missing file must yield empty profile");
    require(!std::filesystem::exists(file.path()), "loading must not create a file");
    service.saveProfile(Profile{});
    const auto full = service.saveProfile(Profile{
        .name = "  小明  ", .gender = "OTHER", .age = 0, .country = " 中国 ", .occupation = " 工程师 ",
    });
    require(full.name == "小明" && full.country == "中国" && full.occupation == "工程师", "trim text");
    require(full.age == 0, "zero age must not become null");
    {
        JsonProfileRepository reopened(file.path());
        const auto restored = reopened.load();
        require(restored.name == full.name && restored.age == 0 && restored.gender == "OTHER", "persist across repository instances");
    }
    const auto text = readFile(file.path());
    require(text.find("\"schemaVersion\": 1") != std::string::npos, "file needs schema version");
    require(text.find("小明") != std::string::npos, "preserve readable unicode");
    require(!std::filesystem::exists(file.path().string() + ".tmp"), "temporary file must be renamed");
    const auto permissions = std::filesystem::status(file.path()).permissions();
    require((permissions & std::filesystem::perms::group_read) == std::filesystem::perms::none, "private profile must not be group-readable");
    const auto cleared = service.saveProfile(Profile{.name = " \t\n", .country = "", .occupation = " "});
    require(!cleared.name && !cleared.gender && !cleared.age && !cleared.country && !cleared.occupation, "all fields can be cleared");
    require(!service.getProfile().name, "clearing must persist");
}

void testValidation() {
    TemporaryProfile file;
    JsonProfileRepository repository(file.path());
    ProfileService service(repository);
    service.saveProfile(Profile{.name = "Original"});
    const auto original = readFile(file.path());
    for (int age : {-1, 151}) {
        requireError("PROFILE_AGE_INVALID", [&] { service.saveProfile(Profile{.age = age}); });
    }
    requireError("PROFILE_GENDER_INVALID", [&] { service.saveProfile(Profile{.gender = "invalid"}); });
    requireError("PROFILE_TEXT_TOO_LONG", [&] { service.saveProfile(Profile{.name = std::string(101, 'a')}); });
    require(readFile(file.path()) == original, "invalid input must leave file unchanged");
    service.saveProfile(Profile{.age = 150});
}

void testCorruptAndFutureFiles() {
    TemporaryProfile file;
    for (const auto& text : {std::string("{broken"), std::string("[]"),
                            std::string("{\"schemaVersion\":1,\"age\":1.5}"),
                            std::string("{\"schemaVersion\":1,\"name\":123}")}) {
        writeFixture(file.path(), text);
        JsonProfileRepository repository(file.path());
        requireError("PROFILE_READ_FAILED", [&] { (void)repository.load(); });
        requireError("PROFILE_WRITE_FAILED", [&] { repository.save(Profile{}); });
        require(readFile(file.path()) == text, "corrupt data must not be replaced");
    }
    const std::string future = "{\"schemaVersion\":2,\"name\":\"Future\"}";
    writeFixture(file.path(), future);
    JsonProfileRepository repository(file.path());
    requireError("PROFILE_VERSION_UNSUPPORTED", [&] { (void)repository.load(); });
    requireError("PROFILE_VERSION_UNSUPPORTED", [&] { repository.save(Profile{}); });
    require(readFile(file.path()) == future, "unsupported version must not be replaced");
    writeFixture(file.path(), "{\"schemaVersion\":1,\"name\":\"Partial\",\"futureField\":true}");
    require(repository.load().name == "Partial", "optional missing fields and unknown fields must load");
}

void testFailedWritesAndConcurrentReads() {
    TemporaryProfile file;
    JsonProfileRepository repository(file.path());
    repository.save(Profile{.name = "Original"});
    const auto original = readFile(file.path());
    std::filesystem::create_directory(file.path().string() + ".tmp");
    requireError("PROFILE_WRITE_FAILED", [&] { repository.save(Profile{.name = "Replacement"}); });
    require(readFile(file.path()) == original, "write failure must preserve previous data");
    std::filesystem::remove_all(file.path().string() + ".tmp");
    std::vector<std::thread> threads;
    for (int index = 0; index < 4; ++index) {
        threads.emplace_back([&, index] {
            for (int count = 0; count < 20; ++count) {
                repository.save(Profile{.name = std::to_string(index), .age = count});
                require(repository.load().age.has_value(), "concurrent reads must be complete");
            }
        });
    }
    for (auto& thread : threads) thread.join();
    require(repository.load().age == 19, "final write must remain readable");
}

}  // namespace

int main() {
    const std::vector<std::pair<std::string, std::function<void()>>> tests = {
        {"optional fields and JSON persistence", testOptionalAndPersistence},
        {"profile validation", testValidation},
        {"corrupt and future profile protection", testCorruptAndFutureFiles},
        {"failed writes and concurrent access", testFailedWritesAndConcurrentReads},
    };
    int failures = 0;
    for (const auto& [name, test] : tests) {
        try { test(); std::cout << "[PASS] " << name << '\n'; }
        catch (const std::exception& error) {
            ++failures;
            std::cerr << "[FAIL] " << name << ": " << error.what() << '\n';
        }
    }
    return failures == 0 ? 0 : 1;
}
