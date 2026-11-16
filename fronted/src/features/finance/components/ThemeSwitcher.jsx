import React from 'react';

export function ThemeSwitcher({ t, isDark, onToggle }) {
  const label = t(isDark ? 'switchToLightTheme' : 'switchToDarkTheme');

  return (
    <button
      className="theme-switcher"
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
    </button>
  );
}
