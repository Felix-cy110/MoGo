import test from 'node:test';
import assert from 'node:assert/strict';
import { investmentMarketSymbol } from '../src/index.js';
import { readOkxMessage } from '../src/market/okxProtocol.js';
import { NOW, tick } from '../test-support/market.js';

const read = (overrides = {}) => readOkxMessage(JSON.stringify(tick('BTC', { ts: String(NOW), ...overrides })), NOW);

test('market lookup uses supported symbols and USDT, never names or prototype properties', () => {
  assert.equal(investmentMarketSymbol({ name: 'renamed', symbol: 'BTC', quoteCurrency: 'USDT' }), 'BTC');
  for (const target of [null, { symbol: 'BTC', quoteCurrency: 'USD' },
    { name: 'BTC', symbol: 'SOL', quoteCurrency: 'USDT' }, { symbol: 'toString', quoteCurrency: 'USDT' }]) {
    assert.equal(investmentMarketSymbol(target), null);
  }
});

test('spot ticker preserves full decimal precision and its server timestamp', () => {
  assert.deepEqual(read(), {
    type: 'quote', symbol: 'BTC', quote: { price: '59045.123456789012345678', timestamp: NOW },
  });
});

test('invalid, wrong-instrument, stale and future tickers cannot be displayed', () => {
  const invalid = [
    { instId: 'ETH-USDT' }, { instType: 'SWAP' },
    ...['', '0', '0.000', '-1', 'NaN', '1e4', 'Infinity', '1'.repeat(81), 60000].map(last => ({ last })),
    ...['not a time', '', [], null, String(NOW - 60_000), String(NOW + 5001)].map(ts => ({ ts })),
  ];
  for (const value of invalid) assert.deepEqual(read(value), { type: 'quote', symbol: 'BTC', quote: null });
});

test('unrelated traffic is ignored; protocol errors and maintenance request a reconnect', () => {
  assert.equal(readOkxMessage('null', NOW), null);
  assert.equal(readOkxMessage(JSON.stringify(tick('SOL')), NOW), null);
  assert.equal(readOkxMessage(JSON.stringify({ ...tick(), arg: { channel: 'trades', instId: 'BTC-USDT' } }), NOW), null);
  for (const message of ['{', JSON.stringify({ event: 'error', code: '60012' }),
    JSON.stringify({ event: 'notice', code: '64008' })]) {
    assert.deepEqual(readOkxMessage(message, NOW), { type: 'error' });
  }
  assert.deepEqual(readOkxMessage('pong', NOW), { type: 'pong' });
});
