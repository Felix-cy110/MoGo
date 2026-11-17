import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExpensePayload,
  buildExpenseUpdatePayload,
  centsToYuan,
  createExpenseDraft,
  formatLocalDate,
  NOTE_POLICY,
  validateExpenseDraft,
  yuanToCents
} from '../src/index.js';

test('converts money without storing decimals', () => {
  assert.equal(yuanToCents('25.50'), 2550);
  assert.equal(centsToYuan(2550), '25.50');
});

test('creates editable drafts and normalized update payloads', () => {
  assert.deepEqual(createExpenseDraft({
    amountCents: 2550,
    categoryId: 2,
    note: '午饭'
  }), {
    amount: '25.50',
    categoryId: '2',
    note: '午饭'
  });
  assert.deepEqual(buildExpenseUpdatePayload({
    amountCents: 3200,
    categoryId: '3',
    note: '  地铁  '
  }), {
    amountCents: 3200,
    categoryId: 3,
    note: '地铁'
  });
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

test('includes localized language toggle labels', async () => {
  const { financeMessages } = await import('../src/index.js');
  assert.equal(financeMessages.zh.switchToEnglish, '切换为英文');
  assert.equal(financeMessages.zh.switchToChinese, '切换为中文');
  assert.equal(financeMessages.en.switchToEnglish, 'Switch to English');
  assert.equal(financeMessages.en.switchToChinese, 'Switch to Chinese');
});

test('validates and normalizes custom category drafts', async () => {
  const { buildCategoryPayload, validateCategoryDraft } = await import('../src/index.js');
  assert.equal(validateCategoryDraft({ name: '  ' }), 'categoryNameRequired');
  assert.equal(validateCategoryDraft({ name: '日用品' }), null);
  assert.deepEqual(buildCategoryPayload({ name: '  日用品  ' }), { name: '日用品' });
});


test('includes localized toolbox entry labels', async () => {
  const { financeMessages } = await import('../src/index.js');
  assert.equal(financeMessages.zh.toolboxName, '手机百宝箱');
  assert.equal(financeMessages.zh.financeFeatureName, '个人财务管理');
  assert.equal(financeMessages.en.toolboxName, 'Mobile Toolbox');
  assert.equal(financeMessages.en.financeFeatureName, 'Personal Finance');
});

test('distinguishes category management from adding a category', async () => {
  const { financeMessages } = await import('../src/index.js');
  assert.equal(financeMessages.zh.manageCategories, '管理分类');
  assert.equal(financeMessages.zh.addCategory, '添加分类');
  assert.equal(financeMessages.en.manageCategories, 'Manage categories');
  assert.equal(financeMessages.en.addCategory, 'Add category');
});


test('uses the category management API contract', async () => {
  const { createFinanceApi } = await import('../src/index.js');
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => []
    };
  };
  const api = createFinanceApi({ baseUrl: '/api/', fetchImpl });

  await api.searchCategories('早 午');
  await api.updateCategory(12, { name: '日用品' });
  await api.deleteCategory(12);

  assert.equal(calls[0].url, '/api/categories/manage?query=%E6%97%A9%20%E5%8D%88');
  assert.equal(calls[0].options.method, undefined);
  assert.equal(calls[1].url, '/api/categories/12');
  assert.equal(calls[1].options.method, 'PUT');
  assert.equal(calls[1].options.body, JSON.stringify({ name: '日用品' }));
  assert.equal(calls[2].url, '/api/categories/12');
  assert.equal(calls[2].options.method, 'DELETE');
});

test('builds weekly and monthly analytics ranges', async () => {
  const { ANALYTICS_PERIOD, buildAnalyticsRange, buildAnalyticsView } = await import('../src/index.js');
  const reference = new Date(2026, 10, 18);
  assert.deepEqual(buildAnalyticsRange(ANALYTICS_PERIOD.WEEK, reference), {
    startDate: '2026-11-16',
    endDate: '2026-11-18'
  });
  assert.deepEqual(buildAnalyticsRange(ANALYTICS_PERIOD.MONTH, reference), {
    startDate: '2026-11-01',
    endDate: '2026-11-18'
  });
  assert.deepEqual(buildAnalyticsView({
    startDate: '2026-11-16',
    endDate: '2026-11-17',
    totalAmountCents: 3000,
    expenseCount: 2,
    days: [
      { date: '2026-11-16', amountCents: 1000 },
      { date: '2026-11-17', amountCents: 2000 }
    ],
    categoryTotals: []
  }, ANALYTICS_PERIOD.WEEK), {
    period: ANALYTICS_PERIOD.WEEK,
    totalAmountCents: 3000,
    expenseCount: 2,
    activeDayCount: 2,
    averageAmountCents: 1500,
    maxAmountCents: 2000,
    days: [
      { date: '2026-11-16', amountCents: 1000 },
      { date: '2026-11-17', amountCents: 2000 }
    ],
    categoryTotals: []
  });
});

test('uses the finance analytics API contract', async () => {
  const { createFinanceApi } = await import('../src/index.js');
  const calls = [];
  const api = createFinanceApi({
    baseUrl: '/api',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({}) };
    }
  });
  await api.getAnalytics('2026-11-16', '2026-11-18');
  assert.equal(calls[0].url, '/api/analytics?startDate=2026-11-16&endDate=2026-11-18');
});
