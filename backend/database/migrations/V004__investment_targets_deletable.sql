-- BTC and ETH are seeded defaults, not permanent records. Soft deletion hides
-- any target while retaining its trades for local data integrity.
ALTER TABLE investment_targets ADD COLUMN deleted_at TEXT;
DROP INDEX idx_investment_target_name;
CREATE UNIQUE INDEX idx_investment_target_name
ON investment_targets(name COLLATE NOCASE, quote_currency)
WHERE archived_at IS NULL AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS investment_builtin_no_delete;
DROP TRIGGER IF EXISTS investment_builtin_no_replace;
CREATE TRIGGER investment_builtin_no_replace BEFORE INSERT ON investment_targets
WHEN EXISTS (
    SELECT 1 FROM investment_targets
    WHERE builtin_code IS NOT NULL AND deleted_at IS NULL
      AND (id = NEW.id OR builtin_code = NEW.builtin_code
        OR (NEW.archived_at IS NULL AND name = NEW.name COLLATE NOCASE AND quote_currency = NEW.quote_currency))
)
BEGIN
    SELECT RAISE(ABORT, 'INVESTMENT_BUILTIN_PROTECTED');
END;
