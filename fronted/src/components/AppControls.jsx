import React from 'react';
import { useTranslation } from 'react-i18next';
import { useColorTheme } from '../hooks/useColorTheme';
import { LanguageSwitcher } from '../features/finance/components/LanguageSwitcher';
import { ThemeSwitcher } from '../features/finance/components/ThemeSwitcher';

export function AppControls() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const { isDark, toggleTheme } = useColorTheme();

  return (
    <div className="flex items-center gap-3">
      <ThemeSwitcher t={t} isDark={isDark} onToggle={toggleTheme} />
      <LanguageSwitcher t={t} language={language} onChange={i18n.changeLanguage} />
    </div>
  );
}
