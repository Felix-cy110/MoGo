import test from 'node:test';
import assert from 'node:assert/strict';
import { INVESTMENT_PRICE_RENDER_MS } from '../src/index.js';
import { setupMarket, tick } from '../test-support/market.js';

const commands = socket => socket.sent.map(message => JSON.parse(message));

test('subscribers share one public socket, deduplicate pairs and release only unused subscriptions', t => {
  const { sockets, urls, subscribe, advance } = setupMarket(t);
  const first = subscribe(['BTC', 'ETH', 'BTC', 'SOL']);
  const second = subscribe(['BTC']);
  assert.equal(sockets.length, 1);
  assert.deepEqual(urls, ['wss://ws.okx.com/ws/v5/public']);
  sockets[0].open();
  assert.deepEqual(commands(sockets[0]), [{ op: 'subscribe', args: [
    { channel: 'tickers', instId: 'BTC-USDT' }, { channel: 'tickers', instId: 'ETH-USDT' },
    { channel: 'tickers', instId: 'SOL-USDT' },
  ] }]);
  sockets[0].receive(tick());
  sockets[0].receive(tick('ETH', { last: '2001.23' }));
  advance(INVESTMENT_PRICE_RENDER_MS);
  assert.deepEqual(first.latest(), { BTC: '59045.123456789012345678', ETH: '2001.23' });
  assert.deepEqual(second.latest(), { BTC: '59045.123456789012345678' });
  first.stop();
  assert.equal(sockets[0].closeCount, 0);
  assert.deepEqual(commands(sockets[0]).at(-1), { op: 'unsubscribe', args: [
    { channel: 'tickers', instId: 'ETH-USDT' }, { channel: 'tickers', instId: 'SOL-USDT' },
  ] });
  second.stop();
  second.stop();
  assert.equal(sockets[0].closeCount, 1);
  advance(120_000);
  assert.equal(sockets.length, 1);
});

test('adding a consumer changes the subscription without reconnecting', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const first = subscribe(['BTC']);
  sockets[0].open();
  sockets[0].receive(tick());
  advance(500);
  const second = subscribe(['ETH']);
  assert.equal(sockets.length, 1);
  assert.deepEqual(second.latest(), {});
  assert.deepEqual(commands(sockets[0]).at(-1), { op: 'subscribe', args: [{ channel: 'tickers', instId: 'ETH-USDT' }] });
  sockets[0].receive(tick('ETH', { last: '2000' }));
  advance(500);
  assert.deepEqual(second.latest(), { ETH: '2000' });
  assert.deepEqual(first.latest(), { BTC: '59045.123456789012345678' });
});

test('malformed symbols never open sockets', t => {
  const { sockets, subscribe } = setupMarket(t);
  assert.deepEqual(subscribe(['bad symbol', '']).latest(), {});
  assert.equal(sockets.length, 0);
});

test('common coin names and lowercase codes share one dynamic subscription', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const result = subscribe(['Solana', 'sol', 'SOL']);
  sockets[0].open();
  assert.deepEqual(commands(sockets[0]), [{
    op: 'subscribe', args: [{ channel: 'tickers', instId: 'SOL-USDT' }],
  }]);
  sockets[0].receive(tick('SOL', { last: '142.50' }));
  advance(500);
  assert.deepEqual(result.latest(), { SOL: '142.50' });
});

test('bursts publish the newest quote once per interval and unchanged prices do not rerender', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const result = subscribe(['BTC']);
  sockets[0].open();
  for (let i = 0; i < 100; i += 1) sockets[0].receive(tick('BTC', { last: String(60000 + i) }));
  advance(499);
  assert.equal(result.updates.length, 1);
  advance(1);
  assert.deepEqual(result.latest(), { BTC: '60099' });
  assert.equal(result.updates.length, 2);
  sockets[0].receive(tick('BTC', { last: '60099' }));
  advance(500);
  assert.equal(result.updates.length, 2);
});

test('older messages do not replace fresh quotes and bad quotes only hide their own symbol', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const result = subscribe(['BTC', 'ETH']);
  sockets[0].open();
  sockets[0].receive(tick('BTC', { last: '60000' }));
  sockets[0].receive(tick('ETH', { last: '2000' }));
  advance(500);
  sockets[0].receive(tick('BTC', { last: '1', ts: String(Date.now() - 1000) }));
  advance(500);
  assert.deepEqual(result.latest(), { BTC: '60000', ETH: '2000' });
  sockets[0].receive(tick('BTC', { last: 'NaN' }));
  assert.deepEqual(result.latest(), { ETH: '2000' });
});

test('disconnect cancels a pending render; late socket events cannot resurrect prices', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const result = subscribe(['BTC']);
  const oldSocket = sockets[0];
  oldSocket.open();
  oldSocket.receive(tick());
  advance(500);
  const lateMessage = oldSocket.onmessage;
  const lateClose = oldSocket.onclose;
  oldSocket.receive(tick('BTC', { last: '60000' }));
  oldSocket.disconnect();
  assert.deepEqual(result.latest(), {});
  advance(1000);
  sockets[1].open();
  lateMessage({ data: JSON.stringify(tick('BTC', { last: '1' })) });
  lateClose();
  advance(500);
  assert.deepEqual(result.latest(), {});
  assert.equal(sockets[1].closeCount, 0);
  sockets[1].receive(tick('BTC', { last: '61000' }));
  advance(500);
  assert.deepEqual(result.latest(), { BTC: '61000' });
});

test('unsubscribing cancels buffered updates and a later subscriber starts without cached prices', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const first = subscribe(['BTC']);
  sockets[0].open();
  sockets[0].receive(tick());
  first.stop();
  advance(120_000);
  assert.equal(first.updates.length, 1);
  const second = subscribe(['BTC']);
  assert.deepEqual(second.latest(), {});
  assert.equal(sockets.length, 2);
});
