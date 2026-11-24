import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvestmentTargets } from '@mogo/investment-management-react';
import { InvestmentLayout } from './InvestmentLayout';
import { InvestmentSummary } from './InvestmentSummary';
import { InvestmentEditor } from './InvestmentEditor';
import { investmentApi } from './investmentApi';
export function InvestmentManagementScreen({ onBack, onOpenSettings, onOpenTarget, api = investmentApi }) {
  const { t } = useTranslation();
  const model = useInvestmentTargets({ api });
  const [adding, setAdding] = useState(false);
  return <InvestmentLayout title={t('investmentManagementTitle')} backKey="investmentManagementBack" onBack={onBack} onOpenSettings={onOpenSettings} model={model}>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {[false, true].map(archived => <button key={String(archived)} type="button" className={model.archived === archived ? 'button-primary' : 'button-secondary'}
        disabled={model.saving} aria-pressed={model.archived === archived} onClick={() => model.setArchived(archived)}>{t(archived ? 'investmentArchived' : 'investmentActive')}</button>)}
      {!model.archived && <button className="button-secondary ml-auto" disabled={model.loading || Boolean(model.loadError)} onClick={() => setAdding(true)}>{t('investmentAddTarget')}</button>}
    </div>
    <input className="field mb-3 w-full" aria-label={t('investmentSearch')} placeholder={t('investmentSearch')} value={model.query} onChange={event => model.setQuery(event.target.value)} />
    {!model.loading && !model.loadError && <>
      {!model.items.length && <p className="py-4 text-sm text-slate-500 dark:text-slate-400">{t(model.query || model.archived ? 'investmentNoMatches' : 'investmentEmpty')}</p>}
      {model.items.map(({ target, summary }) => <button type="button" key={target.id} onClick={() => onOpenTarget(target.id)}
        className="block w-full border-b border-slate-200 py-3 text-left dark:border-slate-800" aria-label={target.name}>
        <div className="flex items-center justify-between gap-3"><span className="min-w-0 break-words font-medium">{target.name} <span className="text-sm text-slate-500 dark:text-slate-400">{target.symbol}</span></span><span aria-hidden="true">›</span></div>
        <InvestmentSummary summary={summary} symbol={target.symbol} />
      </button>)}
    </>}
    {adding && <InvestmentEditor kind="target" saving={model.saving} onSave={model.save} onClose={() => setAdding(false)} />}
  </InvestmentLayout>;
}
