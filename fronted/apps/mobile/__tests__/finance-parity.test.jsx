import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../src/platform/i18n';
import { PreferencesProvider } from '../src/platform/PreferencesProvider';
import FinanceScreen from '../src/screens/personal-finance/FinanceScreen';
import AnalyticsScreen from '../src/screens/personal-finance/AnalyticsScreen';
import CategoriesScreen from '../src/screens/personal-finance/CategoriesScreen';
import BudgetOverview from '../src/screens/personal-finance/BudgetOverview';
import CategoryTotals from '../src/screens/personal-finance/CategoryTotals';
import TrendChart from '../src/screens/personal-finance/TrendChart';
import { Action, Row } from '../src/components/Primitives';
import { formatMoney } from '@mogo/personal-finance-core';

let tree;
const categories = [
  { id: 1, code: 'MEAL', name: '正餐', active: true, notePolicy: 'OPTIONAL' },
  { id: 4, code: 'OTHER', name: '其他', active: true, notePolicy: 'REQUIRED' },
];
const oldExpense = {
  id: 1,
  categoryId: 1,
  categoryCode: 'MEAL',
  amountCents: 5000,
  occurredAt: '2026-11-22T12:00:00+08:00',
};
const newExpense = {
  ...oldExpense,
  amountCents: 7500,
  id: 2,
  occurredAt: '2026-11-23T12:00:00+08:00',
};
const dashboard = {
  budgetSet: true,
  budgetAmountCents: 10000,
  totalAmountCents: 12500,
  remainingAmountCents: -2500,
  usagePercent: 125,
  expenses: [oldExpense, newExpense],
  categoryTotals: [
    {
      categoryId: 1,
      categoryCode: 'MEAL',
      amountCents: 12500,
      expenseCount: 2,
    },
  ],
};
beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation(() => {}));
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  tree = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
});
async function render(element, language = 'zh', theme = 'light') {
  await i18n.changeLanguage(language);
  await AsyncStorage.multiSet([
    ['mogo.language', language],
    ['mogo.theme', theme],
  ]);
  await act(async () => {
    tree = renderer.create(
      <PreferencesProvider>{element}</PreferencesProvider>,
    );
  });
}
const action = key =>
  tree.root
    .findAllByType(Action)
    .find(item => item.props.title === i18n.t(key));
const input = key =>
  tree.root
    .findAllByType(TextInput)
    .find(item => item.props.accessibilityLabel === i18n.t(key));
const button = key =>
  tree.root.findAll(
    item =>
      item.props.accessibilityLabel === i18n.t(key) &&
      typeof item.props.onPress === 'function',
  )[0];

test.each([
  ['zh', 'light'],
  ['zh', 'dark'],
  ['en', 'light'],
  ['en', 'dark'],
])(
  'finance exposes Web overview, colocated actions and yesterday permissions in %s/%s',
  async (language, theme) => {
    const api = {
      getCategories: async () => categories,
      getDashboard: jest.fn(async () => dashboard),
      addExpense: jest.fn(async () => ({ alerts: [{ thresholdPercent: 80 }] })),
      updateExpense: jest.fn(),
    };
    const navigate = jest.fn();
    await render(
      <FinanceScreen api={api} navigate={navigate} date="2026-11-23" />,
      language,
      theme,
    );
    expect(
      tree.root
        .findByType(BudgetOverview)
        .findAllByType(Action)
        .map(item => item.props.title),
    ).toContain(i18n.t('saveBudget'));
    const categoryRow = tree.root
      .findAllByType(Row)
      .find(row => row.props.label === i18n.t('category'));
    expect(categoryRow.findByType(Action).props.title).toBe(
      i18n.t('manageCategories'),
    );
    const progress = tree.root.findAll(
      node => node.props.accessibilityRole === 'progressbar',
    )[0];
    expect(progress.props.accessibilityValue).toMatchObject({
      now: 100,
      text: '125%',
    });
    expect(
      JSON.stringify(tree.root.findByType(CategoryTotals).props.items),
    ).toContain('"expenseCount":2');
    await act(async () => button('expenseAnalysis').props.onPress());
    expect(navigate).toHaveBeenLastCalledWith('analytics');
    await act(async () => button('toggleToYesterday').props.onPress());
    expect(api.getDashboard).toHaveBeenLastCalledWith('2026-11-22');
    expect(action('saveBudget')).toBeUndefined();
    expect(action('manageCategories')).toBeUndefined();
    expect(JSON.stringify(tree.toJSON())).toContain(
      i18n.t('yesterdayExpenses'),
    );
    const expenses = () =>
      tree.root.findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          node.props.accessibilityLabel?.startsWith(i18n.t('editExpenseTitle')),
      );
    await act(async () => expenses()[0].props.onPress());
    expect(Alert.alert).toHaveBeenLastCalledWith(
      i18n.t('expenseEditForbidden'),
      '',
      expect.any(Array),
      expect.any(Object),
    );
    await act(async () =>
      expenses()
        .find(node =>
          node.props.accessibilityLabel.includes(formatMoney(7500, language)),
        )
        .props.onPress(),
    );
    expect(
      tree.root.findAllByType(Modal).some(modal => modal.props.visible),
    ).toBe(true);
    await act(async () => action('cancel').props.onPress());
    await act(async () => input('amountWithCurrency').props.onChangeText('5'));
    await act(async () => action('submit').props.onPress());
    expect(api.addExpense).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-11-22', amountCents: 500 }),
    );
    expect(Alert.alert).toHaveBeenLastCalledWith(
      i18n.t('warning'),
      i18n.t('alertWarningYesterday'),
      expect.any(Array),
      expect.any(Object),
    );
    await act(async () => button('toggleToToday').props.onPress());
    expect(api.getDashboard).toHaveBeenLastCalledWith('2026-11-23');
    expect(action('saveBudget')).toBeDefined();
  },
);

test('analytics shows four metrics, period tabs, category share and amount-only chart tooltip', async () => {
  const api = {
    getAnalytics: jest.fn(async (startDate, endDate) => ({
      startDate,
      endDate,
      totalAmountCents: 5000,
      expenseCount: 2,
      days: [{ date: endDate, amountCents: 5000 }],
      categoryTotals: [
        {
          categoryId: 1,
          categoryCode: 'MEAL',
          amountCents: 5000,
          expenseCount: 2,
        },
      ],
    })),
  };
  await render(<AnalyticsScreen api={api} />, 'en', 'dark');
  for (const key of [
    'activeDays',
    'expenseEntries',
    'dailyAverage',
    'totalSpent',
    'categoryBreakdown',
  ])
    expect(JSON.stringify(tree.toJSON())).toContain(i18n.t(key));
  expect(tree.root.findByType(CategoryTotals).props.items[0].sharePercent).toBe(
    100,
  );
  await act(async () => button('monthlyAnalysis').props.onPress());
  expect(api.getAnalytics.mock.calls.at(-1)[0].endsWith('-01')).toBe(true);
  const slider = tree.root
    .findByType(TrendChart)
    .find(node => !!node.props.onResponderMove);
  await act(async () =>
    slider.props.onResponderMove({ nativeEvent: { locationX: 1000 } }),
  );
  const SvgText = require('react-native-svg').Text;
  const labels = tree.root.findByType(TrendChart).findAllByType(SvgText);
  expect(labels.at(-1).props.children).toBe(formatMoney(5000, 'en'));
});

test('analytics shows an empty state instead of an empty chart', async () => {
  await render(
    <AnalyticsScreen
      api={{ getAnalytics: async () => ({ expenseCount: 0 }) }}
    />,
  );
  expect(tree.root.findAllByType(TrendChart)).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).toContain(i18n.t('noAnalysisData'));
});

test('category search, editing modal and deletion preserve Web interactions', async () => {
  jest.useFakeTimers();
  const api = {
    searchCategories: jest.fn(async query =>
      query === 'absent' ? [] : categories,
    ),
    updateCategory: jest.fn(async () => {}),
    deleteCategory: jest.fn(async () => {}),
  };
  await render(<CategoriesScreen api={api} />);
  await act(async () => jest.advanceTimersByTimeAsync(300));
  await act(async () => action('editCategory').props.onPress());
  expect(
    tree.root.findAllByType(Modal).some(modal => modal.props.visible),
  ).toBe(true);
  const fields = tree.root
    .findAllByType(TextInput)
    .filter(item => item.props.accessibilityLabel === i18n.t('categoryName'));
  expect(fields[0].props.value).toBe('');
  await act(async () => fields[1].props.onChangeText('晚餐'));
  await act(async () => action('saveCategory').props.onPress());
  expect(api.updateCategory).toHaveBeenCalledWith(1, { name: '晚餐' });
  await act(async () => action('deleteCategory').props.onPress());
  const confirmation = Alert.alert.mock.calls
    .at(-1)[2]
    .find(item => item.style === 'destructive');
  expect(api.deleteCategory).not.toHaveBeenCalled();
  await act(async () => confirmation.onPress());
  expect(api.deleteCategory).toHaveBeenCalledWith(1);
  await act(async () => input('categorySearch').props.onChangeText('absent'));
  await act(async () => jest.advanceTimersByTimeAsync(300));
  expect(api.searchCategories).toHaveBeenLastCalledWith('absent');
  expect(JSON.stringify(tree.toJSON())).toContain(i18n.t('noCategoriesFound'));
});

test('yesterday accepts an expense without a historical budget', async () => {
  const api = {
    getCategories: async () => categories,
    getDashboard: async () => ({
      ...dashboard,
      budgetSet: false,
      expenses: [],
    }),
    addExpense: jest.fn(async () => ({ alerts: [] })),
  };
  await render(
    <FinanceScreen api={api} navigate={jest.fn()} date="2026-11-23" />,
  );
  await act(async () => button('toggleToYesterday').props.onPress());
  await act(async () =>
    input('amountWithCurrency').props.onChangeText('12.50'),
  );
  await act(async () => action('submit').props.onPress());
  expect(api.addExpense).toHaveBeenCalledWith(
    expect.objectContaining({ date: '2026-11-22', amountCents: 1250 }),
  );
});

test('finance settings entry returns to the financial page', async () => {
  const AppNavigator = require('../src/AppNavigator').default;
  const IconButton = require('../src/components/IconButton').default;
  const ToolboxFeatureRow =
    require('../src/screens/ToolboxFeatureRow').default;
  await render(
    <AppNavigator
      apis={{
        capabilities: async () => ({ features: ['personal-finance'] }),
        finance: {
          getCategories: async () => categories,
          getDashboard: async () => dashboard,
        },
      }}
    />,
  );
  await act(async () =>
    tree.root.findAllByType(ToolboxFeatureRow)[0].props.onPress(),
  );
  const icon = name =>
    tree.root.findAllByType(IconButton).find(item => item.props.icon === name);
  await act(async () => icon('settings').props.onPress());
  expect(JSON.stringify(tree.toJSON())).toContain(i18n.t('appearance'));
  await act(async () => icon('back').props.onPress());
  expect(tree.root.findAllByType(BudgetOverview)).toHaveLength(1);
});
