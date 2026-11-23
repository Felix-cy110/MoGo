import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './i18n';

const palettes = {
  light: {
    background: '#f8f8f6',
    surface: '#ffffff',
    text: '#242424',
    muted: '#6b6b67',
    line: '#ddddda',
    accent: '#2e6250',
    danger: '#b02b30',
  },
  dark: {
    background: '#171918',
    surface: '#222522',
    text: '#efefeb',
    muted: '#a5aaa4',
    line: '#3c423c',
    accent: '#a1cdb7',
    danger: '#ff9c9c',
  },
};
const PreferencesContext = createContext(null);
export const usePreferences = () => useContext(PreferencesContext);
export function PreferencesProvider({ children }) {
  const system = useColorScheme();
  const [theme, setTheme] = useState('system');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.multiGet(['mogo.language', 'mogo.theme'])
      .then(async entries => {
        if (!active) return;
        const values = Object.fromEntries(entries);
        if (['zh', 'en'].includes(values['mogo.language']))
          await i18n.changeLanguage(values['mogo.language']);
        if (
          active &&
          ['system', 'light', 'dark'].includes(values['mogo.theme'])
        )
          setTheme(values['mogo.theme']);
      })
      .catch(() =>
        Alert.alert(i18n.t('preferencesError'), '', [
          { text: i18n.t('confirm') },
        ]),
      )
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready) Appearance.setColorScheme(theme === 'system' ? 'auto' : theme);
  }, [ready, theme]);
  const update = async (key, value) => {
    try {
      await AsyncStorage.setItem(`mogo.${key}`, value);
      if (key === 'theme') setTheme(value);
      else await i18n.changeLanguage(value);
    } catch {
      Alert.alert(i18n.t('preferencesError'), '', [
        { text: i18n.t('confirm') },
      ]);
    }
  };
  const mode = theme === 'system' ? system || 'light' : theme;
  return (
    <PreferencesContext.Provider
      value={{ theme, mode, colors: palettes[mode], update, ready }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
