import { createOkxMarketClient } from '../src/index.js';

export const NOW = 1_795_572_983_500;
export const tick = (symbol = 'BTC', overrides = {}) => ({
  arg: { channel: 'tickers', instId: `${symbol}-USDT` },
  data: [{ instId: `${symbol}-USDT`, instType: 'SPOT', last: '59045.123456789012345678', ts: String(Date.now()), ...overrides }],
});
export class MarketSocket {
  readyState = 0;
  sent = [];
  closeCount = 0;
  open() { this.readyState = 1; this.onopen?.(); }
  send(message) { this.sent.push(message); }
  receive(message) { this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) }); }
  ack(symbol = 'BTC') { this.receive({ event: 'subscribe', arg: { channel: 'tickers', instId: `${symbol}-USDT` } }); }
  close() { this.readyState = 3; this.closeCount += 1; }
  disconnect() { this.readyState = 3; this.onclose?.(); }
}
export const setupMarket = (t, options = {}) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: NOW });
  const sockets = [];
  const urls = [];
  const client = createOkxMarketClient({
    random: () => 0,
    createSocket: url => { const socket = new MarketSocket(); sockets.push(socket); urls.push(url); return socket; },
    ...options,
  });
  const subscribe = symbols => {
    const updates = [];
    const stop = client.subscribe(symbols, value => updates.push(value));
    t.after(stop);
    return { updates, stop, latest: () => updates.at(-1) };
  };
  return { sockets, urls, subscribe, advance: ms => t.mock.timers.tick(ms) };
};
