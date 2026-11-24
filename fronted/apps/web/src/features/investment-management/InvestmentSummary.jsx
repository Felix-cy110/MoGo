import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatInvestmentDecimal } from '@mogo/investment-management-core';
export function InvestmentSummary({ summary, symbol }) {
  const { t, i18n } = useTranslation();
  const values = [
    ['investmentTotalAmount', summary.totalQuoteAmount],
    ['investmentTotalQuantity', summary.totalQuantity],
    ['investmentAveragePrice', summary.averageEntryPrice],
    ['investmentBuyCount', String(summary.buyCount)]
  ];
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-3 py-3">
    {values.map(([key, value]) => <div key={key} className="min-w-0">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{t(key, { symbol })}</dt>
      <dd className="mt-1 break-all text-sm font-medium tabular-nums">{formatInvestmentDecimal(value, i18n.resolvedLanguage)}</dd>
    </div>)}
  </dl>;
}
