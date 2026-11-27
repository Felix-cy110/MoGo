#include "mogo/data_backup/local/local_backup_service.hpp"

#include "mogo/core_shared/error.hpp"

#include <monocypher.h>
#include <nlohmann/json.hpp>
#include <sqlite3.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <iomanip>
#include <limits>
#include <memory>
#include <optional>
#include <span>
#include <sstream>
#include <stdexcept>
#include <string_view>
#include <system_error>
#include <utility>
#include <vector>

namespace mogo::data_backup {
namespace {

using Bytes = std::vector<std::uint8_t>;
using core_shared::ApplicationError;

constexpr std::string_view kArmorHeader = "MOGO-BACKUP/1\n";
constexpr std::array<std::uint8_t, 8> kEncryptedMagic{'M', 'O', 'G', 'O', 'B', 'K', 'P', '1'};
constexpr std::array<std::uint8_t, 8> kPayloadMagic{'M', 'O', 'G', 'O', 'D', 'A', 'T', '1'};
constexpr std::uint32_t kFormatVersion = 1;
constexpr std::size_t kSaltSize = 16;
constexpr std::size_t kNonceSize = 24;
constexpr std::size_t kMacSize = 16;
constexpr std::size_t kEncryptedEnvelopeSize = kEncryptedMagic.size() + sizeof(std::uint32_t) +
    kSaltSize + kNonceSize + sizeof(std::uint64_t) + kMacSize;
constexpr std::uint32_t kArgonBlocks = 19 * 1024;
constexpr std::uint32_t kArgonPasses = 2;
constexpr std::size_t kMaxBackupBytes = 256ULL * 1024ULL * 1024ULL;
constexpr std::string_view kDatabaseName = "mogo.db";
constexpr std::string_view kProfileName = "user-profile.json";

struct Entry {
    std::string name;
    Bytes data;
};

class TemporaryDirectory final {
public:
    explicit TemporaryDirectory(const std::filesystem::path& parent) {
        std::filesystem::create_directories(parent);
        for (int attempt = 0; attempt < 16; ++attempt) {
            std::array<std::uint8_t, 8> suffix{};
            std::ifstream random("/dev/urandom", std::ios::binary);
            if (!random.read(reinterpret_cast<char*>(suffix.data()), suffix.size())) {
                throw std::runtime_error("Secure random source is unavailable");
            }
            std::ostringstream name;
            name << ".mogo-backup-";
            for (const auto byte : suffix) name << std::hex << std::setw(2) << std::setfill('0') << +byte;
            path_ = parent / name.str();
            std::error_code error;
            if (std::filesystem::create_directory(path_, error)) return;
        }
        throw std::runtime_error("Unable to create backup workspace");
    }

    ~TemporaryDirectory() {
        std::error_code ignored;
        std::filesystem::remove_all(path_, ignored);
    }

    [[nodiscard]] const std::filesystem::path& path() const noexcept { return path_; }

private:
    std::filesystem::path path_;
};

void appendU16(Bytes& output, std::uint16_t value) {
    output.push_back(static_cast<std::uint8_t>(value));
    output.push_back(static_cast<std::uint8_t>(value >> 8));
}

void appendU32(Bytes& output, std::uint32_t value) {
    for (int shift = 0; shift < 32; shift += 8) output.push_back(static_cast<std::uint8_t>(value >> shift));
}

void appendU64(Bytes& output, std::uint64_t value) {
    for (int shift = 0; shift < 64; shift += 8) output.push_back(static_cast<std::uint8_t>(value >> shift));
}

template <typename Value>
Value readInteger(std::span<const std::uint8_t> input, std::size_t& offset) {
    if (input.size() - std::min(input.size(), offset) < sizeof(Value)) throw std::runtime_error("Truncated backup");
    Value value{};
    for (std::size_t index = 0; index < sizeof(Value); ++index) {
        value |= static_cast<Value>(input[offset++]) << (index * 8);
    }
    return value;
}

void appendBytes(Bytes& output, std::span<const std::uint8_t> value) {
    output.insert(output.end(), value.begin(), value.end());
}

Bytes readFile(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary | std::ios::ate);
    if (!input) throw std::runtime_error("Unable to open local data file");
    const auto size = input.tellg();
    if (size < 0 || static_cast<std::uint64_t>(size) > kMaxBackupBytes) {
        throw std::runtime_error("Local data file is too large");
    }
    Bytes result(static_cast<std::size_t>(size));
    input.seekg(0);
    if (!result.empty() && !input.read(reinterpret_cast<char*>(result.data()), size)) {
        throw std::runtime_error("Unable to read local data file");
    }
    return result;
}

void writeFileAtomically(const std::filesystem::path& path, std::span<const std::uint8_t> data) {
    if (!path.parent_path().empty()) std::filesystem::create_directories(path.parent_path());
    const auto temporary = path.string() + ".backup-import.tmp";
    try {
        {
            std::ofstream output(temporary, std::ios::binary | std::ios::trunc);
            if (!output) throw std::runtime_error("Unable to create local data file");
            if (!data.empty()) output.write(reinterpret_cast<const char*>(data.data()), data.size());
            output.flush();
            if (!output) throw std::runtime_error("Unable to write local data file");
        }
        std::filesystem::permissions(temporary, std::filesystem::perms::owner_read |
            std::filesystem::perms::owner_write, std::filesystem::perm_options::replace);
        // All supported platforms replace a destination in the same directory atomically.
        std::filesystem::rename(temporary, path);
    } catch (...) {
        std::error_code ignored;
        std::filesystem::remove(temporary, ignored);
        throw;
    }
}

void sqliteBackup(const std::filesystem::path& source_path, const std::filesystem::path& destination_path) {
    sqlite3* source = nullptr;
    sqlite3* destination = nullptr;
    sqlite3_backup* backup = nullptr;
    auto close = [&] {
        if (backup) sqlite3_backup_finish(backup);
        if (destination) sqlite3_close(destination);
        if (source) sqlite3_close(source);
    };
    if (sqlite3_open_v2(source_path.string().c_str(), &source, SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX, nullptr) != SQLITE_OK ||
        sqlite3_open_v2(destination_path.string().c_str(), &destination,
                        SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nullptr) != SQLITE_OK) {
        close();
        throw std::runtime_error("Unable to open SQLite backup");
    }
    backup = sqlite3_backup_init(destination, "main", source, "main");
    if (!backup) {
        close();
        throw std::runtime_error("Unable to initialize SQLite backup");
    }
    const int step = sqlite3_backup_step(backup, -1);
    const int finish = sqlite3_backup_finish(backup);
    backup = nullptr;
    const int destination_error = sqlite3_errcode(destination);
    close();
    if (step != SQLITE_DONE || finish != SQLITE_OK || destination_error != SQLITE_OK) {
        throw std::runtime_error("Unable to complete SQLite backup");
    }
}

void validateDatabase(const std::filesystem::path& path) {
    sqlite3* database = nullptr;
    if (sqlite3_open_v2(path.string().c_str(), &database, SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX, nullptr) != SQLITE_OK) {
        if (database) sqlite3_close(database);
        throw std::runtime_error("Invalid SQLite backup");
    }
    sqlite3_stmt* statement = nullptr;
    const bool has_result = sqlite3_prepare_v2(database, "PRAGMA quick_check", -1, &statement, nullptr) == SQLITE_OK &&
        sqlite3_step(statement) == SQLITE_ROW;
    const auto* result = has_result ? sqlite3_column_text(statement, 0) : nullptr;
    const bool valid = result && std::string_view(reinterpret_cast<const char*>(result)) == "ok";
    if (statement) sqlite3_finalize(statement);
    sqlite3_close(database);
    if (!valid) throw std::runtime_error("Invalid SQLite backup");
}

void validateProfile(std::span<const std::uint8_t> data) {
    const auto body = nlohmann::json::parse(data.begin(), data.end());
    if (!body.is_object() || body.value("schemaVersion", 0) != 1) {
        throw std::runtime_error("Invalid profile backup");
    }
}

Bytes packEntries(const std::vector<Entry>& entries) {
    if (entries.size() > std::numeric_limits<std::uint32_t>::max()) {
        throw std::runtime_error("Too many backup entries");
    }
    std::size_t payload_size = kPayloadMagic.size() + sizeof(std::uint32_t) * 2;
    const auto include_size = [&](std::size_t size) {
        if (size > kMaxBackupBytes - payload_size) throw std::runtime_error("Backup payload is too large");
        payload_size += size;
    };
    for (const auto& entry : entries) {
        if (entry.name.size() > std::numeric_limits<std::uint16_t>::max()) throw std::runtime_error("Invalid entry name");
        include_size(sizeof(std::uint16_t));
        include_size(entry.name.size());
        include_size(sizeof(std::uint64_t));
        include_size(entry.data.size());
    }

    Bytes output;
    output.reserve(payload_size);
    appendBytes(output, kPayloadMagic);
    appendU32(output, kFormatVersion);
    appendU32(output, static_cast<std::uint32_t>(entries.size()));
    for (const auto& entry : entries) {
        appendU16(output, static_cast<std::uint16_t>(entry.name.size()));
        appendBytes(output, std::span(reinterpret_cast<const std::uint8_t*>(entry.name.data()), entry.name.size()));
        appendU64(output, entry.data.size());
        appendBytes(output, entry.data);
    }
    return output;
}

std::vector<Entry> unpackEntries(std::span<const std::uint8_t> input) {
    if (input.size() > kMaxBackupBytes || input.size() < kPayloadMagic.size() ||
        !std::equal(kPayloadMagic.begin(), kPayloadMagic.end(), input.begin())) {
        throw std::runtime_error("Invalid backup payload");
    }
    std::size_t offset = kPayloadMagic.size();
    if (readInteger<std::uint32_t>(input, offset) != kFormatVersion) throw std::runtime_error("Unsupported backup version");
    const auto count = readInteger<std::uint32_t>(input, offset);
    if (count == 0 || count > 32) throw std::runtime_error("Invalid backup entry count");
    std::vector<Entry> entries;
    for (std::uint32_t index = 0; index < count; ++index) {
        const auto name_size = readInteger<std::uint16_t>(input, offset);
        if (name_size == 0 || name_size > input.size() - std::min(input.size(), offset)) throw std::runtime_error("Invalid backup entry");
        std::string name(reinterpret_cast<const char*>(input.data() + offset), name_size);
        offset += name_size;
        const auto data_size = readInteger<std::uint64_t>(input, offset);
        if (data_size > input.size() - std::min(input.size(), offset)) throw std::runtime_error("Invalid backup entry");
        if (name != kDatabaseName && name != kProfileName) throw std::runtime_error("Unknown backup entry");
        if (std::any_of(entries.begin(), entries.end(), [&](const Entry& entry) { return entry.name == name; })) {
            throw std::runtime_error("Duplicate backup entry");
        }
        Bytes data(static_cast<std::size_t>(data_size));
        std::copy_n(input.begin() + static_cast<std::ptrdiff_t>(offset), data.size(), data.begin());
        offset += data.size();
        entries.push_back({std::move(name), std::move(data)});
    }
    if (offset != input.size()) throw std::runtime_error("Trailing backup data");
    return entries;
}

constexpr char kBase64Alphabet[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

std::string base64Encode(std::span<const std::uint8_t> input) {
    std::string output;
    output.reserve((input.size() + 2) / 3 * 4);
    for (std::size_t offset = 0; offset < input.size(); offset += 3) {
        const std::uint32_t value = static_cast<std::uint32_t>(input[offset]) << 16 |
            (offset + 1 < input.size() ? static_cast<std::uint32_t>(input[offset + 1]) << 8 : 0) |
            (offset + 2 < input.size() ? input[offset + 2] : 0);
        output.push_back(kBase64Alphabet[(value >> 18) & 63]);
        output.push_back(kBase64Alphabet[(value >> 12) & 63]);
        output.push_back(offset + 1 < input.size() ? kBase64Alphabet[(value >> 6) & 63] : '=');
        output.push_back(offset + 2 < input.size() ? kBase64Alphabet[value & 63] : '=');
    }
    return output;
}

Bytes base64Decode(std::string_view input) {
    constexpr std::size_t max_encoded_size = ((kMaxBackupBytes + kEncryptedEnvelopeSize + 2) / 3) * 4;
    if (input.empty() || input.size() % 4 != 0 || input.size() > max_encoded_size) {
        throw std::runtime_error("Invalid backup encoding");
    }
    std::array<int, 256> values{};
    values.fill(-1);
    for (int index = 0; index < 64; ++index) values[static_cast<unsigned char>(kBase64Alphabet[index])] = index;
    Bytes output;
    output.reserve(input.size() / 4 * 3);
    for (std::size_t offset = 0; offset < input.size(); offset += 4) {
        std::uint32_t value = 0;
        int padding = 0;
        for (int index = 0; index < 4; ++index) {
            const char character = input[offset + index];
            if (character == '=') {
                if (index < 2 || offset + 4 != input.size()) throw std::runtime_error("Invalid backup encoding");
                ++padding;
                value <<= 6;
            } else {
                if (padding || values[static_cast<unsigned char>(character)] < 0) throw std::runtime_error("Invalid backup encoding");
                value = (value << 6) | static_cast<std::uint32_t>(values[static_cast<unsigned char>(character)]);
            }
        }
        output.push_back(static_cast<std::uint8_t>(value >> 16));
        if (padding < 2) output.push_back(static_cast<std::uint8_t>(value >> 8));
        if (padding < 1) output.push_back(static_cast<std::uint8_t>(value));
    }
    return output;
}

void secureRandom(std::span<std::uint8_t> output) {
    std::ifstream input("/dev/urandom", std::ios::binary);
    if (!input.read(reinterpret_cast<char*>(output.data()), output.size())) {
        throw std::runtime_error("Secure random source is unavailable");
    }
}

std::array<std::uint8_t, 32> deriveKey(const std::string& password, std::span<const std::uint8_t> salt) {
    std::array<std::uint8_t, 32> key{};
    Bytes work_area(static_cast<std::size_t>(kArgonBlocks) * 1024);
    crypto_argon2(key.data(), key.size(), work_area.data(),
        {CRYPTO_ARGON2_ID, kArgonBlocks, kArgonPasses, 1},
        {reinterpret_cast<const std::uint8_t*>(password.data()), salt.data(),
         static_cast<std::uint32_t>(password.size()), static_cast<std::uint32_t>(salt.size())},
        crypto_argon2_no_extras);
    crypto_wipe(work_area.data(), work_area.size());
    return key;
}

std::string encryptPayload(std::span<const std::uint8_t> plaintext, const std::string& password) {
    std::array<std::uint8_t, kSaltSize> salt{};
    std::array<std::uint8_t, kNonceSize> nonce{};
    std::array<std::uint8_t, kMacSize> mac{};
    secureRandom(salt);
    secureRandom(nonce);
    auto key = deriveKey(password, salt);
    Bytes header;
    appendBytes(header, kEncryptedMagic);
    appendU32(header, kFormatVersion);
    appendBytes(header, salt);
    appendBytes(header, nonce);
    appendU64(header, plaintext.size());
    Bytes ciphertext(plaintext.size());
    crypto_aead_lock(ciphertext.data(), mac.data(), key.data(), nonce.data(),
                     header.data(), header.size(), plaintext.data(), plaintext.size());
    crypto_wipe(key.data(), key.size());
    Bytes binary = header;
    appendBytes(binary, mac);
    appendBytes(binary, ciphertext);
    return std::string(kArmorHeader) + base64Encode(binary);
}

Bytes decryptPayload(const std::string& content, const std::string& password) {
    if (!content.starts_with(kArmorHeader)) throw std::runtime_error("Invalid backup header");
    const auto binary = base64Decode(std::string_view(content).substr(kArmorHeader.size()));
    constexpr std::size_t fixed_header = kEncryptedMagic.size() + 4 + kSaltSize + kNonceSize + 8;
    if (binary.size() < fixed_header + kMacSize || !std::equal(kEncryptedMagic.begin(), kEncryptedMagic.end(), binary.begin())) {
        throw std::runtime_error("Invalid encrypted backup");
    }
    std::size_t offset = kEncryptedMagic.size();
    if (readInteger<std::uint32_t>(binary, offset) != kFormatVersion) throw std::runtime_error("Unsupported backup version");
    const auto salt = std::span(binary).subspan(offset, kSaltSize);
    offset += kSaltSize;
    const auto nonce = std::span(binary).subspan(offset, kNonceSize);
    offset += kNonceSize;
    const auto plaintext_size = readInteger<std::uint64_t>(binary, offset);
    if (plaintext_size > kMaxBackupBytes || binary.size() != fixed_header + kMacSize + plaintext_size) {
        throw std::runtime_error("Invalid encrypted backup size");
    }
    const auto mac = std::span(binary).subspan(offset, kMacSize);
    offset += kMacSize;
    const auto ciphertext = std::span(binary).subspan(offset);
    auto key = deriveKey(password, salt);
    Bytes plaintext(static_cast<std::size_t>(plaintext_size));
    const int failed = crypto_aead_unlock(plaintext.data(), mac.data(), key.data(), nonce.data(),
        binary.data(), fixed_header, ciphertext.data(), ciphertext.size());
    crypto_wipe(key.data(), key.size());
    if (failed != 0) throw std::runtime_error("Unable to authenticate backup");
    return plaintext;
}

void validatePassword(const std::string& password) {
    if (password.size() < 8 || password.size() > 1024) {
        throw ApplicationError(400, "BACKUP_PASSWORD_INVALID", "Backup password must contain at least 8 characters");
    }
}

std::string backupFileName() {
    const auto now = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
    std::tm local{};
#if defined(_WIN32)
    localtime_s(&local, &now);
#else
    localtime_r(&now, &local);
#endif
    std::ostringstream output;
    output << "mogo-backup-" << std::put_time(&local, "%Y%m%d-%H%M%S") << ".mogo";
    return output.str();
}

const Entry* findEntry(const std::vector<Entry>& entries, std::string_view name) {
    const auto result = std::find_if(entries.begin(), entries.end(),
        [&](const Entry& entry) { return entry.name == name; });
    return result == entries.end() ? nullptr : &*result;
}

}  // namespace

LocalBackupService::LocalBackupService(std::filesystem::path database_path, std::filesystem::path profile_path)
    : database_path_(std::move(database_path)), profile_path_(std::move(profile_path)) {}

ExportedBackup LocalBackupService::exportData(const std::string& password) {
    validatePassword(password);
    const std::lock_guard lock(mutex_);
    try {
        const TemporaryDirectory temporary(database_path_.parent_path().empty() ? "." : database_path_.parent_path());
        const auto snapshot = temporary.path() / "mogo.db";
        sqliteBackup(database_path_, snapshot);
        std::vector<Entry> entries{{std::string(kDatabaseName), readFile(snapshot)}};
        if (std::filesystem::exists(profile_path_)) {
            auto profile = readFile(profile_path_);
            validateProfile(profile);
            entries.push_back({std::string(kProfileName), std::move(profile)});
        }
        auto payload = packEntries(entries);
        auto content = encryptPayload(payload, password);
        crypto_wipe(payload.data(), payload.size());
        return {.file_name = backupFileName(), .content = std::move(content)};
    } catch (const ApplicationError&) {
        throw;
    } catch (const std::exception&) {
        throw ApplicationError(500, "BACKUP_EXPORT_FAILED", "Unable to export local data");
    }
}

ImportResult LocalBackupService::importData(
    const std::string& content,
    const std::string& password,
    ConflictPolicy conflict_policy) {
    validatePassword(password);
    const std::lock_guard lock(mutex_);
    Bytes payload;
    std::vector<Entry> entries;
    try {
        payload = decryptPayload(content, password);
    } catch (const std::exception&) {
        throw ApplicationError(400, "BACKUP_DECRYPT_FAILED", "Password is incorrect or backup is damaged");
    }
    try {
        entries = unpackEntries(payload);
        crypto_wipe(payload.data(), payload.size());
    } catch (const std::exception&) {
        crypto_wipe(payload.data(), payload.size());
        throw ApplicationError(400, "BACKUP_INVALID", "Backup structure is invalid");
    }

    const Entry* database = findEntry(entries, kDatabaseName);
    const Entry* profile = findEntry(entries, kProfileName);
    if (!database) throw ApplicationError(400, "BACKUP_INVALID", "Backup does not contain a database");

    try {
        const TemporaryDirectory temporary(database_path_.parent_path().empty() ? "." : database_path_.parent_path());
        const auto imported_database = temporary.path() / "imported.db";
        writeFileAtomically(imported_database, database->data);
        try {
            validateDatabase(imported_database);
            if (profile) validateProfile(profile->data);
        } catch (const std::exception&) {
            throw ApplicationError(400, "BACKUP_INVALID", "Backup data is invalid");
        }

        const bool replace_database = conflict_policy == ConflictPolicy::overwrite || !std::filesystem::exists(database_path_);
        const bool replace_profile = profile &&
            (conflict_policy == ConflictPolicy::overwrite || !std::filesystem::exists(profile_path_));
        if (!replace_database && !replace_profile) return {};

        const auto rollback_database = temporary.path() / "rollback.db";
        const bool had_database = std::filesystem::exists(database_path_);
        const bool had_profile = std::filesystem::exists(profile_path_);
        std::optional<Bytes> rollback_profile;
        if (replace_database && had_database) sqliteBackup(database_path_, rollback_database);
        if (replace_profile && had_profile) rollback_profile = readFile(profile_path_);

        try {
            if (replace_database) sqliteBackup(imported_database, database_path_);
            if (replace_profile) writeFileAtomically(profile_path_, profile->data);
            else if (conflict_policy == ConflictPolicy::overwrite && !profile && had_profile) {
                std::filesystem::remove(profile_path_);
            }
        } catch (...) {
            if (replace_database) {
                if (had_database) sqliteBackup(rollback_database, database_path_);
                else {
                    std::error_code ignored;
                    std::filesystem::remove(database_path_, ignored);
                }
            }
            if (replace_profile) {
                if (rollback_profile) writeFileAtomically(profile_path_, *rollback_profile);
                else {
                    std::error_code ignored;
                    std::filesystem::remove(profile_path_, ignored);
                }
            }
            throw;
        }
        return {.database_imported = replace_database, .profile_imported = replace_profile};
    } catch (const ApplicationError&) {
        throw;
    } catch (const std::exception&) {
        throw ApplicationError(500, "BACKUP_RESTORE_FAILED", "Unable to restore local data");
    }
}

}  // namespace mogo::data_backup
