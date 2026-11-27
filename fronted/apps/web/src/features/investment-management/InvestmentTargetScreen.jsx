import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvestmentDetail } from '@mogo/investment-management-react';
import { formatInvestmentDecimal, formatInvestmentTime } from '@mogo/investment-management-core';
import { InvestmentLayout } from './InvestmentLayout';
import { InvestmentSummary } from './InvestmentSummary';
import { InvestmentEditor } from './InvestmentEditor';
import { InvestmentConfirm } from './InvestmentConfirm';
import { investmentApi } from './investmentApi';
import { InvestmentMarketPrice } from './InvestmentMarketPrice';
import { useMarketPrices } from './useMarketPrices';
export function InvestmentTargetScreen({ targetId, onBack, onOpenProfile, onOpenSettings, api = investmentApi, marketClient }) {
  const { t, i18n } = useTranslation();
  const model = useInvestmentDetail({ api, targetId });
  const [editor, setEditor] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const data = model.data;
  const prices = useMarketPrices(data ? [data.target] : [], marketClient);
  const number = value => formatInvestmentDecimal(value, i18n.resolvedLanguage);
  const confirm = async () => {
    const target = confirmation === 'target';
    const done = target ? await model.deleteTarget() : await model.deleteTrade(editor.value.id);
    setConfirmation(null);
    if (!done) return;
    setEditor(null);
    if (target) onBack();
  };
  return <InvestmentLayout title={data?.target.symbol || t('investmentTargetDetail')} backKey="investmentBackToList" onBack={onBack} onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings} model={model}>
    {data && !model.loading && !model.loadError && <>
      <p className="text-sm text-slate-500 dark:text-slate-400">{data.target.symbol} / {data.target.quoteCurrency}<InvestmentMarketPrice target={data.target} price={prices[data.target.symbol]} /></p>
      <InvestmentSummary summary={data.summary} symbol={data.target.symbol} />
      <p className="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('investmentCalculationNote')}</p>
      {data.target.note && <p className="mb-3 break-words text-sm">{data.target.note}</p>}
      <div className="mb-5 flex flex-wrap gap-2">
        <button className="button-primary" onClick={() => setEditor({ kind: 'trade', openedAt: new Date() })}>{t('investmentAddTrade')}</button>
        <button className="button-secondary" onClick={() => setEditor({ kind: 'target', value: data.target })}>{t('investmentEditTarget')}</button>
      </div>
      <h2 className="mb-2 text-sm font-semibold">{t('investmentTrades')}</h2>
      {!data.trades.length && <p className="py-3 text-sm text-slate-500 dark:text-slate-400">{t('investmentNoTrades')}</p>}
      {data.trades.map(trade => <button key={trade.id} type="button"
        className="block w-full border-b border-slate-200 py-3 text-left dark:border-slate-800" onClick={() => setEditor({ kind: 'trade', value: trade })}>
        <span className="mb-2 block text-sm text-slate-500 dark:text-slate-400">{formatInvestmentTime(trade.occurredAt, i18n.resolvedLanguage)}</span>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="min-w-0"><dt>{t('investmentQuoteAmount')}</dt><dd className="break-all tabular-nums">{number(trade.quoteAmount)}</dd></div>
          <div className="min-w-0"><dt>{t('investmentUnitPrice')}</dt><dd className="break-all tabular-nums">{number(trade.unitPrice)}</dd></div>
        </dl>
        {trade.note && <span className="mt-2 block break-words text-sm">{trade.note}</span>}
      </button>)}
    </>}
    {editor && <InvestmentEditor key={`${editor.kind}-${editor.value?.id || 'new'}`} {...editor} symbolLocked={data?.symbolLocked}
      saving={model.saving} onClose={() => setEditor(null)}
      onSave={draft => editor.kind === 'target' ? model.saveTarget(draft) : model.saveTrade(draft, editor.value?.id)}
      onDelete={editor.value ? () => setConfirmation(editor.kind) : undefined} />}
    {confirmation && <InvestmentConfirm busy={model.saving} onClose={() => setConfirmation(null)} onConfirm={confirm}
      messageKey={confirmation === 'target' ? 'investmentDeleteTargetConfirm' : 'investmentDeleteConfirm'} />}
  </InvestmentLayout>;
}
