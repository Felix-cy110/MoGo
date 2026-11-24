#pragma once
// Keep synchronized with database/migrations/V002__investment_management_initial.sql.
namespace mogo::investment {
inline constexpr auto initialSchema = R"SQL(
CREATE TABLE IF NOT EXISTS investment_targets (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    quote_currency TEXT NOT NULL DEFAULT 'USDT' CHECK (quote_currency = 'USDT'),
    note TEXT NOT NULL DEFAULT '',
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_target_name
ON investment_targets(name COLLATE NOCASE, quote_currency) WHERE archived_at IS NULL;
CREATE TABLE IF NOT EXISTS investment_trades (
    id INTEGER PRIMARY KEY,
    target_id INTEGER NOT NULL REFERENCES investment_targets(id) ON DELETE RESTRICT,
    side TEXT NOT NULL DEFAULT 'BUY' CHECK (side = 'BUY'),
    unit_price TEXT NOT NULL,
    quote_amount TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    client_request_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_investment_trades_target_time
ON investment_trades(target_id, occurred_at DESC, id DESC);
)SQL";
}
