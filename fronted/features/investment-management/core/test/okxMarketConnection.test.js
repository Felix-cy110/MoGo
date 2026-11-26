import test from 'node:test';
import assert from 'node:assert/strict';
import { setupMarket, tick } from '../test-support/market.js';

test('an idle, acknowledged ticker stays visible through heartbeats without REST polling', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const result = subscribe(['BTC']);
  sockets[0].open();
  sockets[0].ack();
  sockets[0].receive(tick('BTC', { last: '60000' }));
  advance(500);
  for (let i = 0; i < 5; i += 1) {
    advance(20_000);
    assert.equal(sockets[0].sent.at(-1), 'ping');
    sockets[0].receive('pong');
    assert.deepEqual(result.latest(), { BTC: '60000' });
  }
  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].sent.length, 6);
});

test('a missing pong clears prices and reconnects with the same desired subscriptions', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const result = subscribe(['BTC', 'ETH']);
  sockets[0].open();
  sockets[0].receive(tick());
  sockets[0].receive(tick('ETH'));
  advance(500);
  assert.equal(Object.keys(result.latest()).length, 2);
  advance(19_500);
  assert.equal(sockets[0].sent.at(-1), 'ping');
  advance(10_000);
  assert.deepEqual(result.latest(), {});
  assert.equal(sockets[0].closeCount, 1);
  advance(1000);
  sockets[1].open();
  assert.deepEqual(JSON.parse(sockets[1].sent[0]).args, [
    { channel: 'tickers', instId: 'BTC-USDT' }, { channel: 'tickers', instId: 'ETH-USDT' },
  ]);
  assert.deepEqual(result.latest(), {});
});

test('a stalled handshake times out and closing the last subscriber cancels backoff', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const result = subscribe(['BTC']);
  const lateOpen = sockets[0].onopen;
  advance(10_000);
  assert.equal(sockets[0].closeCount, 1);
  lateOpen();
  assert.equal(sockets[0].sent.length, 0);
  result.stop();
  advance(120_000);
  assert.equal(sockets.length, 1);
});

test('each subscription has its own deadline even when another symbol is streaming', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const result = subscribe(['BTC', 'ETH']);
  sockets[0].open();
  sockets[0].ack('BTC');
  sockets[0].receive(tick());
  advance(500);
  assert.ok(result.latest().BTC);
  advance(9000);
  sockets[0].receive(tick());
  advance(500);
  assert.equal(sockets[0].closeCount, 1);
  assert.deepEqual(result.latest(), {});
});

test('subscription errors, malformed frames and server maintenance clear quotes immediately', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const result = subscribe(['BTC']);
  const errors = [{ event: 'error', code: '60012' }, '{', { event: 'notice', code: '64008' }];
  for (const error of errors) {
    const socket = sockets.at(-1);
    socket.open();
    socket.receive(tick());
    advance(500);
    assert.ok(result.latest().BTC);
    socket.receive(error);
    assert.deepEqual(result.latest(), {});
    assert.equal(socket.closeCount, 1);
    advance(4000);
  }
});

test('one rejected dynamic pair does not disconnect valid subscriptions', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  const result = subscribe(['BTC', 'UNKNOWN']);
  sockets[0].open();
  sockets[0].receive({ event: 'error', code: '60018', arg: { channel: 'tickers', instId: 'UNKNOWN-USDT' } });
  sockets[0].receive(tick('BTC', { last: '60000' }));
  advance(500);
  assert.deepEqual(result.latest(), { BTC: '60000' });
  assert.equal(sockets[0].closeCount, 0);
  advance(20_000);
  assert.equal(sockets[0].sent.at(-1), 'ping');
});

test('repeated failures back off with jitter, cap at 30 seconds and reset only after stability', t => {
  const { sockets, subscribe, advance } = setupMarket(t, { random: () => 1 });
  subscribe(['BTC']);
  for (const delay of [2000, 4000, 8000, 16000, 30000, 30000]) {
    const socket = sockets.at(-1);
    socket.open();
    socket.ack();
    const count = sockets.length;
    socket.disconnect();
    advance(delay - 1);
    assert.equal(sockets.length, count);
    advance(1);
    assert.equal(sockets.length, count + 1);
  }
  sockets.at(-1).open();
  sockets.at(-1).ack();
  advance(20_000);
  sockets.at(-1).receive('pong');
  advance(10_000);
  sockets.at(-1).receive(tick());
  const count = sockets.length;
  sockets.at(-1).disconnect();
  advance(2000);
  assert.equal(sockets.length, count + 1);
});

test('constructor failures are recoverable without leaking retry work', t => {
  let calls = 0;
  const { subscribe, advance } = setupMarket(t, { createSocket: () => { calls += 1; throw new Error('offline'); } });
  const result = subscribe(['BTC']);
  assert.deepEqual(result.latest(), {});
  advance(1000);
  assert.equal(calls, 2);
  result.stop();
  advance(120_000);
  assert.equal(calls, 2);
});

test('send and close exceptions still release ownership and retry safely', t => {
  const { sockets, subscribe, advance } = setupMarket(t);
  subscribe(['BTC']);
  sockets[0].send = () => { throw new Error('send failed'); };
  sockets[0].close = () => { throw new Error('handshake failed'); };
  sockets[0].open();
  advance(1000);
  assert.equal(sockets.length, 2);
  sockets[1].open();
  assert.equal(JSON.parse(sockets[1].sent[0]).op, 'subscribe');
});
