#pragma once

#include "hv/HttpService.h"
#include "mogo/data_backup/application/backup_service.hpp"

namespace mogo::http {

class DataBackupHttpRoutes final {
public:
    explicit DataBackupHttpRoutes(data_backup::BackupService& service) : service_(service) {}
    void registerRoutes(hv::HttpService& router);

private:
    data_backup::BackupService& service_;
};

}  // namespace mogo::http
