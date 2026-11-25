import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AppState, Alert } from 'react-native';
import { useNetInfoInstance } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInvestmentPrices } from '@mogo/investment-management-react';
import { INVESTMENT_PRICE_REFRESH_MS, INVESTMENT_PRICE_MAX_AGE_MS } from '@mogo/investment-management-core';
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
const quote = price => ({ price, timestamp: Date.now() });
const initialAppState = AppState.currentState;
let tree;
let prices;
let onAppState;
let removeAppState;
function Probe(props) { prices = useInvestmentPrices(props); return null; }
async function render(element) {
  await act(async () => { tree = renderer.create(element); });
}
async function update(element) {
  await act(async () => tree.update(element));
}
async function advance(ms) {
  await act(async () => { jest.advanceTimersByTime(ms); });
}
beforeEach(() => {
  jest.useFakeTimers();
  AppState.currentState = 'active';
  useNetInfoInstance.mockReturnValue({ netInfo: { isConnected: true } });
  removeAppState = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, listener) => {
    onAppState = listener;
    return { remove: removeAppState };
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

test('deduplicates supported symbols and independently hides a failed refresh', async () => {
  const client = { getPrice: jest.fn(async symbol => quote(symbol === 'BTC' ? '59045.1' : '2001.23')) };
  const props = { targets: [btc, btc, eth, sol], enabled: true, client };
  await render(<Probe {...props} />);
  expect(client.getPrice.mock.calls.map(call => call[0])).toEqual(['BTC', 'ETH']);
  expect(prices).toEqual({ BTC: '59045.1', ETH: '2001.23' });
  await update(<Probe {...props} targets={[btc, eth, btc, sol]} />);
  expect(client.getPrice).toHaveBeenCalledTimes(2);
  client.getPrice.mockImplementation(async symbol => symbol === 'BTC' ? null : quote('2002'));
  await advance(INVESTMENT_PRICE_REFRESH_MS);
  expect(prices).toEqual({ ETH: '2002' });
});

test('going offline cancels pending work, hides old prices and reconnect starts fresh', async () => {
  let resolveOld;
  const client = { getPrice: jest.fn().mockResolvedValueOnce(quote('59045.1')).mockImplementationOnce(
    () => new Promise(resolve => { resolveOld = resolve; }),
  ).mockImplementation(async () => quote('59050')) };
  const props = { targets: [btc], enabled: true, client };
  await render(<Probe {...props} />);
  expect(prices.BTC).toBe('59045.1');
  await advance(INVESTMENT_PRICE_REFRESH_MS);
  const requestSignal = client.getPrice.mock.calls[1][1].signal;
  await update(<Probe {...props} enabled={false} />);
  expect(requestSignal.aborted).toBe(true);
  expect(prices).toEqual({});
  await act(async () => resolveOld(quote('1')));
  await advance(INVESTMENT_PRICE_REFRESH_MS * 2);
  expect(prices).toEqual({});
  expect(client.getPrice).toHaveBeenCalledTimes(2);
  await update(<Probe {...props} />);
  expect(prices).toEqual({ BTC: '59050' });
});

test('expires stale prices while a request stalls and stops timers on unmount', async () => {
  const client = { getPrice: jest.fn().mockResolvedValueOnce(quote('59045.1')).mockImplementation(() => new Promise(() => {})) };
  await render(<Probe targets={[btc]} enabled client={client} />);
  await advance(INVESTMENT_PRICE_REFRESH_MS);
  await advance(INVESTMENT_PRICE_MAX_AGE_MS);
  expect(prices).toEqual({});
  expect(client.getPrice).toHaveBeenCalledTimes(2);
  await act(async () => tree.unmount());
  tree = null;
  expect(client.getPrice.mock.calls[1][1].signal.aborted).toBe(true);
  await advance(INVESTMENT_PRICE_REFRESH_MS * 3);
  expect(client.getPrice).toHaveBeenCalledTimes(2);
});

test('changing target or client ignores late responses from the previous request', async () => {
  let resolveOld;
  const oldClient = { getPrice: jest.fn(() => new Promise(resolve => { resolveOld = resolve; })) };
  await render(<Probe targets={[btc]} enabled client={oldClient} />);
  const client = { getPrice: jest.fn(async () => quote('2001')) };
  await update(<Probe targets={[eth]} enabled client={client} />);
  await act(async () => resolveOld(quote('59045.1')));
  expect(prices).toEqual({ ETH: '2001' });
  expect(oldClient.getPrice.mock.calls[0][1].signal.aborted).toBe(true);
});

test.each([['zh', 'light'], ['zh', 'dark'], ['en', 'light'], ['en', 'dark']])(
  'list and detail display prices without affecting averages in %s/%s', async (language, theme) => {
    await AsyncStorage.multiSet([['mogo.language', language], ['mogo.theme', theme]]);
    await i18n.changeLanguage(language);
    const client = { getPrice: jest.fn(async symbol => quote(symbol === 'BTC' ? '59045.1' : '2001.23')) };
    const api = {
      listTargets: async () => [btc, eth, sol].map(target => ({ target, summary })),
      getTarget: async () => ({ target: btc, summary, trades: [], symbolLocked: true }),
    };
    await render(<PreferencesProvider><InvestmentManagementScreen api={api} marketClient={client} navigate={jest.fn()} /></PreferencesProvider>);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('59,045.1 USDT');
    expect(json).toContain('2,001.23 USDT');
    expect(json).toContain('60,000');
    expect(client.getPrice.mock.calls.map(call => call[0])).toEqual(['BTC', 'ETH']);
    await update(<PreferencesProvider><InvestmentTargetScreen api={api} marketClient={client} targetId={1} /></PreferencesProvider>);
    expect(JSON.stringify(tree.toJSON())).toContain('59,045.1 USDT');
    expect(JSON.stringify(tree.toJSON())).toContain('60,000');
    expect(Alert.alert).not.toHaveBeenCalled();
  },
);

test('mobile network loss and backgrounding hide quotes; local records remain visible', async () => {
  const client = { getPrice: jest.fn(async () => quote('59045.1')) };
  const api = { getTarget: async () => ({ target: btc, summary, trades: [], symbolLocked: true }) };
  const screen = () => <PreferencesProvider><InvestmentTargetScreen api={api} marketClient={client} targetId={1} /></PreferencesProvider>;
  await render(screen());
  expect(JSON.stringify(tree.toJSON())).toContain('59,045.1 USDT');
  useNetInfoInstance.mockReturnValue({ netInfo: { isConnected: false } });
  await update(screen());
  expect(JSON.stringify(tree.toJSON())).not.toContain('59,045.1 USDT');
  expect(JSON.stringify(tree.toJSON())).toContain('60,000');
  await advance(INVESTMENT_PRICE_REFRESH_MS * 3);
  expect(client.getPrice).toHaveBeenCalledTimes(1);
  // Native connectivity is sufficient; no external reachability probe is needed.
  useNetInfoInstance.mockReturnValue({ netInfo: { isConnected: true, isInternetReachable: false } });
  await update(screen());
  expect(client.getPrice).toHaveBeenCalledTimes(2);
  await act(async () => onAppState('background'));
  expect(JSON.stringify(tree.toJSON())).not.toContain('59,045.1 USDT');
  await advance(INVESTMENT_PRICE_REFRESH_MS * 3);
  expect(client.getPrice).toHaveBeenCalledTimes(2);
  await act(async () => onAppState('active'));
  expect(JSON.stringify(tree.toJSON())).toContain('59,045.1 USDT');
  expect(client.getPrice).toHaveBeenCalledTimes(3);
  await act(async () => tree.unmount());
  tree = null;
  expect(removeAppState).toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('absent prices and unsupported quote currencies render no placeholder', async () => {
  await render(<PreferencesProvider>
    <InvestmentMarketPrice target={btc} />
    <InvestmentMarketPrice target={{ ...btc, quoteCurrency: 'USD' }} price="59045.1" />
  </PreferencesProvider>);
  expect(tree.toJSON()).toBeNull();
});


test('web offline and visibility events clear prices, reconnect and remove listeners', async () => {
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
  const client = { getPrice: jest.fn(async () => quote('59045.1')) };
  function WebProbe() { prices = useWebMarketPrices([btc], client); return null; }
  try {
    await render(<WebProbe />);
    expect(prices).toEqual({ BTC: '59045.1' });
    connection.onLine = false;
    await act(async () => browserEvents.get('offline')());
    expect(prices).toEqual({});
    await advance(INVESTMENT_PRICE_REFRESH_MS * 2);
    expect(client.getPrice).toHaveBeenCalledTimes(1);
    connection.onLine = true;
    await act(async () => browserEvents.get('online')());
    expect(prices).toEqual({ BTC: '59045.1' });
    page.visibilityState = 'hidden';
    await act(async () => pageEvents.get('visibilitychange')());
    expect(prices).toEqual({});
    page.visibilityState = 'visible';
    await act(async () => pageEvents.get('visibilitychange')());
    expect(prices).toEqual({ BTC: '59045.1' });
    expect(client.getPrice).toHaveBeenCalledTimes(3);
    await act(async () => tree.unmount());
    tree = null;
    await advance(INVESTMENT_PRICE_REFRESH_MS * 2);
    expect(client.getPrice).toHaveBeenCalledTimes(3);
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
