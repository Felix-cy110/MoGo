import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExpensePayload,
  buildExpenseUpdatePayload,
  canEditExpenseForDay,
  centsToYuan,
  createDailyFinanceAccess,
  createExpenseDraft,
  formatLocalDate,
  shiftLocalDate,
  isOtherCategory,
  NOTE_POLICY,
  sortCategoriesOtherLast,
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

test('formats and shifts local dates for API requests', () => {
  assert.equal(formatLocalDate(new Date(2026, 10, 16)), '2026-11-16');
  assert.equal(shiftLocalDate('2026-11-16', -1), '2026-11-15');
  assert.equal(shiftLocalDate('2026-03-01', -1), '2026-02-28');
});

test('allows only expense creation for historical daily views', () => {
  assert.deepEqual(createDailyFinanceAccess({
    selectedDate: '2026-11-20',
    todayDate: '2026-11-20'
  }), {
    isToday: true,
    canAddExpense: true,
    canSaveBudget: true,
    canManageCategories: true
  });
  assert.deepEqual(createDailyFinanceAccess({
    selectedDate: '2026-11-19',
    todayDate: '2026-11-20'
  }), {
    isToday: false,
    canAddExpense: true,
    canSaveBudget: false,
    canManageCategories: false
  });
});

test('edits only records created today when viewing yesterday', () => {
  const todayDate = '2026-11-20';
  const selectedDate = '2026-11-19';
  assert.equal(canEditExpenseForDay({
    selectedDate,
    todayDate,
    expense: { occurredAt: '2026-11-20T09:30:00' }
  }), true);
  assert.equal(canEditExpenseForDay({
    selectedDate,
    todayDate,
    expense: { occurredAt: '2026-11-19T20:15:00' }
  }), false);
  assert.equal(canEditExpenseForDay({
    selectedDate: todayDate,
    todayDate,
    expense: { occurredAt: '2026-11-19T20:15:00' }
  }), true);
});

test('enforces budget and required-note rules', () => {
  assert.equal(validateExpenseDraft({ budgetSet: false }), 'budgetMissing');
  assert.equal(validateExpenseDraft({ budgetSet: false, budgetRequired: false, amountCents: 100 }), null);
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
  assert.equal(resolveApiErrorMessageKey('EXPENSE_EDIT_FORBIDDEN'), 'expenseEditForbidden');
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

test('places Other last while preserving custom category order and source data', () => {
  const meal = Object.freeze({ id: 1, code: 'MEAL' });
  const other = Object.freeze({ id: 4, code: 'OTHER', name: 'Renamed' });
  const custom = Object.freeze({ id: 5, code: 'CUSTOM_5', name: '其他' });
  const custom2 = Object.freeze({ id: 6, code: 'CUSTOM_6', name: 'Other' });
  for (const items of [[other, meal, custom, custom2], [meal, other, custom, custom2], [meal, custom, custom2, other]]) {
    const source = Object.freeze(items);
    const original = [...source];
    const result = sortCategoriesOtherLast(source);
    assert.deepEqual(result, [meal, custom, custom2, other]);
    assert.deepEqual(source, original);
    assert.notEqual(result, source);
    assert.equal(result.at(-1), other);
  }
  assert.deepEqual(sortCategoriesOtherLast([]), []);
  assert.deepEqual(sortCategoriesOtherLast([custom2, meal, custom]), [custom2, meal, custom]);
});

test('identifies Other by stable translation keys and summary category codes', () => {
  const other = { i18nKey: 'category.other' };
  const meal = { i18nKey: 'category.meal' };
  assert.deepEqual(sortCategoriesOtherLast([other, meal]), [meal, other]);
  const totals = [
    { categoryCode: 'OTHER', amountCents: 5000 },
    { categoryCode: 'CUSTOM_5', amountCents: 2000 },
    { categoryCode: 'MEAL', amountCents: 1000 }
  ];
  assert.deepEqual(sortCategoriesOtherLast(totals), [totals[1], totals[2], totals[0]]);
});

test('protects only the built-in Other category independently of name and language', () => {
  assert.equal(isOtherCategory({ code: 'OTHER', name: 'Renamed' }), true);
  assert.equal(isOtherCategory({ i18nKey: 'category.other' }), true);
  assert.equal(isOtherCategory({ categoryCode: 'OTHER' }), true);
  assert.equal(isOtherCategory({ code: 'MEAL', system: true }), false);
  assert.equal(isOtherCategory({ code: 'CUSTOM_5', name: '其他' }), false);
  assert.equal(isOtherCategory({ code: 'CUSTOM_6', name: 'Other' }), false);
  assert.equal(isOtherCategory(null), false);
  assert.equal(isOtherCategory(undefined), false);
});

test('localizes concise category notices in both languages', async () => {
  const { financeMessages, resolveApiErrorMessageKey } = await import('../src/index.js');
  assert.equal(resolveApiErrorMessageKey('CATEGORY_PROTECTED'), 'categoryProtected');
  assert.equal(financeMessages.zh.categoryNameExists, '分类已存在');
  assert.equal(financeMessages.zh.categoryEditForbidden, '禁止编辑');
  assert.equal(financeMessages.zh.categoryDeleteForbidden, '禁止删除');
  assert.equal(financeMessages.en.categoryNameExists, 'Category already exists');
  assert.equal(financeMessages.en.categoryEditForbidden, 'Editing not allowed');
  assert.equal(financeMessages.en.categoryDeleteForbidden, 'Deletion not allowed');
});

test('uses dialogs for duplicate categories and operation-specific protection errors', async () => {
  const { buildCategoryErrorFeedback } = await import('../src/index.js');
  for (const operation of ['add', 'edit']) {
    assert.deepEqual(buildCategoryErrorFeedback('CATEGORY_NAME_EXISTS', operation), {
      type: 'error', key: 'categoryNameExists', presentation: 'dialog'
    });
  }
  assert.deepEqual(buildCategoryErrorFeedback('CATEGORY_PROTECTED', 'edit'), {
    type: 'error', key: 'categoryEditForbidden', presentation: 'dialog'
  });
  assert.deepEqual(buildCategoryErrorFeedback('CATEGORY_PROTECTED', 'delete'), {
    type: 'error', key: 'categoryDeleteForbidden', presentation: 'dialog'
  });
  assert.deepEqual(buildCategoryErrorFeedback('UNKNOWN', 'add'), {
    type: 'error', key: 'requestFailed', presentation: 'inline'
  });
  assert.deepEqual(buildCategoryErrorFeedback('VALIDATION_ERROR', 'edit'), {
    type: 'error', key: 'validationError', presentation: 'inline'
  });
});

test('places Other last in weekly and monthly analytics summaries', async () => {
  const { ANALYTICS_PERIOD, buildAnalyticsView } = await import('../src/index.js');
  const categoryTotals = [
    { categoryCode: 'OTHER', amountCents: 5000 },
    { categoryCode: 'MEAL', amountCents: 1000 }
  ];
  for (const period of Object.values(ANALYTICS_PERIOD)) {
    const view = buildAnalyticsView({ categoryTotals }, period);
    assert.deepEqual(view.categoryTotals.map(({ sharePercent, ...category }) => category), [categoryTotals[1], categoryTotals[0]]);
    assert.equal(categoryTotals[0].categoryCode, 'OTHER');
  }
});


test('includes localized toolbox entry labels', async () => {
  const { financeMessages } = await import('../src/index.js');
  assert.equal(financeMessages.zh.toolboxName, '魔狗百宝箱');
  assert.equal(financeMessages.zh.financeFeatureName, '个人财务管理');
  assert.equal(financeMessages.en.toolboxName, 'MoGo Toolbox');
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
  const analyticsView = buildAnalyticsView({
    startDate: '2026-11-16',
    endDate: '2026-11-18',
    totalAmountCents: 3000,
    expenseCount: 2,
    days: [
      { date: '2026-11-16', amountCents: 1000 },
      { date: '2026-11-18', amountCents: 2000 }
    ],
    categoryTotals: []
  }, ANALYTICS_PERIOD.WEEK);
  assert.deepEqual(analyticsView.days, [
    { date: '2026-11-16', amountCents: 1000 },
    { date: '2026-11-17', amountCents: 0, expenseCount: 0 },
    { date: '2026-11-18', amountCents: 2000 }
  ]);

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
