#pragma once
// Keep synchronized with database/migrations/V003__investment_builtin_targets.sql.
namespace mogo::investment {
inline constexpr auto builtinTargetsMigration = R"SQL(
ALTER TABLE investment_targets ADD COLUMN builtin_code TEXT
    CHECK (builtin_code IS NULL OR (builtin_code IN ('BTC', 'ETH') AND symbol = builtin_code AND archived_at IS NULL));
CREATE UNIQUE INDEX idx_investment_builtin_code ON investment_targets(builtin_code) WHERE builtin_code IS NOT NULL;

-- Reuse one existing target per coin, preferring active targets. Archived targets
-- are restored only when their name is free; all IDs, notes and trades are kept.
UPDATE investment_targets SET builtin_code = 'BTC', symbol = 'BTC', archived_at = NULL
WHERE id = (
    SELECT candidate.id FROM investment_targets candidate
    WHERE upper(candidate.symbol) = 'BTC' AND candidate.quote_currency = 'USDT'
      AND (candidate.archived_at IS NULL OR NOT EXISTS (
          SELECT 1 FROM investment_targets active
          WHERE active.archived_at IS NULL AND active.name = candidate.name COLLATE NOCASE
            AND active.quote_currency = candidate.quote_currency
      ))
    ORDER BY candidate.archived_at IS NOT NULL, candidate.id LIMIT 1
);
UPDATE investment_targets SET builtin_code = 'ETH', symbol = 'ETH', archived_at = NULL
WHERE id = (
    SELECT candidate.id FROM investment_targets candidate
    WHERE upper(candidate.symbol) = 'ETH' AND candidate.quote_currency = 'USDT'
      AND (candidate.archived_at IS NULL OR NOT EXISTS (
          SELECT 1 FROM investment_targets active
          WHERE active.archived_at IS NULL AND active.name = candidate.name COLLATE NOCASE
            AND active.quote_currency = candidate.quote_currency
      ))
    ORDER BY candidate.archived_at IS NOT NULL, candidate.id LIMIT 1
);

-- A user may already use the name BTC/ETH for another coin. Find a free name
-- without renaming that target or merging unrelated trading histories.
WITH RECURSIVE defaults(code) AS (VALUES ('BTC'), ('ETH')),
names(code, name, suffix) AS (
    SELECT code, code, 0 FROM defaults
    WHERE NOT EXISTS (SELECT 1 FROM investment_targets WHERE builtin_code = code)
    UNION ALL
    SELECT code, code || ' (' || (suffix + 1) || ')', suffix + 1 FROM names
    WHERE EXISTS (SELECT 1 FROM investment_targets WHERE archived_at IS NULL AND name = names.name COLLATE NOCASE)
)
INSERT INTO investment_targets(name, symbol, builtin_code, quote_currency, created_at, updated_at)
SELECT name, code, code, 'USDT', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM names WHERE NOT EXISTS (
    SELECT 1 FROM investment_targets WHERE archived_at IS NULL AND name = names.name COLLATE NOCASE
);

CREATE TRIGGER investment_builtin_no_delete BEFORE DELETE ON investment_targets
WHEN OLD.builtin_code IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'INVESTMENT_BUILTIN_PROTECTED');
END;
CREATE TRIGGER investment_builtin_no_replace BEFORE INSERT ON investment_targets
WHEN EXISTS (
    SELECT 1 FROM investment_targets
    WHERE builtin_code IS NOT NULL AND (id = NEW.id OR builtin_code = NEW.builtin_code
        OR (NEW.archived_at IS NULL AND name = NEW.name COLLATE NOCASE AND quote_currency = NEW.quote_currency))
)
BEGIN
    SELECT RAISE(ABORT, 'INVESTMENT_BUILTIN_PROTECTED');
END;
CREATE TRIGGER investment_builtin_identity_locked BEFORE UPDATE ON investment_targets
WHEN OLD.builtin_code IS NOT NULL AND (
    NEW.id <> OLD.id OR NEW.builtin_code IS NOT OLD.builtin_code
    OR NEW.symbol <> OLD.symbol OR NEW.quote_currency <> OLD.quote_currency OR NEW.archived_at IS NOT NULL
)
BEGIN
    SELECT RAISE(ABORT, 'INVESTMENT_BUILTIN_PROTECTED');
END;
)SQL";
}
