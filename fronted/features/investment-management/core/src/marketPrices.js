import { OkxMarketConnection } from './market/OkxMarketConnection.js';
import { supportedMarketSymbols } from './market/okxProtocol.js';
export { investmentMarketSymbol } from './market/okxProtocol.js';
export { OKX_SPOT_INSTRUMENTS, okxInstrumentId, okxMarketSymbol } from './market/okxInstruments.js';

export const INVESTMENT_PRICE_RENDER_MS = 500;

// The platform injects WebSocket construction. Quotes stay in memory and never affect investments.
export const createOkxMarketClient = ({ createSocket, now = Date.now, random = Math.random }) => {
  const subscribers = new Set();
  let quotes = {};
  let publishTimer;
  const publish = () => {
    clearTimeout(publishTimer);
    publishTimer = null;
    subscribers.forEach(subscriber => {
      const prices = Object.fromEntries(subscriber.symbols
        .filter(symbol => quotes[symbol])
        .map(symbol => [symbol, quotes[symbol].price]));
      const previous = subscriber.prices;
      if (!previous || Object.keys(previous).length !== Object.keys(prices).length ||
          Object.keys(prices).some(symbol => prices[symbol] !== previous[symbol])) {
        subscriber.prices = prices;
        subscriber.listener(prices);
      }
    });
  };
  const connection = new OkxMarketConnection({
    createSocket, now, random,
    onDisconnect: () => { quotes = {}; publish(); },
    onQuote: (symbol, quote) => {
      if (!quote) {
        delete quotes[symbol];
        publish();
        return;
      }
      if (quotes[symbol]?.timestamp > quote.timestamp) return;
      // A quiet ticker remains valid while the socket is healthy; only incoming replays are age-checked.
      const changed = quotes[symbol]?.price !== quote.price;
      quotes[symbol] = quote;
      if (changed && !publishTimer) publishTimer = setTimeout(publish, INVESTMENT_PRICE_RENDER_MS);
    },
  });
  const updateSymbols = () => {
    const symbols = supportedMarketSymbols([...subscribers].flatMap(subscriber => subscriber.symbols));
    Object.keys(quotes).forEach(symbol => { if (!symbols.includes(symbol)) delete quotes[symbol]; });
    connection.setSymbols(symbols);
  };

  return {
    // Multiple views share one connection. The last unsubscribe closes it and cancels all work.
    subscribe(symbols, listener) {
      const subscriber = { symbols: supportedMarketSymbols(symbols), listener };
      if (!subscriber.symbols.length) { listener({}); return () => {}; }
      subscribers.add(subscriber);
      updateSymbols();
      publish();
      return () => {
        if (!subscribers.delete(subscriber)) return;
        updateSymbols();
      };
    },
  };
};
