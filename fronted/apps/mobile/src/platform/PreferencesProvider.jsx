import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, Appearance, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COLOR_THEME,
  getNextColorThemeBoundary,
  getScheduledColorTheme,
  isColorThemeOverrideActive,
  resolveColorThemePreference,
} from '@mogo/core-shared';
import i18n from './i18n';

const palettes = {
  light: {
    background: '#f8f8f6',
    surface: '#ffffff',
    text: '#242424',
    muted: '#6b6b67',
    line: '#ddddda',
    accent: '#2e6250',
    highlight: '#1d4ed8',
    danger: '#b02b30',
  },
  dark: {
    background: '#171918',
    surface: '#222522',
    text: '#efefeb',
    muted: '#a5aaa4',
    line: '#3c423c',
    accent: '#a1cdb7',
    highlight: '#93c5fd',
    danger: '#ff9c9c',
  },
};
const LANGUAGE_STORAGE_KEY = 'mogo.language';
const THEME_STORAGE_KEY = 'mogo.theme';
const THEME_OVERRIDE_UNTIL_STORAGE_KEY = 'mogo.theme-override-until';
const PreferencesContext = createContext(null);
export const usePreferences = () => useContext(PreferencesContext);
export function PreferencesProvider({ children }) {
  const [theme, setTheme] = useState(() => getScheduledColorTheme());
  const [ready, setReady] = useState(false);
  const overrideUntilRef = useRef(null);

  const showPreferencesError = useCallback(() => {
    Alert.alert(i18n.t('preferencesError'), '', [
      { text: i18n.t('confirm') },
    ]);
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.multiGet([
      LANGUAGE_STORAGE_KEY,
      THEME_STORAGE_KEY,
      THEME_OVERRIDE_UNTIL_STORAGE_KEY,
    ])
      .then(async entries => {
        if (!active) return;
        const values = Object.fromEntries(entries);
        if (['zh', 'en'].includes(values[LANGUAGE_STORAGE_KEY]))
          await i18n.changeLanguage(values[LANGUAGE_STORAGE_KEY]);

        const preference = resolveColorThemePreference({
          storedTheme: values[THEME_STORAGE_KEY],
          storedOverrideUntil: values[THEME_OVERRIDE_UNTIL_STORAGE_KEY],
        });
        if (!active) return;
        overrideUntilRef.current = preference.overrideUntil;
        setTheme(preference.theme);

        if (preference.shouldPersistOverride) {
          await AsyncStorage.setItem(
            THEME_OVERRIDE_UNTIL_STORAGE_KEY,
            String(preference.overrideUntil),
          );
        } else if (preference.shouldClearOverride) {
          await AsyncStorage.multiRemove([
            THEME_STORAGE_KEY,
            THEME_OVERRIDE_UNTIL_STORAGE_KEY,
          ]);
        }
      })
      .catch(showPreferencesError)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [showPreferencesError]);

  useEffect(() => {
    if (ready) Appearance.setColorScheme(theme);
  }, [ready, theme]);

  const reconcileTheme = useCallback(async () => {
    const now = new Date();
    if (isColorThemeOverrideActive(overrideUntilRef.current, now)) return;

    const hadOverride = overrideUntilRef.current != null;
    overrideUntilRef.current = null;
    setTheme(getScheduledColorTheme(now));
    if (!hadOverride) return;

    try {
      await AsyncStorage.multiRemove([
        THEME_STORAGE_KEY,
        THEME_OVERRIDE_UNTIL_STORAGE_KEY,
      ]);
    } catch {
      showPreferencesError();
    }
  }, [showPreferencesError]);

  useEffect(() => {
    if (!ready) return undefined;

    let active = true;
    let timer;
    const scheduleNextBoundary = () => {
      clearTimeout(timer);
      const now = new Date();
      const delay = Math.max(
        0,
        getNextColorThemeBoundary(now).getTime() - now.getTime(),
      );
      timer = setTimeout(async () => {
        await reconcileTheme();
        if (active) scheduleNextBoundary();
      }, delay);
    };
    const handleAppStateChange = nextState => {
      if (nextState !== 'active') return;
      reconcileTheme();
      scheduleNextBoundary();
    };

    reconcileTheme();
    scheduleNextBoundary();
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      active = false;
      clearTimeout(timer);
      appStateSubscription.remove();
    };
  }, [ready, reconcileTheme]);

  const update = async (key, value) => {
    try {
      if (key === 'theme') {
        if (![COLOR_THEME.LIGHT, COLOR_THEME.DARK].includes(value)) return;
        const overrideUntil = getNextColorThemeBoundary().getTime();
        await AsyncStorage.multiSet([
          [THEME_STORAGE_KEY, value],
          [THEME_OVERRIDE_UNTIL_STORAGE_KEY, String(overrideUntil)],
        ]);
        overrideUntilRef.current = overrideUntil;
        setTheme(value);
      } else {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, value);
        await i18n.changeLanguage(value);
      }
    } catch {
      showPreferencesError();
    }
  };

  const mode = theme;
  return (
    <PreferencesContext.Provider
      value={{ theme, mode, colors: palettes[mode], update, ready }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
