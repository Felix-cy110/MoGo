const aliasKey = value => typeof value === 'string'
  ? value.trim().toUpperCase().replace(/[\s._-]+/g, '')
  : '';

// Extend this table when a coin's common name differs from its OKX base symbol.
export const OKX_SPOT_INSTRUMENTS = Object.freeze([
  Object.freeze({ symbol: 'BTC', instId: 'BTC-USDT', aliases: Object.freeze(['BTC', 'XBT', 'Bitcoin']) }),
  Object.freeze({ symbol: 'ETH', instId: 'ETH-USDT', aliases: Object.freeze(['ETH', 'Ethereum']) }),
  Object.freeze({ symbol: 'SOL', instId: 'SOL-USDT', aliases: Object.freeze(['SOL', 'Solana']) }),
]);

const byAlias = new Map();
const bySymbol = new Map();
for (const instrument of OKX_SPOT_INSTRUMENTS) {
  bySymbol.set(instrument.symbol, instrument);
  for (const alias of instrument.aliases) byAlias.set(aliasKey(alias), instrument.symbol);
}

const symbolPattern = /^[A-Z0-9][A-Z0-9._-]{0,19}$/;

export const okxMarketSymbol = value => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return byAlias.get(aliasKey(normalized)) || (symbolPattern.test(normalized) ? normalized : null);
};

export const okxInstrumentId = value => {
  const symbol = okxMarketSymbol(value);
  if (!symbol) return null;
  return bySymbol.get(symbol)?.instId || `${symbol}-USDT`;
};

export const okxSymbolFromInstrumentId = instId => {
  if (typeof instId !== 'string' || !instId.endsWith('-USDT')) return null;
  const symbol = instId.slice(0, -5);
  return okxInstrumentId(symbol) === instId ? symbol : null;
};
