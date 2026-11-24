import test from 'node:test';
import assert from 'node:assert/strict';
import { createInvestmentApi, investmentManagementMessages, validInvestmentDecimal, normalizeInvestmentDecimal, createTargetDraft, validateTargetDraft, targetPayload, createTradeDraft, validateTradeDraft, tradePayload, formatInvestmentDecimal, parseLocalTime, canArchiveInvestmentTarget, investmentTargetHintKey, investmentErrorKey } from '../src/index.js';

test('validates exact decimal strings without numeric conversion', () => {
  for (const value of ['0.000000000000000001', '999999999999999999.999999999999999999', '0001.200']) assert.ok(validInvestmentDecimal(value));
  for (const value of ['0', '-1', '1e8', 'NaN', '1.', '.2', '1000000000000000000', '0.0000000000000000001']) assert.equal(validInvestmentDecimal(value), false);
  assert.equal(normalizeInvestmentDecimal('0001.200'), '1.2');
  assert.equal(formatInvestmentDecimal('999999999999999999.123456789012345678', 'en'), '999,999,999,999,999,999.123456789012345678');
  assert.equal(formatInvestmentDecimal('0.000000000000000001', 'zh'), '0.000000000000000001');
});
test('builds USDT buy payloads and retains retry IDs', () => {
  const draft = createTradeDraft(null, new Date('2026-11-24T00:00:00.000Z'));
  draft.unitPrice = '60000.00'; draft.quoteAmount = '0600';
  assert.equal(validateTradeDraft(draft), null);
  const first = tradePayload(draft, 1); const retry = tradePayload(draft, 1);
  assert.deepEqual(first, retry);
  assert.equal(first.unitPrice, '60000'); assert.equal(first.quoteAmount, '600');
  assert.equal(first.occurredAt, '2026-11-24T00:00:00.000Z');
  assert.notEqual(createTradeDraft().clientRequestId, draft.clientRequestId);
  assert.equal(parseLocalTime('2026-02-30T12:00'), null);
  assert.equal(parseLocalTime('2026-11-24T25:00'), null);
  const existing = createTradeDraft({unitPrice:'1',quoteAmount:'1',occurredAt:'2026-11-24T00:00:00.123Z',clientRequestId:'existing-buy'});
  assert.equal(tradePayload(existing, 1).occurredAt, '2026-11-24T00:00:00.123Z');
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
    'investmentArchive',
    'investmentRestore',
    'investmentArchiveConfirm',
    'investmentRestoreConfirm',
    'investmentArchivedHint',
    'investmentSymbolHint',
    'investmentTargetExists',
    'investmentTargetMissing',
    'investmentTargetArchivedError',
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
  await api.archiveTarget(1,true); await api.deleteTrade(2); await api.listTargets(true);
  assert.equal(JSON.parse(calls[0][1].body).unitPrice,'0.000000000000000001');
  assert.equal(calls[1][0],'/api/investment/targets/1/archive');
  assert.equal(calls[2][1].method,'DELETE'); assert.equal(calls[3][0],'/api/investment/targets?archived=true');
});

test('built-in removal policy uses persisted identity and translates backend protections', () => {
  for (const builtinCode of ['BTC', 'ETH']) {
    const target = { builtinCode, symbol: builtinCode, name: 'custom name' };
    assert.equal(canArchiveInvestmentTarget(target), false);
    assert.equal(investmentTargetHintKey(target), 'investmentBuiltinHint');
  }
  assert.equal(canArchiveInvestmentTarget({symbol: 'BTC', builtinCode: null}), true);
  assert.equal(canArchiveInvestmentTarget({symbol: 'SOL'}), true);
  assert.equal(investmentTargetHintKey({symbol: 'SOL'}), 'investmentSymbolHint');
  assert.equal(investmentErrorKey('INVESTMENT_BUILTIN_PROTECTED'), 'investmentBuiltinProtected');
  for (const language of ['zh', 'en']) {
    assert.ok(investmentManagementMessages[language].investmentBuiltinHint);
    assert.ok(investmentManagementMessages[language].investmentBuiltinProtected);
  }
});
