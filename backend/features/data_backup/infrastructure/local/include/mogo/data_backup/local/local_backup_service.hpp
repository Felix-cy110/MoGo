#pragma once

#include "mogo/data_backup/application/backup_service.hpp"

#include <filesystem>
#include <mutex>

namespace mogo::data_backup {

class LocalBackupService final : public BackupService {
public:
    LocalBackupService(std::filesystem::path database_path, std::filesystem::path profile_path);

    [[nodiscard]] ExportedBackup exportData(const std::string& password) override;
    [[nodiscard]] ImportResult importData(
        const std::string& content,
        const std::string& password,
        ConflictPolicy conflict_policy) override;

private:
    std::filesystem::path database_path_;
    std::filesystem::path profile_path_;
    std::mutex mutex_;
};

}  // namespace mogo::data_backup
