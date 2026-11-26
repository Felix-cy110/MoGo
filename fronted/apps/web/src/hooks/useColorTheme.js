import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COLOR_THEME,
  getNextColorThemeBoundary,
  getScheduledColorTheme,
  isColorThemeOverrideActive,
  resolveColorThemePreference
} from '@mogo/core-shared';

const STORAGE_KEY = 'mogo.color-theme';
const OVERRIDE_UNTIL_STORAGE_KEY = 'mogo.color-theme-override-until';

const getInitialPreference = () => {
  const storedTheme = globalThis.localStorage?.getItem(STORAGE_KEY);
  const storedOverrideUntil = globalThis.localStorage?.getItem(OVERRIDE_UNTIL_STORAGE_KEY);
  const preference = resolveColorThemePreference({ storedTheme, storedOverrideUntil });

  if (preference.shouldPersistOverride) {
    globalThis.localStorage?.setItem(
      OVERRIDE_UNTIL_STORAGE_KEY,
      String(preference.overrideUntil)
    );
  } else if (preference.shouldClearOverride) {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    globalThis.localStorage?.removeItem(OVERRIDE_UNTIL_STORAGE_KEY);
  }

  return preference;
};

const applyTheme = (theme) => {
  if (!globalThis.document) return;
  globalThis.document.documentElement.classList.toggle(
    COLOR_THEME.DARK,
    theme === COLOR_THEME.DARK
  );
  globalThis.document.documentElement.style.colorScheme = theme;
};

// Apply the theme before React renders to reduce the initial light/dark flash.
const initialPreference = getInitialPreference();
applyTheme(initialPreference.theme);

export function useColorTheme() {
  const [theme, setTheme] = useState(initialPreference.theme);
  const overrideUntilRef = useRef(initialPreference.overrideUntil);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const reconcileTheme = useCallback(() => {
    const now = new Date();
    if (isColorThemeOverrideActive(overrideUntilRef.current, now)) return;

    overrideUntilRef.current = null;
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    globalThis.localStorage?.removeItem(OVERRIDE_UNTIL_STORAGE_KEY);
    const scheduledTheme = getScheduledColorTheme(now);
    applyTheme(scheduledTheme);
    setTheme(scheduledTheme);
  }, []);

  useEffect(() => {
    let timer;

    const scheduleNextBoundary = () => {
      globalThis.clearTimeout?.(timer);
      const now = new Date();
      const delay = Math.max(0, getNextColorThemeBoundary(now).getTime() - now.getTime());
      timer = globalThis.setTimeout?.(() => {
        reconcileTheme();
        scheduleNextBoundary();
      }, delay);
    };

    const handleVisibilityChange = () => {
      if (globalThis.document?.visibilityState === 'visible') {
        reconcileTheme();
        scheduleNextBoundary();
      }
    };
    const handleFocus = () => {
      reconcileTheme();
      scheduleNextBoundary();
    };

    reconcileTheme();
    scheduleNextBoundary();
    globalThis.document?.addEventListener('visibilitychange', handleVisibilityChange);
    globalThis.addEventListener?.('focus', handleFocus);

    return () => {
      globalThis.clearTimeout?.(timer);
      globalThis.document?.removeEventListener('visibilitychange', handleVisibilityChange);
      globalThis.removeEventListener?.('focus', handleFocus);
    };
  }, [reconcileTheme]);

  const toggleTheme = () => {
    const nextTheme = theme === COLOR_THEME.DARK ? COLOR_THEME.LIGHT : COLOR_THEME.DARK;
    const overrideUntil = getNextColorThemeBoundary(new Date()).getTime();
    overrideUntilRef.current = overrideUntil;
    globalThis.localStorage?.setItem(STORAGE_KEY, nextTheme);
    globalThis.localStorage?.setItem(OVERRIDE_UNTIL_STORAGE_KEY, String(overrideUntil));
    setTheme(nextTheme);
  };

  return { theme, isDark: theme === COLOR_THEME.DARK, toggleTheme };
}
