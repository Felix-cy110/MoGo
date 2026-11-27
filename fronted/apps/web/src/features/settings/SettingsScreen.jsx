import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FormFieldRow } from '../../components/FormFieldRow';
import { LanguageSwitcher } from '../personal-finance/components/LanguageSwitcher';
import { ThemeSwitcher } from '../personal-finance/components/ThemeSwitcher';
import { DataBackupSettings } from './DataBackupSettings';
import { backupApi } from '../../services/api';

export function SettingsScreen({ onBack, isDark, onToggleTheme, dataBackupApi = backupApi }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;

  useEffect(() => {
    document.title = `${t('settings')} · ${t('toolboxName')}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('settingsDescription'));
  }, [language, t]);

  return (
    <main className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-2">
          <button className="back-button" type="button" onClick={onBack} aria-label={t('settingsBack')} title={t('settingsBack')}>
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <h1 className="text-lg font-semibold">{t('settings')}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-6">
        <p className="section-label mb-4">{t('settingsDescription')}</p>
        <div className="form-sheet">
          <FormFieldRow label={t('language')} htmlFor="settings-language">
            <div id="settings-language" className="flex justify-end">
              <LanguageSwitcher t={t} language={language} onToggle={i18n.changeLanguage} />
            </div>
          </FormFieldRow>
          <FormFieldRow label={t('appearance')} htmlFor="settings-theme">
            <div id="settings-theme" className="flex justify-end">
              <ThemeSwitcher t={t} isDark={isDark} onToggle={onToggleTheme} />
            </div>
          </FormFieldRow>
        </div>
        <DataBackupSettings api={dataBackupApi} />
      </div>
    </main>
  );
}
