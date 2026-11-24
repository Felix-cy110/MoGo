import React, { useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppControls } from '../../components/AppControls';

export function ToolboxHome({ onOpenFinance, onOpenLeetCodeInterview, onOpenInvestmentManagement, onOpenProfile, onOpenSettings }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;

  useEffect(() => {
    document.title = t('toolboxName');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('toolboxMetaDescription'));
  }, [language, t]);

  return (
    <main className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-5 px-5 py-5">
          <div>
            <h1 className="text-xl font-semibold">{t('toolboxName')}</h1>
          </div>
          <AppControls onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings} />
        </div>
      </header>

      <section className="mx-auto max-w-xl px-5 pb-6" aria-label={t('toolboxFeatures')}>
        <button className="tool-row" type="button" onClick={onOpenFinance}>
          <span className="tool-row-icon" aria-hidden="true">¥</span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-medium">{t('financeFeatureName')}</span>
            <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{t('financeFeatureDescription')}</span>
          </span>
          <span className="text-lg text-slate-400 dark:text-slate-500" aria-hidden="true">›</span>
        </button>
        <button className="tool-row" type="button" onClick={onOpenLeetCodeInterview}>
          <span className="tool-row-icon text-sm" aria-hidden="true">LC</span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-medium">{t('leetcodeInterviewFeatureName')}</span>
            <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{t('leetcodeInterviewFeatureDescription')}</span>
          </span>
          <span className="text-lg text-slate-400 dark:text-slate-500" aria-hidden="true">›</span>
        </button>
        <button className="tool-row" type="button" onClick={onOpenInvestmentManagement}>
          <span className="tool-row-icon" aria-hidden="true"><TrendingUp size={18} /></span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-medium">{t('investmentManagementFeatureName')}</span>
            <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{t('investmentManagementFeatureDescription')}</span>
          </span>
          <span className="text-lg text-slate-400 dark:text-slate-500" aria-hidden="true">›</span>
        </button>
      </section>
    </main>
  );
}
