#include "mogo/core_shared/error.hpp"
#include "mogo/data_backup/local/local_backup_service.hpp"

#include <sqlite3.h>

#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>

namespace {

void check(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}

struct TemporaryData {
    std::filesystem::path path = std::filesystem::temp_directory_path() /
        ("mogo-backup-tests-" + std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));
    TemporaryData() { std::filesystem::create_directories(path); }
    ~TemporaryData() {
        std::error_code ignored;
        std::filesystem::remove_all(path, ignored);
    }
};

void execute(const std::filesystem::path& path, const char* sql) {
    sqlite3* database = nullptr;
    if (sqlite3_open(path.string().c_str(), &database) != SQLITE_OK) throw std::runtime_error("Open SQLite failed");
    char* error = nullptr;
    const int result = sqlite3_exec(database, sql, nullptr, nullptr, &error);
    const std::string message = error ? error : "SQLite failed";
    sqlite3_free(error);
    sqlite3_close(database);
    if (result != SQLITE_OK) throw std::runtime_error(message);
}

int value(const std::filesystem::path& path) {
    sqlite3* database = nullptr;
    sqlite3_stmt* statement = nullptr;
    if (sqlite3_open(path.string().c_str(), &database) != SQLITE_OK ||
        sqlite3_prepare_v2(database, "SELECT value FROM backup_test", -1, &statement, nullptr) != SQLITE_OK ||
        sqlite3_step(statement) != SQLITE_ROW) {
        if (statement) sqlite3_finalize(statement);
        if (database) sqlite3_close(database);
        throw std::runtime_error("Read SQLite failed");
    }
    const int result = sqlite3_column_int(statement, 0);
    sqlite3_finalize(statement);
    sqlite3_close(database);
    return result;
}

std::string read(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary);
    return {std::istreambuf_iterator<char>(input), std::istreambuf_iterator<char>()};
}

void write(const std::filesystem::path& path, const std::string& content) {
    std::ofstream(path, std::ios::binary | std::ios::trunc) << content;
}

}  // namespace

int main() {
    try {
        TemporaryData data;
        const auto database = data.path / "mogo.db";
        const auto profile = data.path / "user-profile.json";
        execute(database, "CREATE TABLE backup_test(value INTEGER NOT NULL); INSERT INTO backup_test VALUES(7);");
        write(profile, R"({"schemaVersion":1,"name":"original"})");

        mogo::data_backup::LocalBackupService service(database, profile);
        const auto backup = service.exportData("correct-password");
        check(backup.file_name.ends_with(".mogo"), "Backup extension");
        check(backup.content.starts_with("MOGO-BACKUP/1\n"), "Armored backup header");

        execute(database, "UPDATE backup_test SET value=99;");
        write(profile, R"({"schemaVersion":1,"name":"local"})");
        const auto kept = service.importData(
            backup.content, "correct-password", mogo::data_backup::ConflictPolicy::keep_existing);
        check(!kept.database_imported && !kept.profile_imported, "Keep policy must retain existing files");
        check(value(database) == 99 && read(profile).find("local") != std::string::npos, "Existing data retained");

        std::filesystem::remove(profile);
        const auto filled_missing = service.importData(
            backup.content, "correct-password", mogo::data_backup::ConflictPolicy::keep_existing);
        check(!filled_missing.database_imported && filled_missing.profile_imported, "Keep policy fills missing files only");
        check(value(database) == 99 && read(profile).find("original") != std::string::npos, "Missing profile restored");

        const auto restored = service.importData(
            backup.content, "correct-password", mogo::data_backup::ConflictPolicy::overwrite);
        check(restored.database_imported && restored.profile_imported, "Overwrite import result");
        check(value(database) == 7 && read(profile).find("original") != std::string::npos, "Encrypted backup restored");

        bool wrong_password = false;
        try {
            (void)service.importData(backup.content, "incorrect-password", mogo::data_backup::ConflictPolicy::overwrite);
        } catch (const mogo::core_shared::ApplicationError& error) {
            wrong_password = error.code() == "BACKUP_DECRYPT_FAILED";
        }
        check(wrong_password, "Wrong password rejected");

        auto damaged = backup.content;
        damaged.back() = damaged.back() == 'A' ? 'B' : 'A';
        bool tampering = false;
        try {
            (void)service.importData(damaged, "correct-password", mogo::data_backup::ConflictPolicy::overwrite);
        } catch (const mogo::core_shared::ApplicationError& error) {
            tampering = error.code() == "BACKUP_DECRYPT_FAILED";
        }
        check(tampering, "Tampered backup rejected");
        std::cout << "Encrypted data backup tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
