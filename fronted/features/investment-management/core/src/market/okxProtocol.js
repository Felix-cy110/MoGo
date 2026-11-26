import { okxInstrumentId, okxMarketSymbol, okxSymbolFromInstrumentId } from './okxInstruments.js';

export const OKX_PUBLIC_WS_URL = 'wss://ws.okx.com/ws/v5/public';
const MAX_INCOMING_AGE_MS = 60_000;

export const supportedMarketSymbols = symbols =>
  [...new Set(symbols.map(okxMarketSymbol).filter(Boolean))].sort();

export const investmentMarketSymbol = target =>
  target?.quoteCurrency?.toUpperCase() === 'USDT' ? okxMarketSymbol(target.symbol) : null;

export const subscriptionMessage = (op, symbols) => JSON.stringify({
  op,
  args: symbols.map(symbol => ({ channel: 'tickers', instId: okxInstrumentId(symbol) })),
});

const readQuote = (ticker, instId, now) => {
  if (ticker?.instId !== instId || ticker?.instType !== 'SPOT') return null;
  const price = ticker.last;
  const timestamp = typeof ticker.ts === 'string' && /^\d+$/.test(ticker.ts) ? Number(ticker.ts) : NaN;
  const age = now - timestamp;
  if (typeof price !== 'string' || price.length > 80 ||
      !/^(0|[1-9]\d*)(\.\d+)?$/.test(price) || !/[1-9]/.test(price) ||
      !Number.isSafeInteger(timestamp) || timestamp <= 0 ||
      age < -5_000 || age >= MAX_INCOMING_AGE_MS) return null;
  return { price, timestamp };
};

// Only public spot tickers are accepted. Decimal strings never enter JS floating-point arithmetic.
export const readOkxMessage = (data, now) => {
  if (data === 'pong') return { type: 'pong' };
  let message;
  try { message = JSON.parse(data); }
  catch { return { type: 'error' }; }
  if (message?.event === 'notice' && message.code === '64008') return { type: 'error' };
  if (message?.event === 'error') {
    const symbol = message.arg?.channel === 'tickers'
      ? okxSymbolFromInstrumentId(message.arg.instId) : null;
    return symbol ? { type: 'rejected', symbol } : { type: 'error' };
  }
  if (message?.arg?.channel !== 'tickers') return null;
  const symbol = okxSymbolFromInstrumentId(message.arg.instId);
  if (!symbol) return null;
  if (message.event === 'subscribe') return { type: 'subscribed', symbol };
  if (message.event) return null;
  const ticker = Array.isArray(message.data) && message.data.length === 1 ? message.data[0] : null;
  return { type: 'quote', symbol, quote: readQuote(ticker, message.arg.instId, now) };
};
