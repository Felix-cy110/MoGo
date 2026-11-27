import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppControls } from '../../components/AppControls';
import { NoticeDialog } from '../../components/NoticeDialog';
export function InvestmentLayout({ title, backKey, onBack, onOpenProfile, onOpenSettings, model, children }) {
  const { t } = useTranslation();
  useEffect(() => { document.title = `${title} · ${t('toolboxName')}`; }, [title, t]);
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-2">
          <button type="button" className="back-button shrink-0" aria-label={t(backKey)} onClick={onBack}><ArrowLeft size={18} aria-hidden="true" /></button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
          <AppControls onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings} />
        </div>
      </header>
      <div className="mx-auto max-w-xl px-5 py-4">
        {model.loading && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{t('investmentLoading')}</p>}
        {model.loadError && <div role="alert"><p>{t(model.loadError)}</p><button className="button-secondary mt-3" onClick={model.reload}>{t('investmentRetry')}</button></div>}
        {children}
      </div>
      <NoticeDialog title={model.feedback ? t(model.feedback.key) : null} confirmLabel={t('investmentConfirm')} onDismiss={model.clearFeedback} />
    </main>
  );
}
