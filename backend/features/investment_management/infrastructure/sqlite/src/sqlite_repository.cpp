#include "mogo/investment/sqlite/sqlite_repository.hpp"
#include "migration.hpp"
#include "builtin_migration.hpp"
#include "deletable_targets_migration.hpp"
#include "mogo/core_shared/sqlite_statement.hpp"
namespace mogo::investment {
SqliteInvestmentRepository::SqliteInvestmentRepository(const std::string& path) : database_(path) {
    transaction([&] {
        database_.execute(initialSchema);
        bool has_builtin_code = false, has_deleted_at = false;
        {
            core_shared::Statement columns(database_.handle(), "PRAGMA table_info(investment_targets)");
            while (columns.row()) {
                if (columns.text(1) == "builtin_code") has_builtin_code = true;
                if (columns.text(1) == "deleted_at") has_deleted_at = true;
            }
        }
        // The schema check and seeding share the write transaction: reopening or
        // two simultaneous platform initializations must not duplicate defaults.
        if (!has_builtin_code) database_.execute(builtinTargetsMigration);
        if (!has_deleted_at) database_.execute(deletableTargetsMigration);
    });
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
