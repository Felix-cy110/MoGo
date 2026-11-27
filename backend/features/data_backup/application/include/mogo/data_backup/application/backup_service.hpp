#pragma once

#include <string>

namespace mogo::data_backup {

enum class ConflictPolicy { overwrite, keep_existing };

struct ExportedBackup {
    std::string file_name;
    std::string content;
};

struct ImportResult {
    bool database_imported{};
    bool profile_imported{};
};

class BackupService {
public:
    virtual ~BackupService() = default;
    [[nodiscard]] virtual ExportedBackup exportData(const std::string& password) = 0;
    [[nodiscard]] virtual ImportResult importData(
        const std::string& content,
        const std::string& password,
        ConflictPolicy conflict_policy) = 0;
};

}  // namespace mogo::data_backup
