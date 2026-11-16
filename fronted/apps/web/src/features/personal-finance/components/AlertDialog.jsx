import React from 'react';
import { resolveAlertMessageKey } from '@mogo/personal-finance-core';

export function AlertDialog({ t, alerts, onDismiss }) {
  if (!alerts.length) return null;

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/30 p-5" role="dialog" aria-modal="true" aria-labelledby="budget-alert-title">
      <div className="w-full max-w-sm border border-slate-300 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <h2 id="budget-alert-title" className="text-lg font-semibold">{t('warning')}</h2>
        <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {alerts.map((alert) => <p key={alert.code}>{t(resolveAlertMessageKey(alert))}</p>)}
        </div>
        <button className="button-secondary mt-5 w-full" onClick={onDismiss} type="button">{t('confirm')}</button>
      </div>
    </div>
  );
}
