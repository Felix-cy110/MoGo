#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

namespace mogo::personal_finance {

SqliteFinanceRepository::SqliteFinanceRepository(const std::string& database_path)
    : database_(database_path) {}

void SqliteFinanceRepository::beginTransaction() { database_.execute("BEGIN IMMEDIATE"); }
void SqliteFinanceRepository::commitTransaction() { database_.execute("COMMIT"); }
void SqliteFinanceRepository::rollbackTransaction() noexcept {
    try {
        database_.execute("ROLLBACK");
    } catch (...) {
    }
}

}  // namespace mogo::personal_finance
