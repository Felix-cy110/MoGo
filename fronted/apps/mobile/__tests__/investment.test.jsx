import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../src/platform/i18n';
import { PreferencesProvider } from '../src/platform/PreferencesProvider';
import { Action, LinkRow } from '../src/components/Primitives';
import InvestmentTargetScreen from '../src/screens/investment-management/InvestmentTargetScreen';
import InvestmentManagementScreen from '../src/screens/InvestmentManagementScreen';
import HomeScreen from '../src/screens/HomeScreen';
import { useInvestmentDetail } from '@mogo/investment-management-react';
import { createNativeApis } from '../src/services/nativeApi';

let tree;
const target = {
  id: 1,
  name: 'Bitcoin',
  symbol: 'BTC',
  quoteCurrency: 'USDT',
  note: '',
  archivedAt: null,
};
const trade = {
  id: 10,
  unitPrice: '60000',
  quoteAmount: '600',
  quantity: '0.01',
  occurredAt: '2026-11-24T00:00:37.123Z',
  note: 'first buy',
  clientRequestId: 'native-test-1',
};
const detail = {
  target,
  symbolLocked: true,
  summary: {
    totalQuoteAmount: '600',
    totalQuantity: '0.01',
    averageEntryPrice: '60000',
    buyCount: 1,
  },
  trades: [trade],
};
async function render(element, language = 'zh', theme = 'light') {
  await AsyncStorage.multiSet([
    ['mogo.language', language],
    ['mogo.theme', theme],
  ]);
  await i18n.changeLanguage(language);
  await act(async () => {
    tree = renderer.create(
      <PreferencesProvider>{element}</PreferencesProvider>,
    );
  });
}
beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation(() => {}));
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  tree = null;
  jest.restoreAllMocks();
  jest.useRealTimers();
});
const action = key =>
  tree.root
    .findAllByType(Action)
    .find(item => item.props.title === i18n.t(key));
const field = key =>
  tree.root
    .findAllByType(TextInput)
    .find(item => item.props.accessibilityLabel === i18n.t(key));

test.each([
  ['zh', 'light'],
  ['zh', 'dark'],
  ['en', 'light'],
  ['en', 'dark'],
])(
  'investment details and row editing render in %s/%s',
  async (language, theme) => {
    const api = {
      getTarget: async () => detail,
      updateTrade: jest.fn(async () => trade),
    };
    await render(
      <InvestmentTargetScreen api={api} targetId={1} />,
      language,
      theme,
    );
    expect(JSON.stringify(tree.toJSON())).toContain(
      i18n.t('investmentAveragePrice'),
    );
    const row = tree.root.findAll(
      item =>
        item.props.accessibilityLabel?.includes('600 USDT') &&
        item.props.onPress,
    )[0];
    await act(async () => row.props.onPress());
    expect(field('investmentQuoteAmount').props.value).toBe('600');
    await act(async () =>
      field('investmentQuoteAmount').props.onChangeText('900'),
    );
    await act(async () => action('investmentSave').props.onPress());
    expect(api.updateTrade).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        unitPrice: '60000',
        quoteAmount: '900',
        targetId: 1,
        occurredAt: trade.occurredAt,
      }),
    );
    expect(Alert.alert).toHaveBeenLastCalledWith(
      i18n.t('investmentSaved'),
      '',
      expect.any(Array),
      expect.any(Object),
    );
  },
);

test.each([
  ['zh', 'light'], ['zh', 'dark'], ['en', 'light'], ['en', 'dark'],
])('buy time is captured on press and retained after a failed save in %s/%s', async (language, theme) => {
  jest.useFakeTimers({ now: new Date('2026-11-25T15:59:37.456Z') });
  const api = {
    getTarget: async () => detail,
    addTrade: jest
      .fn()
      .mockRejectedValueOnce({ code: 'INTERNAL_ERROR' })
      .mockResolvedValue(trade),
  };
  await render(<InvestmentTargetScreen api={api} targetId={1} />, language, theme);
  await act(async () => {
    action('investmentAddTrade').props.onPress();
    // A delayed render or save must not replace the instant captured by the button.
    jest.setSystemTime(new Date('2026-11-25T16:02:00.000Z'));
  });
  await act(async () => action('investmentSave').props.onPress());
  expect(api.addTrade).not.toHaveBeenCalled();
  await act(async () =>
    field('investmentUnitPrice').props.onChangeText('0.000000000000000001'),
  );
  await act(async () =>
    field('investmentQuoteAmount').props.onChangeText(
      '999999999999999999.123456789012345678',
    ),
  );
  await act(async () => action('investmentSave').props.onPress());
  expect(field('investmentQuoteAmount').props.value).toBe(
    '999999999999999999.123456789012345678',
  );
  jest.setSystemTime(new Date('2026-11-26T00:00:00.000Z'));
  await act(async () => action('investmentSave').props.onPress());
  expect(api.addTrade).toHaveBeenCalledTimes(2);
  expect(api.addTrade.mock.calls[0][0].occurredAt).toBe('2026-11-25T15:59:37.456Z');
  expect(api.addTrade.mock.calls[0][0]).toEqual(api.addTrade.mock.calls[1][0]);
  expect(api.addTrade.mock.calls[0][0].unitPrice).toBe('0.000000000000000001');
  await act(async () => action('investmentAddTrade').props.onPress());
  await act(async () => field('investmentUnitPrice').props.onChangeText('60000'));
  await act(async () => field('investmentQuoteAmount').props.onChangeText('600'));
  await act(async () => action('investmentSave').props.onPress());
  expect(api.addTrade.mock.calls[2][0].occurredAt).toBe('2026-11-26T00:00:00.000Z');
  expect(api.addTrade.mock.calls[2][0].clientRequestId).not.toBe(api.addTrade.mock.calls[0][0].clientRequestId);
});

test('deletion requires confirmation and archived details are read-only', async () => {
  const api = {
    getTarget: async () => detail,
    deleteTrade: jest.fn(async () => ({})),
  };
  await render(<InvestmentTargetScreen api={api} targetId={1} />);
  const row = tree.root.findAll(
    item =>
      item.props.accessibilityLabel?.includes('600 USDT') && item.props.onPress,
  )[0];
  await act(async () => row.props.onPress());
  await act(async () => action('investmentDeleteTrade').props.onPress());
  expect(api.deleteTrade).not.toHaveBeenCalled();
  const buttons = Alert.alert.mock.calls.at(-1)[2];
  expect(buttons[0].style).toBe('cancel');
  await act(async () => buttons[1].onPress());
  expect(api.deleteTrade).toHaveBeenCalledWith(10);
  await act(async () => tree.unmount());
  await render(
    <InvestmentTargetScreen
      targetId={1}
      api={{
        getTarget: async () => ({
          ...detail,
          target: { ...target, archivedAt: '2026-11-24T00:00:00.000Z' },
        }),
      }}
    />,
  );
  expect(action('investmentAddTrade')).toBeUndefined();
  expect(action('investmentRestore')).toBeDefined();
});

test('committed save followed by refresh failure is not offered as another save', async () => {
  const api = {
    listTargets: jest
      .fn()
      .mockResolvedValueOnce([])
      .mockRejectedValue(new Error('read failed')),
    addTarget: jest.fn(async () => target),
  };
  await render(<InvestmentManagementScreen api={api} navigate={jest.fn()} />);
  await act(async () => action('investmentAddTarget').props.onPress());
  await act(async () => field('investmentName').props.onChangeText('Bitcoin'));
  await act(async () => field('investmentSymbol').props.onChangeText('btc'));
  await act(async () => action('investmentSave').props.onPress());
  expect(api.addTarget).toHaveBeenCalledTimes(1);
  expect(action('investmentSave')).toBeUndefined();
  expect(action('investmentRetry')).toBeDefined();
});

test('disabled builds hide investment and native adapter keeps decimal strings', async () => {
  await render(<HomeScreen features={[]} navigate={jest.fn()} />);
  expect(
    tree.root.findAllByType(LinkRow).map(item => item.props.title),
  ).not.toContain(i18n.t('investmentManagementFeatureName'));
  const bridge = {
    execute: jest.fn(async () => JSON.stringify({ ok: true, data: {} })),
  };
  const api = createNativeApis(bridge).investment;
  await api.addTrade({
    targetId: 1,
    unitPrice: '0.000000000000000001',
    quoteAmount: '100',
  });
  expect(bridge.execute).toHaveBeenCalledWith(
    'investment.addTrade',
    JSON.stringify({
      targetId: 1,
      unitPrice: '0.000000000000000001',
      quoteAmount: '100',
    }),
  );
  await api.archiveTarget(1, true);
  expect(bridge.execute).toHaveBeenLastCalledWith(
    'investment.archiveTarget',
    JSON.stringify({ id: 1, archived: true }),
  );
});

for (const builtinCode of ['BTC', 'ETH']) {
  test.each([
    ['zh', 'light'], ['zh', 'dark'], ['en', 'light'], ['en', 'dark'],
  ])(`${builtinCode} is protected and remains editable in %s/%s`, async (language, theme) => {
    const builtinTarget = { ...target, symbol: builtinCode, name: builtinCode, builtinCode };
    const api = {
      getTarget: async () => ({ ...detail, target: builtinTarget, symbolLocked: true, trades: [] }),
      updateTarget: jest.fn(async () => builtinTarget),
      archiveTarget: jest.fn(),
    };
    await render(<InvestmentTargetScreen api={api} targetId={1} />, language, theme);
    expect(action('investmentArchive')).toBeUndefined();
    expect(action('investmentAddTrade')).toBeDefined();
    await act(async () => action('investmentEditTarget').props.onPress());
    expect(field('investmentSymbol').props.editable).toBe(false);
    expect(field('investmentName').props.editable).toBe(true);
    expect(field('investmentNote').props.editable).toBe(true);
    expect(JSON.stringify(tree.toJSON())).toContain(i18n.t('investmentBuiltinHint'));
    await act(async () => field('investmentNote').props.onChangeText('updated note'));
    await act(async () => action('investmentSave').props.onPress());
    expect(api.updateTarget).toHaveBeenCalledWith(1, expect.objectContaining({ symbol: builtinCode, note: 'updated note' }));
    expect(api.archiveTarget).not.toHaveBeenCalled();
  });
}

test('shared detail hook prevents builtin archive before either platform calls its adapter', async () => {
  const api = {
    getTarget: async () => ({ ...detail, target: { ...target, builtinCode: 'BTC' } }),
    archiveTarget: jest.fn(),
  };
  let model;
  function Probe() { model = useInvestmentDetail({ api, targetId: 1 }); return null; }
  await render(<Probe />);
  await act(async () => expect(await model.archive(true)).toBe(false));
  expect(api.archiveTarget).not.toHaveBeenCalled();
  expect(model.feedback).toEqual({ key: 'investmentBuiltinProtected', presentation: 'dialog' });
});

test('backend protection errors are shown in the shared modal feedback', async () => {
  const api = {
    getTarget: async () => detail,
    archiveTarget: jest.fn(async () => { throw { code: 'INVESTMENT_BUILTIN_PROTECTED' }; }),
  };
  await render(<InvestmentTargetScreen api={api} targetId={1} />);
  await act(async () => action('investmentArchive').props.onPress());
  await act(async () => Alert.alert.mock.calls.at(-1)[2][1].onPress());
  expect(Alert.alert).toHaveBeenLastCalledWith(i18n.t('investmentBuiltinProtected'), '', expect.any(Array), expect.any(Object));
});
