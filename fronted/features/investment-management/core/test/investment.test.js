import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvestmentProfitLoss, createInvestmentApi, investmentManagementMessages, validInvestmentDecimal, normalizeInvestmentDecimal, createTargetDraft, validateTargetDraft, targetPayload, createTradeDraft, validateTradeDraft, tradePayload, formatInvestmentDecimal, formatInvestmentProfitLoss, investmentTargetHintKey, investmentErrorKey } from '../src/index.js';

test('validates exact decimal strings without numeric conversion', () => {
  for (const value of ['0.000000000000000001', '999999999999999999.999999999999999999', '0001.200']) assert.ok(validInvestmentDecimal(value));
  for (const value of ['0', '-1', '1e8', 'NaN', '1.', '.2', '1000000000000000000', '0.0000000000000000001']) assert.equal(validInvestmentDecimal(value), false);
  assert.equal(normalizeInvestmentDecimal('0001.200'), '1.2');
  assert.equal(formatInvestmentDecimal('999999999999999999.123456789012345678', 'en'), '999,999,999,999,999,999.123456789012345678');
  assert.equal(formatInvestmentDecimal('0.000000000000000001', 'zh'), '0.000000000000000001');
});
test('calculates unrealized profit and loss with exact decimal arithmetic', () => {
  const summary = {
    totalQuoteAmount: '600',
    totalQuantity: '0.01',
    averageEntryPrice: '60000',
  };
  assert.deepEqual(calculateInvestmentProfitLoss({ price: '65000', summary }), {
    amount: '50.00', percentage: '8.33', direction: 'profit'
  });
  assert.deepEqual(calculateInvestmentProfitLoss({ price: '59045.1', summary }), {
    amount: '9.55', percentage: '1.59', direction: 'loss'
  });
  assert.deepEqual(calculateInvestmentProfitLoss({ price: '60000', summary }), {
    amount: '0.00', percentage: '0.00', direction: 'flat'
  });
  assert.deepEqual(calculateInvestmentProfitLoss({
    price: '0.000000000000000002',
    summary: {
      totalQuoteAmount: '0.000000000000000001',
      totalQuantity: '0.500000000000000000000000000000000000',
      averageEntryPrice: '0.000000000000000002',
    },
  }), { amount: '0.00', percentage: '0.00', direction: 'flat' });
});
test('hides unrealized profit and loss without a complete live position', () => {
  const summary = { totalQuoteAmount: '600', totalQuantity: '0.01', averageEntryPrice: null };
  assert.equal(calculateInvestmentProfitLoss({ price: '65000', summary }), null);
  assert.equal(calculateInvestmentProfitLoss({ price: null, summary: { ...summary, averageEntryPrice: '60000' } }), null);
  assert.equal(calculateInvestmentProfitLoss({ price: '65000', summary: { ...summary, totalQuantity: '0' } }), null);
});
test('formats profit and loss signs consistently across platforms', () => {
  assert.deepEqual(formatInvestmentProfitLoss({
    amount: '50.00', percentage: '8.33', direction: 'profit'
  }, 'en'), { amount: '+50.00', percentage: '+8.33', direction: 'profit' });
  assert.deepEqual(formatInvestmentProfitLoss({
    amount: '9.55', percentage: '1.59', direction: 'loss'
  }, 'zh'), { amount: '-9.55', percentage: '-1.59', direction: 'loss' });
  assert.equal(formatInvestmentProfitLoss(null, 'zh'), null);
});
test('builds USDT buy payloads with the captured instant and stable retry IDs', () => {
  const draft = createTradeDraft(null, new Date('2026-11-25T08:09:27.456+08:00'));
  draft.unitPrice = '60000.00'; draft.quoteAmount = '0600';
  assert.equal(validateTradeDraft(draft), null);
  const first = tradePayload(draft, 1); const retry = tradePayload(draft, 1);
  assert.deepEqual(first, retry);
  assert.equal(first.unitPrice, '60000'); assert.equal(first.quoteAmount, '600');
  assert.equal(first.occurredAt, '2026-11-25T00:09:27.456Z');
  const next = createTradeDraft(null, new Date('2026-11-25T00:10:15.789Z'));
  assert.notEqual(next.clientRequestId, draft.clientRequestId);
  assert.equal(next.occurredAt, '2026-11-25T00:10:15.789Z');
});
test('editing a buy preserves the original timestamp and request ID', () => {
  const draft = createTradeDraft({
    unitPrice: '1', quoteAmount: '1', occurredAt: '2026-11-24T23:59:37.123Z', clientRequestId: 'existing-buy'
  }, new Date('2026-11-25T12:00:00.000Z'));
  draft.quoteAmount = '900';
  assert.equal(validateTradeDraft(draft), null);
  const payload = tradePayload(draft, 1);
  assert.equal(payload.occurredAt, '2026-11-24T23:59:37.123Z');
  assert.equal(payload.clientRequestId, 'existing-buy');
  assert.equal(payload.quoteAmount, '900');
});
test('rejects missing, invalid or noncanonical persisted timestamps', () => {
  const draft = { ...createTradeDraft(), unitPrice: '1', quoteAmount: '1' };
  for (const occurredAt of [undefined, null, '', 'invalid', '2026-02-30T12:00:00.000Z',
    '2026-11-25T25:00:00.000Z', '0000-01-01T00:00:00.000Z', '+010000-01-01T00:00:00.000Z', '2026-11-25T12:00']) {
    assert.equal(validateTradeDraft({ ...draft, occurredAt }), 'investmentDateInvalid');
  }
});
test('normalizes targets and keeps both languages complete', () => {
  const draft = createTargetDraft({name:' 比特币 ', symbol:'btc'});
  assert.equal(validateTargetDraft(draft), null);
  assert.deepEqual(targetPayload(draft), {name:'比特币', symbol:'BTC', quoteCurrency:'USDT', note:''});
  assert.equal(validateTargetDraft({...draft, symbol:'btc/usdt'}), 'investmentSymbolInvalid');
  assert.deepEqual(Object.keys(investmentManagementMessages.zh).sort(), Object.keys(investmentManagementMessages.en).sort());
});
test('uses the same Chinese investment terminology across screens and dialogs', () => {
  const keys = [
    'investmentTargetDetail',
    'investmentAddTarget',
    'investmentEditTarget',
    'investmentName',
    'investmentSymbol',
    'investmentEmpty',
    'investmentNoMatches',
    'investmentSearch',
    'investmentSymbolHint',
    'investmentTargetExists',
    'investmentTargetMissing',
    'investmentSymbolLocked',
  ];
  for (const key of keys) {
    assert.match(investmentManagementMessages.zh[key], /指标/, key);
  }
});
test('HTTP adapter preserves decimal strings and lifecycle operations', async () => {
  const calls = [];
  const api = createInvestmentApi({baseUrl:'/api', fetchImpl: async (...args) => { calls.push(args); return {ok:true,json:async()=>({})}; }});
  await api.addTrade({targetId:1, unitPrice:'0.000000000000000001', quoteAmount:'100'});
  await api.deleteTrade(2); await api.listTargets();
  assert.equal(JSON.parse(calls[0][1].body).unitPrice,'0.000000000000000001');
  assert.equal(calls[1][1].method,'DELETE'); assert.equal(calls[2][0],'/api/investment/targets');
});

test('built-in hints use persisted identity and translate backend protections', () => {
  for (const builtinCode of ['BTC', 'ETH']) {
    const target = { builtinCode, symbol: builtinCode, name: 'custom name' };
    assert.equal(investmentTargetHintKey(target), 'investmentBuiltinHint');
  }
  assert.equal(investmentTargetHintKey({symbol: 'SOL'}), 'investmentSymbolHint');
  assert.equal(investmentErrorKey('INVESTMENT_BUILTIN_PROTECTED'), 'investmentBuiltinProtected');
  for (const language of ['zh', 'en']) {
    assert.ok(investmentManagementMessages[language].investmentBuiltinHint);
    assert.ok(investmentManagementMessages[language].investmentBuiltinProtected);
  }
});
