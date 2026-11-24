#include <algorithm>
#include "mogo/native/native_core.hpp"
#include <nlohmann/json.hpp>
#include <chrono>
#include <filesystem>
#include <iostream>
#include <stdexcept>

using Json = nlohmann::json;
void check(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}
struct TemporaryData {
    std::filesystem::path path = std::filesystem::temp_directory_path() /
        ("mogo-native-test-" + std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));
    ~TemporaryData() { std::error_code error; std::filesystem::remove_all(path, error); }
};
Json call(mogo::native::NativeCore& core, const std::string& method, const Json& payload = Json::object()) {
    auto response = Json::parse(core.execute(method, payload.dump()));
    if (!response.at("ok").get<bool>()) throw std::runtime_error(response.dump());
    return response.at("data");
}
void rejects(mogo::native::NativeCore& core, const std::string& method, const Json& payload, const char* code) {
    const auto response = Json::parse(core.execute(method, payload.dump()));
    check(!response.at("ok").get<bool>() && response.at("code") == code, "Expected stable error code");
}
int main() {
    try {
        TemporaryData directory;
        std::int64_t custom_id;
        {
            mogo::native::NativeCore core(directory.path);
            const auto capabilities = call(core, "capabilities").at("features");
            check(std::find(capabilities.begin(), capabilities.end(), "personal-finance") != capabilities.end(), "Finance capability");
            check(std::find(capabilities.begin(), capabilities.end(), "user-profile") != capabilities.end(), "Profile capability");
            const auto categories = call(core, "finance.getCategories");
            check(categories.size() == 4, "Seed categories");
            std::int64_t other_id = 0;
            for (const auto& category : categories) if (category.at("code") == "OTHER") other_id = category.at("id");
            rejects(core, "finance.updateCategory", {{"id", other_id}, {"name", "test"}}, "CATEGORY_PROTECTED");
            rejects(core, "finance.deleteCategory", {{"id", other_id}}, "CATEGORY_PROTECTED");
            custom_id = call(core, "finance.addCategory", {{"name", "咖啡☕"}}).at("id");
            rejects(core, "finance.addCategory", {{"name", "咖啡☕"}}, "CATEGORY_NAME_EXISTS");
            check(call(core, "finance.searchCategories", {{"query", "咖"}}).size() == 1, "Fuzzy search");
            call(core, "finance.saveBudget", {{"date", "2026-11-19"}, {"amountCents", 10000}});
            rejects(core, "finance.addExpense", {{"date", "2026-11-19"}, {"amountCents", 100}, {"categoryId", other_id}}, "NOTE_REQUIRED");
            auto expense = call(core, "finance.addExpense", {{"date", "2026-11-19"}, {"amountCents", 8100}, {"categoryId", custom_id}, {"clientRequestId", "native-1"}});
            check(expense.at("alerts").size() == 1, "80 percent alert");
            call(core, "finance.addExpense", {{"date", "2026-11-19"}, {"amountCents", 8100}, {"categoryId", custom_id}, {"clientRequestId", "native-1"}});
            check(call(core, "finance.getDashboard", {{"date", "2026-11-19"}}).at("expenseCount") == 1, "Idempotent insert");
            auto edited = call(core, "finance.updateExpense", {{"id", expense.at("expense").at("id")}, {"amountCents", 10100}, {"categoryId", custom_id}, {"note", "线下消费 🐶"}});
            check(edited.at("alerts").size() >= 1, "Over-budget edit alert");
            call(core, "finance.deleteCategory", {{"id", custom_id}});
            const auto dashboard = call(core, "finance.getDashboard", {{"date", "2026-11-19"}});
            check(dashboard.at("expenses")[0].at("categoryName") == "咖啡☕", "Historical category preserved");
            check(call(core, "finance.getAnalytics", {{"startDate", "2026-11-01"}, {"endDate", "2026-11-19"}}).at("totalAmountCents") == 10100, "Analytics contract");
            call(core, "profile.saveProfile", {{"name", "离线用户🐶"}, {"monthlyIncomeCents", 123456}});
            rejects(core, "profile.saveProfile", {{"monthlyIncomeCents", -1}}, "PROFILE_MONTHLY_INCOME_INVALID");
            rejects(core, "finance.saveBudget", {{"date", "2026-11-19"}, {"amountCents", 1.5}}, "VALIDATION_ERROR");
            rejects(core, "unknown", Json::object(), "FEATURE_UNAVAILABLE");
            check(Json::parse(core.execute("profile.saveProfile", "not json")).at("code") == "VALIDATION_ERROR", "Malformed payload");
        }
        check(std::filesystem::exists(directory.path / "user-profile.json"), "Separate profile JSON file");
        {
            mogo::native::NativeCore reopened(directory.path);
            const auto profile = call(reopened, "profile.getProfile");
            check(profile.at("name") == "离线用户🐶" && profile.at("monthlyIncomeCents") == 123456, "Profile persistence");
            check(call(reopened, "finance.getDashboard", {{"date", "2026-11-19"}}).at("totalAmountCents") == 10100, "SQLite persistence");
            call(reopened, "profile.saveProfile");
            check(call(reopened, "profile.getProfile").at("monthlyIncomeCents").is_null(), "Optional profile can be cleared");
        }
        std::cout << "Native offline contract tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n'; return 1;
    }
}
