import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../src/platform/i18n';
import { PreferencesProvider } from '../src/platform/PreferencesProvider';
import { Action, Label } from '../src/components/Primitives';
import InvestmentTargetScreen from '../src/screens/investment-management/InvestmentTargetScreen';
import InvestmentSummary from '../src/screens/investment-management/InvestmentSummary';
import InvestmentManagementScreen from '../src/screens/InvestmentManagementScreen';
import HomeScreen from '../src/screens/HomeScreen';
import ToolboxFeatureRow from '../src/screens/ToolboxFeatureRow';
import { createNativeApis } from '../src/services/nativeApi';

let tree;
const target = {
  id: 1,
  name: 'Bitcoin',
  symbol: 'BTC',
  quoteCurrency: 'USDT',
  note: '',
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

test('deletion requires confirmation', async () => {
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
    tree.root.findAllByType(ToolboxFeatureRow).map(item => item.props.title),
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
  await api.listTargets();
  expect(bridge.execute).toHaveBeenLastCalledWith('investment.listTargets', '{}');
  await api.deleteTarget(7);
  expect(bridge.execute).toHaveBeenLastCalledWith(
    'investment.deleteTarget',
    JSON.stringify({ id: 7 }),
  );
});

test('total bought quantity uses two significant digits in the mobile summary', async () => {
  await render(
    <InvestmentSummary
      summary={{
        totalQuoteAmount: '100',
        totalQuantity: '0.00123456789',
        averageEntryPrice: '81000',
        buyCount: 1,
      }}
      symbol="BTC"
    />,
  );
  expect(JSON.stringify(tree.toJSON())).toContain('0.0012');
  expect(JSON.stringify(tree.toJSON())).not.toContain('0.00123456789');
});

for (const builtinCode of ['BTC', 'ETH']) {
  test.each([
    ['zh', 'light'], ['zh', 'dark'], ['en', 'light'], ['en', 'dark'],
  ])(`${builtinCode} keeps its code but can be deleted in %s/%s`, async (language, theme) => {
    const builtinTarget = { ...target, symbol: builtinCode, name: builtinCode, builtinCode };
    const api = {
      getTarget: async () => ({ ...detail, target: builtinTarget, symbolLocked: true, trades: [] }),
      updateTarget: jest.fn(async () => builtinTarget),
      deleteTarget: jest.fn(async () => ({})),
    };
    await render(<InvestmentTargetScreen api={api} targetId={1} />, language, theme);
    expect(action('investmentAddTrade')).toBeDefined();
    await act(async () => action('investmentEditTarget').props.onPress());
    expect(field('investmentSymbol').props.editable).toBe(false);
    expect(field('investmentName').props.editable).toBe(true);
    expect(field('investmentNote').props.editable).toBe(true);
    expect(action('investmentDeleteTarget')).toBeDefined();
    expect(JSON.stringify(tree.toJSON())).toContain(i18n.t('investmentBuiltinHint'));
    await act(async () => field('investmentNote').props.onChangeText('updated note'));
    await act(async () => action('investmentSave').props.onPress());
    expect(api.updateTarget).toHaveBeenCalledWith(1, expect.objectContaining({ symbol: builtinCode, note: 'updated note' }));
  });
}

test('deleting an unused default confirms in a modal and returns to the list', async () => {
  const api = {
    getTarget: async () => ({ ...detail, target: { ...target, builtinCode: 'BTC' }, trades: [] }),
    deleteTarget: jest.fn(async () => ({})),
  };
  const onBack = jest.fn();
  await render(<InvestmentTargetScreen api={api} targetId={1} onBack={onBack} />);
  await act(async () => action('investmentEditTarget').props.onPress());
  await act(async () => action('investmentDeleteTarget').props.onPress());
  expect(Alert.alert).toHaveBeenLastCalledWith(
    i18n.t('investmentDeleteTargetConfirm'), '', expect.any(Array),
  );
  const buttons = Alert.alert.mock.calls.at(-1)[2];
  await act(async () => buttons.find(button => button.text === i18n.t('investmentConfirm')).onPress());
  expect(api.deleteTarget).toHaveBeenCalledWith(1);
  expect(onBack).toHaveBeenCalledWith();
});

test('backend protection errors are shown in the shared modal feedback', async () => {
  const api = {
    getTarget: async () => detail,
    updateTarget: jest.fn(async () => { throw { code: 'INVESTMENT_BUILTIN_PROTECTED' }; }),
  };
  await render(<InvestmentTargetScreen api={api} targetId={1} />);
  await act(async () => action('investmentEditTarget').props.onPress());
  await act(async () => action('investmentSave').props.onPress());
  expect(Alert.alert).toHaveBeenLastCalledWith(i18n.t('investmentBuiltinProtected'), '', expect.any(Array), expect.any(Object));
});

test.each([
  ['zh', 'light'], ['zh', 'dark'], ['en', 'light'], ['en', 'dark'],
])('one searchable list includes legacy investments in %s/%s', async (language, theme) => {
  const legacy = { ...target, id: 2, name: 'Solana', symbol: 'SOL', archivedAt: '2026-11-24T00:00:00.000Z' };
  const api = {
    listTargets: jest.fn(async () => [
      { target, summary: detail.summary },
      { target: legacy, summary: detail.summary },
    ]),
    getTarget: async () => ({ ...detail, target: legacy }),
    updateTrade: jest.fn(async () => trade),
  };
  const navigate = jest.fn();
  await render(<InvestmentManagementScreen api={api} navigate={navigate} />, language, theme);
  expect(api.listTargets).toHaveBeenCalledWith();
  expect(tree.root.findAllByType(Action).map(item => item.props.title)).toEqual([i18n.t('investmentAddTarget')]);
  const search = () => tree.root.findAllByType(TextInput).find(item => item.props.accessibilityLabel === i18n.t('investmentSearch'));
  await act(async () => search().props.onChangeText('sol'));
  const symbol = tree.root.findAllByType(Label).find(item => React.Children.toArray(item.props.children).includes('SOL'));
  expect(symbol).toBeDefined();
  let row = symbol.parent;
  while (row && typeof row.props.onPress !== 'function') row = row.parent;
  expect(row).not.toBeNull();
  await act(async () => row.props.onPress());
  expect(navigate).toHaveBeenCalledWith('investmentTarget', 2);
  await act(async () => tree.unmount());
  await render(<InvestmentTargetScreen api={api} targetId={2} />, language, theme);
  expect(tree.root.findAllByType(Action).map(item => item.props.title)).toEqual([i18n.t('investmentAddTrade'), i18n.t('investmentEditTarget')]);
  const buyRow = tree.root.findAll(item => item.props.accessibilityLabel?.includes('600 USDT') && item.props.onPress)[0];
  expect(buyRow.props.disabled).not.toBe(true);
  await act(async () => buyRow.props.onPress());
  await act(async () => field('investmentQuoteAmount').props.onChangeText('800'));
  await act(async () => action('investmentSave').props.onPress());
  expect(api.updateTrade).toHaveBeenCalledWith(10, expect.objectContaining({ targetId: 2, quoteAmount: '800', occurredAt: trade.occurredAt }));
});
