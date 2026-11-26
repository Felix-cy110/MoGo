import test from 'node:test';
import assert from 'node:assert/strict';
import { investmentMarketSymbol, okxInstrumentId } from '../src/index.js';
import { readOkxMessage } from '../src/market/okxProtocol.js';
import { NOW, tick } from '../test-support/market.js';

const read = (overrides = {}) => readOkxMessage(JSON.stringify(tick('BTC', { ts: String(NOW), ...overrides })), NOW);

test('market lookup resolves codes and common names case-insensitively for USDT', () => {
  assert.equal(investmentMarketSymbol({ name: 'renamed', symbol: 'BTC', quoteCurrency: 'USDT' }), 'BTC');
  assert.equal(investmentMarketSymbol({ name: 'anything', symbol: 'sol', quoteCurrency: 'USDT' }), 'SOL');
  assert.equal(investmentMarketSymbol({ name: 'anything', symbol: 'Solana', quoteCurrency: 'USDT' }), 'SOL');
  assert.equal(okxInstrumentId('Solana'), 'SOL-USDT');
  assert.equal(okxInstrumentId('doge'), 'DOGE-USDT');
  assert.equal(investmentMarketSymbol({ symbol: 'BTC', quoteCurrency: 'USD' }), null);
  assert.equal(investmentMarketSymbol({ symbol: 'bad symbol', quoteCurrency: 'USDT' }), null);
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
  assert.deepEqual(readOkxMessage(JSON.stringify(tick('SOL', { ts: String(NOW) })), NOW), {
    type: 'quote', symbol: 'SOL', quote: { price: '59045.123456789012345678', timestamp: NOW },
  });
  assert.equal(readOkxMessage(JSON.stringify({ ...tick(), arg: { channel: 'trades', instId: 'BTC-USDT' } }), NOW), null);
  for (const message of ['{', JSON.stringify({ event: 'error', code: '60012' }),
    JSON.stringify({ event: 'notice', code: '64008' })]) {
    assert.deepEqual(readOkxMessage(message, NOW), { type: 'error' });
  }
  assert.deepEqual(readOkxMessage('pong', NOW), { type: 'pong' });
});

test('a rejected dynamic instrument is isolated from the socket session', () => {
  assert.deepEqual(readOkxMessage(JSON.stringify({
    event: 'error', code: '60018', arg: { channel: 'tickers', instId: 'UNKNOWN-USDT' },
  }), NOW), { type: 'rejected', symbol: 'UNKNOWN' });
});
