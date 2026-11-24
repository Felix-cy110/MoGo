#include "mogo/investment/sqlite/sqlite_repository.hpp"
#include "migration.hpp"
namespace mogo::investment {
SqliteInvestmentRepository::SqliteInvestmentRepository(const std::string& path) : database_(path) {
    transaction([&] { database_.execute(initialSchema); });
}
void SqliteInvestmentRepository::transaction(const std::function<void()>& action) {
    // Serialize read/validate/write even when another process opens the same local database.
    database_.execute("BEGIN IMMEDIATE");
    try { action(); database_.execute("COMMIT"); }
    catch (...) {
        try { database_.execute("ROLLBACK"); } catch (...) { /* Preserve the original storage failure. */ }
        throw;
    }
}
}
