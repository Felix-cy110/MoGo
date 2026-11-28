import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatInvestmentDecimal,
  formatInvestmentQuantity,
} from '@mogo/investment-management-core';
export function InvestmentSummary({ summary, symbol, detail = false }) {
  const { t, i18n } = useTranslation();
  const values = [
    ['investmentTotalAmount', summary.totalQuoteAmount, formatInvestmentDecimal],
    ['investmentTotalQuantity', summary.totalQuantity, formatInvestmentQuantity],
    ['investmentAveragePrice', summary.averageEntryPrice, formatInvestmentDecimal],
    ['investmentBuyCount', String(summary.buyCount), formatInvestmentDecimal]
  ];
  const gridClass = detail
    ? 'grid grid-cols-2 gap-x-4 gap-y-4 py-4'
    : 'grid grid-cols-2 gap-x-4 gap-y-3 py-3';
  return <dl className={gridClass}>
    {values.map(([key, value, formatter], index) => {
      const highlighted = key === 'investmentAveragePrice';
      const alignment = detail ? (index % 2 === 0 ? 'text-left' : 'text-right') : '';
      return <div key={key} className={`min-w-0 ${alignment}`}>
        <dt className={`text-xs ${highlighted ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>{t(key, { symbol })}</dt>
        <dd className={`mt-1 break-all tabular-nums ${detail ? 'text-base' : 'text-sm'} ${highlighted ? 'font-semibold text-blue-700 dark:text-blue-300' : 'font-medium'}`}>{formatter(value, i18n.resolvedLanguage)}</dd>
      </div>;
    })}
  </dl>;
}
