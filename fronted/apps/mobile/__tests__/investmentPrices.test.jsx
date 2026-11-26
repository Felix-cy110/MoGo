import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AppState, Alert } from 'react-native';
import { useNetInfoInstance } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInvestmentPrices } from '@mogo/investment-management-react';
import i18n from '../src/platform/i18n';
import { PreferencesProvider } from '../src/platform/PreferencesProvider';
import InvestmentManagementScreen from '../src/screens/InvestmentManagementScreen';
import InvestmentTargetScreen from '../src/screens/investment-management/InvestmentTargetScreen';
import InvestmentMarketPrice from '../src/screens/investment-management/InvestmentMarketPrice';
import { useMarketPrices as useWebMarketPrices } from '../../web/src/features/investment-management/useMarketPrices';

const btc = { id: 1, name: 'BTC', symbol: 'BTC', quoteCurrency: 'USDT', builtinCode: 'BTC' };
const eth = { ...btc, id: 2, name: 'ETH', symbol: 'ETH', builtinCode: 'ETH' };
const sol = { ...btc, id: 3, name: 'BTC', symbol: 'SOL', builtinCode: null };
const summary = { totalQuoteAmount: '600', totalQuantity: '0.01', averageEntryPrice: '60000', buyCount: 1 };
const initialAppState = AppState.currentState;
let tree;
let prices;
let appStateListeners;
let removeAppState;
function Probe(props) { prices = useInvestmentPrices(props); return null; }
const marketClient = () => ({
  subscribe: jest.fn((symbols, listener) => {
    listener(Object.fromEntries(symbols.map(symbol => [symbol, symbol === 'BTC' ? '59045.1' : '2001.23'])));
    return jest.fn();
  }),
});
const push = async (client, value, subscription = client.subscribe.mock.calls.length - 1) => {
  await act(async () => client.subscribe.mock.calls[subscription][1](value));
};
async function render(element) {
  await act(async () => { tree = renderer.create(element); });
}
async function update(element) {
  await act(async () => tree.update(element));
}
async function advance(ms) {
  await act(async () => { jest.advanceTimersByTime(ms); });
}
async function changeAppState(nextState) {
  AppState.currentState = nextState;
  await act(async () => {
    await Promise.all(
      [...appStateListeners].map(listener => listener(nextState)),
    );
  });
}
beforeEach(() => {
  jest.useFakeTimers();
  AppState.currentState = 'active';
  useNetInfoInstance.mockReturnValue({ netInfo: { isConnected: true } });
  appStateListeners = new Set();
  removeAppState = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, listener) => {
    appStateListeners.add(listener);
    return {
      remove: () => {
        appStateListeners.delete(listener);
        removeAppState();
      },
    };
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  tree = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
  AppState.currentState = initialAppState;
  useNetInfoInstance.mockReturnValue({ netInfo: { isConnected: false } });
});

test('deduplicates subscriptions, preserves them across target reordering and receives pushed prices', async () => {
  const client = marketClient();
  const props = { targets: [btc, btc, eth, sol], enabled: true, client };
  await render(<Probe {...props} />);
  expect(client.subscribe.mock.calls[0][0]).toEqual(['BTC', 'ETH']);
  expect(prices).toEqual({ BTC: '59045.1', ETH: '2001.23' });
  await update(<Probe {...props} targets={[btc, eth, btc, sol]} />);
  expect(client.subscribe).toHaveBeenCalledTimes(1);
  await push(client, { ETH: '2002' });
  expect(prices).toEqual({ ETH: '2002' });
  await advance(60_000);
  expect(client.subscribe).toHaveBeenCalledTimes(1);
});

test('going offline unsubscribes, ignores late pushes and reconnect starts a fresh subscription', async () => {
  const client = marketClient();
  const props = { targets: [btc], enabled: true, client };
  await render(<Probe {...props} />);
  await update(<Probe {...props} enabled={false} />);
  expect(client.subscribe.mock.results[0].value).toHaveBeenCalledTimes(1);
  expect(prices).toEqual({});
  await push(client, { BTC: '1' });
  await advance(60_000);
  expect(prices).toEqual({});
  expect(client.subscribe).toHaveBeenCalledTimes(1);
  await update(<Probe {...props} />);
  expect(prices).toEqual({ BTC: '59045.1' });
  expect(client.subscribe).toHaveBeenCalledTimes(2);
  await push(client, { BTC: '1' }, 0);
  expect(prices).toEqual({ BTC: '59045.1' });
});

test('unmount releases the subscription and time passing does not resubscribe', async () => {
  const client = marketClient();
  await render(<Probe targets={[btc]} enabled client={client} />);
  await act(async () => tree.unmount());
  tree = null;
  expect(client.subscribe.mock.results[0].value).toHaveBeenCalledTimes(1);
  await advance(120_000);
  expect(client.subscribe).toHaveBeenCalledTimes(1);
});

test('changing target or client ignores messages from the previous subscription', async () => {
  const oldClient = marketClient();
  await render(<Probe targets={[btc]} enabled client={oldClient} />);
  const client = marketClient();
  await update(<Probe targets={[eth]} enabled client={client} />);
  await push(oldClient, { BTC: '1' });
  expect(prices).toEqual({ ETH: '2001.23' });
  expect(oldClient.subscribe.mock.results[0].value).toHaveBeenCalledTimes(1);
  await update(<Probe targets={[sol]} enabled client={client} />);
  expect(prices).toEqual({});
  expect(client.subscribe.mock.results[0].value).toHaveBeenCalledTimes(1);
  expect(client.subscribe).toHaveBeenCalledTimes(1);
});

test.each([['zh', 'light'], ['zh', 'dark'], ['en', 'light'], ['en', 'dark']])(
  'list and detail display pushed prices without affecting averages in %s/%s', async (language, theme) => {
    await AsyncStorage.multiSet([['mogo.language', language], ['mogo.theme', theme]]);
    await i18n.changeLanguage(language);
    const client = marketClient();
    const api = {
      listTargets: async () => [btc, eth, sol].map(target => ({ target, summary })),
      getTarget: async () => ({ target: btc, summary, trades: [], symbolLocked: true }),
    };
    await render(<PreferencesProvider><InvestmentManagementScreen api={api} marketClient={client} navigate={jest.fn()} /></PreferencesProvider>);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('59,045.1 USDT');
    expect(json).toContain('2,001.23 USDT');
    expect(json).toContain(
      i18n.t('investmentProfitLoss', {
        amount: '-9.55',
        percentage: '-1.59',
      }),
    );
    expect(json).toContain('60,000');
    expect(client.subscribe.mock.calls[0][0]).toEqual(['BTC', 'ETH']);
    await update(<PreferencesProvider><InvestmentTargetScreen api={api} marketClient={client} targetId={1} /></PreferencesProvider>);
    await push(client, { BTC: '59050' });
    expect(JSON.stringify(tree.toJSON())).toContain('59,050 USDT');
    expect(JSON.stringify(tree.toJSON())).toContain('60,000');
    expect(Alert.alert).not.toHaveBeenCalled();
  },
);

test('investment list hides profit and loss when the live price is unavailable', async () => {
  const client = marketClient();
  const api = { listTargets: async () => [{ target: btc, summary }] };
  const screen = () => (
    <PreferencesProvider>
      <InvestmentManagementScreen
        api={api}
        marketClient={client}
        navigate={jest.fn()}
      />
    </PreferencesProvider>
  );
  await render(screen());
  expect(JSON.stringify(tree.toJSON())).toContain('-9.55 USDT');

  useNetInfoInstance.mockReturnValue({ netInfo: { isConnected: false } });
  await update(screen());
  const offlineJson = JSON.stringify(tree.toJSON());
  expect(offlineJson).not.toContain('-9.55 USDT');
  expect(offlineJson).not.toContain('59,045.1 USDT');
  expect(offlineJson).toContain('60,000');
});

test('mobile network loss and backgrounding hide quotes; local records remain visible', async () => {
  const client = marketClient();
  const api = { getTarget: async () => ({ target: btc, summary, trades: [], symbolLocked: true }) };
  const screen = () => <PreferencesProvider><InvestmentTargetScreen api={api} marketClient={client} targetId={1} /></PreferencesProvider>;
  await render(screen());
  expect(JSON.stringify(tree.toJSON())).toContain('59,045.1 USDT');
  useNetInfoInstance.mockReturnValue({ netInfo: { isConnected: false } });
  await update(screen());
  expect(JSON.stringify(tree.toJSON())).not.toContain('59,045.1 USDT');
  expect(JSON.stringify(tree.toJSON())).toContain('60,000');
  expect(client.subscribe.mock.results[0].value).toHaveBeenCalledTimes(1);
  await advance(60_000);
  expect(client.subscribe).toHaveBeenCalledTimes(1);
  // Native connectivity is sufficient; no external reachability probe is needed.
  useNetInfoInstance.mockReturnValue({ netInfo: { isConnected: true, isInternetReachable: false } });
  await update(screen());
  expect(client.subscribe).toHaveBeenCalledTimes(2);
  await changeAppState('background');
  expect(JSON.stringify(tree.toJSON())).not.toContain('59,045.1 USDT');
  expect(client.subscribe.mock.results[1].value).toHaveBeenCalledTimes(1);
  await advance(60_000);
  expect(client.subscribe).toHaveBeenCalledTimes(2);
  await changeAppState('active');
  expect(JSON.stringify(tree.toJSON())).toContain('59,045.1 USDT');
  expect(client.subscribe).toHaveBeenCalledTimes(3);
  await act(async () => tree.unmount());
  tree = null;
  expect(removeAppState).toHaveBeenCalled();
  expect(client.subscribe.mock.results[2].value).toHaveBeenCalledTimes(1);
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('absent prices and unsupported quote currencies render no placeholder', async () => {
  await render(<PreferencesProvider>
    <InvestmentMarketPrice target={btc} />
    <InvestmentMarketPrice target={{ ...btc, quoteCurrency: 'USD' }} price="59045.1" />
  </PreferencesProvider>);
  expect(tree.toJSON()).toBeNull();
});

test('web offline and visibility events clear prices, resubscribe and remove listeners', async () => {
  const names = ['window', 'document', 'navigator'];
  const original = names.map(name => Object.getOwnPropertyDescriptor(global, name));
  const browserEvents = new Map();
  const pageEvents = new Map();
  const events = listeners => ({
    addEventListener: jest.fn((type, listener) => listeners.set(type, listener)),
    removeEventListener: jest.fn(type => listeners.delete(type)),
  });
  const browser = events(browserEvents);
  const page = { ...events(pageEvents), visibilityState: 'visible' };
  const connection = { onLine: true };
  [browser, page, connection].forEach((value, index) =>
    Object.defineProperty(global, names[index], { configurable: true, writable: true, value }),
  );
  const client = marketClient();
  function WebProbe() { prices = useWebMarketPrices([btc], client); return null; }
  try {
    await render(<WebProbe />);
    expect(prices).toEqual({ BTC: '59045.1' });
    connection.onLine = false;
    await act(async () => browserEvents.get('offline')());
    expect(prices).toEqual({});
    await advance(60_000);
    expect(client.subscribe).toHaveBeenCalledTimes(1);
    connection.onLine = true;
    await act(async () => browserEvents.get('online')());
    expect(prices).toEqual({ BTC: '59045.1' });
    page.visibilityState = 'hidden';
    await act(async () => pageEvents.get('visibilitychange')());
    expect(prices).toEqual({});
    page.visibilityState = 'visible';
    await act(async () => pageEvents.get('visibilitychange')());
    expect(prices).toEqual({ BTC: '59045.1' });
    expect(client.subscribe).toHaveBeenCalledTimes(3);
    await act(async () => tree.unmount());
    tree = null;
    await advance(60_000);
    expect(client.subscribe).toHaveBeenCalledTimes(3);
    client.subscribe.mock.results.forEach(result => expect(result.value).toHaveBeenCalledTimes(1));
    expect(browserEvents.size).toBe(0);
    expect(pageEvents.size).toBe(0);
  } finally {
    if (tree) await act(async () => tree.unmount());
    tree = null;
    names.forEach((name, index) => {
      if (original[index]) Object.defineProperty(global, name, original[index]);
      else delete global[name];
    });
  }
});
