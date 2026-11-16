import React from 'react';

export function AlertDialog({ t, alerts, onDismiss }) {
  if (!alerts.length) return null;

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/30 p-5" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm border border-slate-300 bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{t('warning')}</h2>
        <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
          {alerts.map((alert) => (
            <p key={alert.code}>{alert.thresholdPercent >= 100 ? t('alertExceeded') : t('alertWarning')}</p>
          ))}
        </div>
        <button className="button-secondary mt-5 w-full" onClick={onDismiss} type="button">知道了</button>
      </div>
    </div>
  );
}
