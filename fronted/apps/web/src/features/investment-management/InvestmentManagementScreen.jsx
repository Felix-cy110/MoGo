import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvestmentTargets } from '@mogo/investment-management-react';
import { InvestmentLayout } from './InvestmentLayout';
import { InvestmentSummary } from './InvestmentSummary';
import { InvestmentEditor } from './InvestmentEditor';
import { investmentApi } from './investmentApi';
import { InvestmentMarketPrice } from './InvestmentMarketPrice';
import { InvestmentProfitLoss } from './InvestmentProfitLoss';
import { useMarketPrices } from './useMarketPrices';
export function InvestmentManagementScreen({ onBack, onOpenSettings, onOpenTarget, api = investmentApi, marketClient }) {
  const { t } = useTranslation();
  const model = useInvestmentTargets({ api });
  const prices = useMarketPrices(model.items.map(item => item.target), marketClient);
  const [adding, setAdding] = useState(false);
  return <InvestmentLayout title={t('investmentManagementTitle')} backKey="investmentManagementBack" onBack={onBack} onOpenSettings={onOpenSettings} model={model}>
    <div className="mb-3 flex items-center gap-2 text-sm">
      <input type="search" className="field min-h-11 min-w-0 flex-1" aria-label={t('investmentSearch')} placeholder={t('investmentSearch')} value={model.query} onChange={event => model.setQuery(event.target.value)} />
      <button type="button" className="button-secondary min-h-11 shrink-0 whitespace-nowrap" disabled={model.loading || Boolean(model.loadError)} onClick={() => setAdding(true)}>{t('investmentAddTarget')}</button>
    </div>
    {!model.loading && !model.loadError && <>
      {!model.items.length && <p className="py-4 text-sm text-slate-500 dark:text-slate-400">{t(model.query ? 'investmentNoMatches' : 'investmentEmpty')}</p>}
      {model.items.map(({ target, summary }) => <button type="button" key={target.id} onClick={() => onOpenTarget(target.id)}
        className="block w-full border-b border-slate-200 py-3 text-left dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 flex-1 break-words font-medium">{target.symbol}<InvestmentMarketPrice target={target} price={prices[target.symbol]} /></span>
          <InvestmentProfitLoss price={prices[target.symbol]} summary={summary} />
        </div>
        <InvestmentSummary summary={summary} symbol={target.symbol} />
      </button>)}
    </>}
    {adding && <InvestmentEditor kind="target" saving={model.saving} onSave={model.save} onClose={() => setAdding(false)} />}
  </InvestmentLayout>;
}
