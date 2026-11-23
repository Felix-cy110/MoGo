import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, Appearance, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { resources } from '../src/platform/i18n';
import { PreferencesProvider } from '../src/platform/PreferencesProvider';
import HomeScreen from '../src/screens/HomeScreen';
import ProfileScreen from '../src/screens/ProfileScreen';
import FinanceScreen from '../src/screens/personal-finance/FinanceScreen';
import AnalyticsScreen from '../src/screens/personal-finance/AnalyticsScreen';
import CategoriesScreen from '../src/screens/personal-finance/CategoriesScreen';
import SettingsScreen from '../src/screens/SettingsScreen';
import { Action, LinkRow } from '../src/components/Primitives';

let tree;
beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  tree = null;
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
const categories = [
  { id: 1, code: 'MEAL', name: '正餐', active: true, notePolicy: 'OPTIONAL' },
  { id: 4, code: 'OTHER', name: '其他', active: true, notePolicy: 'REQUIRED' },
  { id: 5, code: 'CUSTOM', name: '咖啡', active: true, notePolicy: 'OPTIONAL' },
];
const dashboard = {
  budgetSet: true,
  budgetAmountCents: 10000,
  totalAmountCents: 5000,
  remainingAmountCents: 5000,
  categoryTotals: [],
  expenses: [
    {
      id: 1,
      categoryCode: 'MEAL',
      categoryId: 1,
      categoryName: '正餐',
      note: null,
      amountCents: 5000,
      occurredAt: '2026-11-19T12:00:00+08:00',
    },
  ],
};

test.each([
  ['zh', 'light'],
  ['en', 'dark'],
  ['en', 'light'],
  ['zh', 'dark'],
])(
  'home, profile, settings and analytics render in %s/%s',
  async (language, theme) => {
    await render(
      <HomeScreen features={['personal-finance']} navigate={jest.fn()} />,
      language,
      theme,
    );
    const rows = tree.root.findAllByType(LinkRow);
    expect(rows[0].props.title).toBe(i18n.t('financeFeatureName'));
    expect(rows[1].props.title).toBe(i18n.t('leetcodeInterviewFeatureName'));
    await act(async () => tree.unmount());
    await render(<SettingsScreen />, language, theme);
    expect(JSON.stringify(tree.toJSON())).toContain(i18n.t('appearance'));
    await act(async () => tree.unmount());
    await render(
      <ProfileScreen
        api={{
          getProfile: async () => ({ monthlyIncomeCents: 125050 }),
          saveProfile: jest.fn(),
        }}
      />,
      language,
      theme,
    );
    expect(
      tree.root
        .findAllByType(TextInput)
        .find(
          input =>
            input.props.accessibilityLabel === i18n.t('profileMonthlyIncome'),
        ).props.value,
    ).toBe('1250.50');
    await act(async () => tree.unmount());
    await render(
      <AnalyticsScreen
        api={{
          getAnalytics: async () => ({
            startDate: '2026-11-19',
            endDate: '2026-11-19',
            totalAmountCents: 5000,
            days: [{ date: '2026-11-19', amountCents: 5000 }],
            categoryTotals: [],
          }),
        }}
      />,
      language,
      theme,
    );
    expect(JSON.stringify(tree.toJSON())).toContain(i18n.t('spendingTrend'));
  },
);

test('profile saves optional monthly income and uses a modal', async () => {
  const api = {
    getProfile: async () => ({}),
    saveProfile: jest.fn(async payload => payload),
  };
  await render(<ProfileScreen api={api} />);
  const input = tree.root
    .findAllByType(TextInput)
    .find(
      item => item.props.accessibilityLabel === i18n.t('profileMonthlyIncome'),
    );
  await act(async () => input.props.onChangeText('1234.56'));
  await act(async () => tree.root.findByType(Action).props.onPress());
  expect(api.saveProfile).toHaveBeenCalledWith(
    expect.objectContaining({ monthlyIncomeCents: 123456, name: null }),
  );
  expect(Alert.alert).toHaveBeenCalledWith(
    i18n.t('profileSaved'),
    '',
    expect.any(Array),
    expect.any(Object),
  );
});

test('finance uses shared rules, sorts Other last and edits by pressing an expense', async () => {
  const api = {
    getCategories: async () => categories,
    getDashboard: async () => dashboard,
    addExpense: jest.fn(),
    updateExpense: jest.fn(),
    saveBudget: jest.fn(),
  };
  await render(
    <FinanceScreen api={api} navigate={jest.fn()} date="2026-11-19" />,
  );
  const ChoiceField = require('../src/components/ChoiceField').default;
  expect(tree.root.findByType(ChoiceField).props.options.at(-1).value).toBe(
    '4',
  );
  const expense = tree.root.findAll(
    node =>
      node.props.accessibilityLabel?.startsWith?.(i18n.t('editExpenseTitle')) &&
      node.props.onPress,
  )[0];
  await act(async () => expense.props.onPress());
  expect(JSON.stringify(tree.toJSON())).toContain(i18n.t('editExpenseTitle'));
  expect(
    tree.root
      .findAllByType(TextInput)
      .some(input => input.props.value === '50.00'),
  ).toBe(true);
});

test('category protection and duplicate-name feedback use concise dialogs', async () => {
  jest.useFakeTimers();
  const api = {
    searchCategories: async () => categories,
    addCategory: jest.fn(async () => {
      throw { code: 'CATEGORY_NAME_EXISTS' };
    }),
  };
  await render(<CategoriesScreen api={api} />);
  await act(async () => jest.advanceTimersByTimeAsync(300));
  const edit = tree.root
    .findAllByType(Action)
    .filter(item => item.props.title === i18n.t('editCategory'))
    .at(-1);
  await act(async () => edit.props.onPress());
  expect(Alert.alert).toHaveBeenLastCalledWith(
    i18n.t('categoryEditForbidden'),
    '',
    expect.any(Array),
    expect.any(Object),
  );
  const name = tree.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === i18n.t('categoryName'));
  await act(async () => name.props.onChangeText('咖啡'));
  await act(async () =>
    tree.root
      .findAllByType(Action)
      .find(item => item.props.title === i18n.t('addCategory'))
      .props.onPress(),
  );
  expect(Alert.alert).toHaveBeenLastCalledWith(
    i18n.t('categoryNameExists'),
    '',
    expect.any(Array),
    expect.any(Object),
  );
  jest.useRealTimers();
});

test('every mobile translation exists in both languages', () => {
  expect(Object.keys(resources.zh.translation).sort()).toEqual(
    Object.keys(resources.en.translation).sort(),
  );
});

test('system theme resets the native appearance override', async () => {
  const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
  await render(<SettingsScreen />, 'zh', 'system');
  expect(setColorScheme).toHaveBeenLastCalledWith('auto');
});

test('finance requires Other notes and shows budget alerts after insertion', async () => {
  const api = {
    getCategories: async () => categories,
    getDashboard: async () => dashboard,
    addExpense: jest.fn(async () => ({
      alerts: [{ thresholdPercent: 100, messageKey: 'alert.budget.exceeded' }],
    })),
  };
  await render(
    <FinanceScreen api={api} navigate={jest.fn()} date="2026-11-19" />,
  );
  const ChoiceField = require('../src/components/ChoiceField').default;
  await act(async () =>
    tree.root.findAllByType(TextInput)[1].props.onChangeText('80.00'),
  );
  await act(async () => tree.root.findByType(ChoiceField).props.onChange('4'));
  const submit = () =>
    tree.root
      .findAllByType(Action)
      .find(item => item.props.title === i18n.t('submit'))
      .props.onPress();
  await act(async () => submit());
  expect(api.addExpense).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenLastCalledWith(
    i18n.t('noteRequired'),
    '',
    expect.any(Array),
    expect.any(Object),
  );
  await act(async () =>
    tree.root.findAllByType(TextInput)[2].props.onChangeText('说明'),
  );
  await act(async () => submit());
  expect(api.addExpense).toHaveBeenCalledWith(
    expect.objectContaining({
      date: '2026-11-19',
      amountCents: 8000,
      categoryId: 4,
      note: '说明',
    }),
  );
  expect(Alert.alert).toHaveBeenLastCalledWith(
    i18n.t('warning'),
    i18n.t('alertExceeded'),
    expect.any(Array),
    expect.any(Object),
  );
});

test('failed profile loading never exposes an editable empty form', async () => {
  await render(
    <ProfileScreen
      api={{
        getProfile: async () => {
          throw { code: 'PROFILE_READ_FAILED' };
        },
      }}
    />,
  );
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  expect(
    tree.root.findAllByType(Action).map(action => action.props.title),
  ).toEqual([i18n.t('profileRetry')]);
});

test('navigation honors native feature capabilities and opens settings', async () => {
  const AppNavigator = require('../src/AppNavigator').default;
  await render(
    <AppNavigator apis={{ capabilities: async () => ({ features: [] }) }} />,
  );
  expect(tree.root.findAllByType(LinkRow).map(row => row.props.title)).toEqual([
    i18n.t('leetcodeInterviewFeatureName'),
  ]);
  const IconButton = require('../src/components/IconButton').default;
  expect(
    tree.root.findAllByType(IconButton).map(button => button.props.label),
  ).not.toContain(i18n.t('userProfile'));
  await act(async () =>
    tree.root
      .findAllByType(IconButton)
      .find(button => button.props.label === i18n.t('settings'))
      .props.onPress(),
  );
  expect(JSON.stringify(tree.toJSON())).toContain(i18n.t('appearance'));
});
