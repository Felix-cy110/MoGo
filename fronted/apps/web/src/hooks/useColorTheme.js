import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mogo.color-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

const getSystemTheme = () =>
  globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;

const getInitialTheme = () => {
  const storedTheme = globalThis.localStorage?.getItem(STORAGE_KEY);
  return storedTheme === DARK_THEME || storedTheme === LIGHT_THEME ? storedTheme : getSystemTheme();
};

const applyTheme = (theme) => {
  if (!globalThis.document) return;
  globalThis.document.documentElement.classList.toggle(DARK_THEME, theme === DARK_THEME);
  globalThis.document.documentElement.style.colorScheme = theme;
};

// Apply the theme before React renders to reduce the initial light/dark flash.
const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export function useColorTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    applyTheme(theme);
    globalThis.localStorage?.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === DARK_THEME ? LIGHT_THEME : DARK_THEME));

  return { theme, isDark: theme === DARK_THEME, toggleTheme };
}
