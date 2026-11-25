import test from 'node:test';
import assert from 'node:assert/strict';
import { createOkxMarketClient, investmentMarketSymbol, INVESTMENT_PRICE_MAX_AGE_MS } from '../src/index.js';

const now = 1_795_572_983_500;
const ticker = (overrides = {}) => ({ instId: 'BTC-USDT', instType: 'SPOT', last: '59045.123456789012345678', ts: String(now), ...overrides });
const response = (data = ticker(), code = '0') => ({ ok: true, json: async () => ({ code, data: [data] }) });

test('OKX requests public spot prices without credentials and preserves decimals', async () => {
  const calls = [];
  const client = createOkxMarketClient({ now: () => now, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return response(ticker({ instId: url.includes('BTC') ? 'BTC-USDT' : 'ETH-USDT' }));
  } });
  for (const symbol of ['BTC', 'ETH']) {
    assert.deepEqual(await client.getPrice(symbol), { price: '59045.123456789012345678', timestamp: now });
  }
  assert.equal(calls[0].url, 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT');
  assert.equal(calls[1].url, 'https://www.okx.com/api/v5/market/ticker?instId=ETH-USDT');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.headers, undefined);
});

test('quote lookup uses the symbol and USDT currency, never the display name', async () => {
  assert.equal(investmentMarketSymbol({ name: 'renamed', symbol: 'BTC', quoteCurrency: 'USDT' }), 'BTC');
  assert.equal(investmentMarketSymbol({ name: 'BTC', symbol: 'SOL', quoteCurrency: 'USDT' }), null);
  assert.equal(investmentMarketSymbol({ symbol: 'BTC', quoteCurrency: 'USD' }), null);
  assert.equal(investmentMarketSymbol(null), null);
  const client = createOkxMarketClient({ fetchImpl: () => assert.fail('unsupported symbols must not make a request') });
  assert.equal(await client.getPrice('SOL'), null);
  assert.equal(await client.getPrice('toString'), null);
});

test('failed, malformed, non-spot and stale responses have no displayable price', async () => {
  const invalid = [
    { ok: false, json: () => assert.fail('failed HTTP body is unused') },
    response(ticker(), '50011'),
    { ok: true, json: async () => null },
    { ok: true, json: async () => ({ code: '0', data: [] }) },
    { ok: true, json: async () => { throw new SyntaxError('invalid JSON'); } },
    ...[
      { instId: 'ETH-USDT' }, { instType: 'SWAP' },
      ...['', '0', '0.000', '-1', 'NaN', '1e4', 'Infinity', '1'.repeat(81), 60000].map(last => ({ last })),
      { ts: 'not a time' }, { ts: '' }, { ts: String(now - INVESTMENT_PRICE_MAX_AGE_MS) },
      { ts: String(now + 5001) },
    ].map(value => response(ticker(value))),
  ];
  for (const value of invalid) {
    const client = createOkxMarketClient({ now: () => now, fetchImpl: async () => value });
    assert.equal(await client.getPrice('BTC'), null);
  }
  const offline = createOkxMarketClient({ fetchImpl: async () => { throw new TypeError('Network request failed'); } });
  assert.equal(await offline.getPrice('BTC'), null);
});

test('timeout also bounds a stalled JSON body and aborts its request', async () => {
  let requestSignal;
  const client = createOkxMarketClient({ timeoutMs: 10, fetchImpl: async (_, { signal }) => {
    requestSignal = signal;
    return { ok: true, json: () => new Promise(() => {}) };
  } });
  assert.equal(await client.getPrice('BTC'), null);
  assert.equal(requestSignal.aborted, true);
});

test('caller cancellation settles even if fetch ignores abort, with no later request', async () => {
  const controller = new AbortController();
  let calls = 0;
  let requestSignal;
  const client = createOkxMarketClient({ fetchImpl: (_, { signal }) => {
    calls += 1; requestSignal = signal;
    return new Promise(() => {});
  } });
  const result = client.getPrice('BTC', { signal: controller.signal });
  controller.abort();
  assert.equal(await result, null);
  assert.equal(requestSignal.aborted, true);
  assert.equal(await client.getPrice('ETH', { signal: controller.signal }), null);
  assert.equal(calls, 1);
});
