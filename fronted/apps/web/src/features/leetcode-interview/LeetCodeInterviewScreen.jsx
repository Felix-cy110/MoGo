import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppControls } from '../../components/AppControls';

export function LeetCodeInterviewScreen({ onBack, onOpenSettings }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;

  useEffect(() => {
    document.title = `${t('leetcodeInterviewTitle')} · ${t('toolboxName')}`;
  }, [language, t]);

  return (
    <main className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <button className="back-button" type="button" onClick={onBack} aria-label={t('leetcodeInterviewBack')} title={t('leetcodeInterviewBack')}>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <h1 className="truncate text-lg font-semibold">{t('leetcodeInterviewTitle')}</h1>
          </div>
          <AppControls onOpenSettings={onOpenSettings} />
        </div>
      </header>

      <section className="mx-auto max-w-xl px-5 py-6">
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{t('leetcodeInterviewPlanning')}</p>
      </section>
    </main>
  );
}
