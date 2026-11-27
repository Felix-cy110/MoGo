import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { backupApi } from '../../services/api';
import { DataBackupSettings } from './DataBackupSettings';

export function DataManagementScreen({ onBack, api = backupApi }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;

  useEffect(() => {
    document.title = `${t('dataManagement')} · ${t('toolboxName')}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('dataBackupDescription'));
  }, [language, t]);

  return (
    <main className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-2">
          <button
            className="back-button"
            type="button"
            onClick={onBack}
            aria-label={t('backToSettings')}
            title={t('backToSettings')}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <h1 className="text-lg font-semibold">{t('dataManagement')}</h1>
        </div>
      </header>
      <div className="mx-auto max-w-xl px-5 py-6">
        <DataBackupSettings api={api} />
      </div>
    </main>
  );
}
