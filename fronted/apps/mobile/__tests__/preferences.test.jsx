import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, Appearance, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PreferencesProvider,
  usePreferences,
} from '../src/platform/PreferencesProvider';

let tree;
let preferences;
let appStateListener;

function PreferencesProbe() {
  preferences = usePreferences();
  return null;
}

async function renderPreferences() {
  await act(async () => {
    tree = renderer.create(
      <PreferencesProvider>
        <PreferencesProbe />
      </PreferencesProvider>,
    );
  });
}

beforeEach(async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 25, 17, 59, 59) });
  await AsyncStorage.clear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
  appStateListener = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  });
});

afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  tree = null;
  preferences = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('scheduled appearance changes from light to dark at 18:00', async () => {
  await renderPreferences();
  expect(preferences.mode).toBe('light');

  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  expect(preferences.mode).toBe('dark');
  expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('dark');
});

test('manual appearance expires at the next boundary and resume catches later boundaries', async () => {
  jest.setSystemTime(new Date(2026, 10, 25, 19));
  await renderPreferences();
  expect(preferences.mode).toBe('dark');

  await act(async () => preferences.update('theme', 'light'));
  expect(preferences.mode).toBe('light');
  expect(await AsyncStorage.getItem('mogo.theme')).toBe('light');

  jest.setSystemTime(new Date(2026, 10, 26, 8));
  await act(async () => appStateListener('active'));
  expect(preferences.mode).toBe('light');
  expect(await AsyncStorage.getItem('mogo.theme')).toBeNull();
  expect(await AsyncStorage.getItem('mogo.theme-override-until')).toBeNull();

  jest.setSystemTime(new Date(2026, 10, 26, 18));
  await act(async () => appStateListener('active'));
  expect(preferences.mode).toBe('dark');
});
