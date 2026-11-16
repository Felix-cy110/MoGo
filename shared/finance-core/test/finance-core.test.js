import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExpensePayload,
  centsToYuan,
  formatLocalDate,
  NOTE_POLICY,
  validateExpenseDraft,
  yuanToCents
} from '../src/index.js';

test('converts money without storing decimals', () => {
  assert.equal(yuanToCents('25.50'), 2550);
  assert.equal(centsToYuan(2550), '25.50');
});

test('formats local dates for API requests', () => {
  assert.equal(formatLocalDate(new Date(2026, 10, 16)), '2026-11-16');
});

test('enforces budget and required-note rules', () => {
  assert.equal(validateExpenseDraft({ budgetSet: false }), 'budgetMissing');
  assert.equal(validateExpenseDraft({ budgetSet: true, amountCents: 0 }), 'invalidAmount');
  assert.equal(validateExpenseDraft({
    budgetSet: true,
    amountCents: 100,
    category: { notePolicy: NOTE_POLICY.REQUIRED },
    note: '  '
  }), 'noteRequired');
  assert.equal(validateExpenseDraft({
    budgetSet: true,
    amountCents: 100,
    category: { notePolicy: NOTE_POLICY.OPTIONAL },
    note: ''
  }), null);
});

test('normalizes expense payloads', () => {
  assert.deepEqual(buildExpensePayload({
    date: '2026-11-16',
    amountCents: 1800,
    categoryId: '4',
    note: '  日用品  ',
    clientRequestId: 'request-1'
  }), {
    date: '2026-11-16',
    amountCents: 1800,
    categoryId: 4,
    note: '日用品',
    clientRequestId: 'request-1'
  });
});

test('keeps translation keys aligned across supported languages', async () => {
  const { financeMessages, supportedLanguages } = await import('../src/index.js');
  const expectedKeys = Object.keys(financeMessages[supportedLanguages[0]]).sort();
  for (const language of supportedLanguages) {
    assert.deepEqual(Object.keys(financeMessages[language]).sort(), expectedKeys);
  }
});

test('resolves category and API error translation keys', async () => {
  const { resolveApiErrorMessageKey, resolveCategoryMessageKey } = await import('../src/index.js');
  assert.equal(resolveCategoryMessageKey({ i18nKey: 'category.meal' }), 'categoryMeal');
  assert.equal(resolveCategoryMessageKey({ code: 'OTHER' }), 'categoryOther');
  assert.equal(resolveApiErrorMessageKey('NOTE_REQUIRED'), 'noteRequired');
  assert.equal(resolveApiErrorMessageKey('UNKNOWN'), 'requestFailed');
});

test('formats currency and dates for the active language', async () => {
  const { formatDisplayDate, formatMoney, formatTime } = await import('../src/index.js');
  assert.match(formatMoney(2550, 'zh'), /25\.50/);
  assert.match(formatMoney(2550, 'en'), /25\.50/);
  assert.notEqual(formatDisplayDate('2026-11-16', 'zh'), formatDisplayDate('2026-11-16', 'en'));
  assert.doesNotThrow(() => formatTime('2026-11-16T08:30:00', 'en'));
});


test('includes localized color theme controls', async () => {
  const { financeMessages } = await import('../src/index.js');
  assert.equal(financeMessages.zh.switchToLightTheme, '开灯');
  assert.equal(financeMessages.zh.switchToDarkTheme, '关灯');
  assert.equal(financeMessages.en.switchToLightTheme, 'Turn on the lights');
  assert.equal(financeMessages.en.switchToDarkTheme, 'Turn off the lights');
});

test('validates and normalizes custom category drafts', async () => {
  const { buildCategoryPayload, validateCategoryDraft } = await import('../src/index.js');
  assert.equal(validateCategoryDraft({ name: '  ' }), 'categoryNameRequired');
  assert.equal(validateCategoryDraft({ name: '日用品' }), null);
  assert.deepEqual(buildCategoryPayload({ name: '  日用品  ' }), { name: '日用品' });
});
