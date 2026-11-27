import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useInvestmentDetail,
  useInvestmentMarket,
  useInvestmentMarketSnapshot,
} from '@mogo/investment-management-react';
import { formatInvestmentDecimal, formatInvestmentTime } from '@mogo/investment-management-core';
import { InvestmentLayout } from './InvestmentLayout';
import { InvestmentSummary } from './InvestmentSummary';
import { InvestmentEditor } from './InvestmentEditor';
import { InvestmentConfirm } from './InvestmentConfirm';
import { investmentApi } from './investmentApi';
import { InvestmentMarketPrice } from './InvestmentMarketPrice';
import { InvestmentProfitLoss } from './InvestmentProfitLoss';
import { useMarketPrices } from './useMarketPrices';
export function InvestmentTargetScreen({ targetId, onBack, onOpenProfile, onOpenSettings, api = investmentApi, marketClient }) {
  const { t, i18n } = useTranslation();
  const model = useInvestmentDetail({ api, targetId });
  const [editor, setEditor] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const data = model.data;
  const applicationMarket = useInvestmentMarket();
  const applicationPrices = useInvestmentMarketSnapshot(applicationMarket?.store);
  const localPrices = useMarketPrices(
    data ? [data.target] : [],
    marketClient,
    !applicationMarket,
  );
  const prices = applicationMarket ? applicationPrices : localPrices;
  const number = value => formatInvestmentDecimal(value, i18n.resolvedLanguage);
  const confirm = async () => {
    const target = confirmation === 'target';
    const done = target ? await model.deleteTarget() : await model.deleteTrade(editor.value.id);
    setConfirmation(null);
    if (!done) return;
    setEditor(null);
    if (target) {
      await applicationMarket?.refreshTargets();
      onBack();
    }
  };
  const saveEditor = async draft => {
    const target = editor.kind === 'target';
    const saved = target
      ? await model.saveTarget(draft)
      : await model.saveTrade(draft, editor.value?.id);
    if (saved && target) await applicationMarket?.refreshTargets();
    return saved;
  };
  return <InvestmentLayout title={data?.target.symbol || t('investmentTargetDetail')} backKey="investmentBackToList" onBack={onBack} onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings} model={model}>
    {data && !model.loading && !model.loadError && <div className="w-full">
      <section>
        <div className="mb-1 flex items-baseline justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 border-b border-dashed border-blue-600 pb-0.5 text-lg font-semibold text-slate-900 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:text-xl dark:border-blue-400 dark:text-slate-100 dark:hover:text-blue-200"
              aria-label={t('investmentEditTarget')}
              title={t('investmentEditTarget')}
              onClick={() => setEditor({ kind: 'target', value: data.target })}
            >
              {data.target.symbol}
            </button>
            <InvestmentMarketPrice target={data.target} price={prices[data.target.symbol]} prominent />
          </div>
          <InvestmentProfitLoss price={prices[data.target.symbol]} summary={data.summary} prominent />
        </div>
        <InvestmentSummary summary={data.summary} symbol={data.target.symbol} detail />
        {data.target.note && <p className="mb-3 break-words text-center text-sm text-slate-600 dark:text-slate-300">{data.target.note}</p>}
      </section>
      <div className="mb-1 flex min-h-9 items-center justify-between border-t border-slate-200/70 pt-3 dark:border-slate-800/70">
        <h2 className="text-sm font-semibold">{t('investmentTrades')}</h2>
        <button
          type="button"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          aria-label={t('investmentAddTrade')}
          title={t('investmentAddTrade')}
          onClick={() => setEditor({ kind: 'trade', openedAt: new Date() })}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
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
    </div>}
    {editor && <InvestmentEditor key={`${editor.kind}-${editor.value?.id || 'new'}`} {...editor} symbolLocked={data?.symbolLocked}
      saving={model.saving} onClose={() => setEditor(null)}
      onSave={saveEditor}
      onDelete={editor.value ? () => setConfirmation(editor.kind) : undefined} />}
    {confirmation && <InvestmentConfirm busy={model.saving} onClose={() => setConfirmation(null)} onConfirm={confirm}
      messageKey={confirmation === 'target' ? 'investmentDeleteTargetConfirm' : 'investmentDeleteConfirm'} />}
  </InvestmentLayout>;
}
