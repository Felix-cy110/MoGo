import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatInvestmentDecimal,
  formatInvestmentQuantity,
} from '@mogo/investment-management-core';
export function InvestmentSummary({ summary, symbol, centered = false }) {
  const { t, i18n } = useTranslation();
  const values = [
    ['investmentTotalAmount', summary.totalQuoteAmount, formatInvestmentDecimal],
    ['investmentTotalQuantity', summary.totalQuantity, formatInvestmentQuantity],
    ['investmentAveragePrice', summary.averageEntryPrice, formatInvestmentDecimal],
    ['investmentBuyCount', String(summary.buyCount), formatInvestmentDecimal]
  ];
  const gridClass = centered
    ? 'grid grid-cols-2 gap-x-4 gap-y-4 py-4 sm:grid-cols-4'
    : 'grid grid-cols-2 gap-x-4 gap-y-3 py-3';
  return <dl className={gridClass}>
    {values.map(([key, value, formatter]) => {
      const highlighted = key === 'investmentAveragePrice';
      return <div key={key} className={`min-w-0 ${centered ? 'text-center' : ''}`}>
        <dt className={`text-xs ${highlighted ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>{t(key, { symbol })}</dt>
        <dd className={`mt-1 break-all tabular-nums ${centered ? 'text-base' : 'text-sm'} ${highlighted ? 'font-semibold text-blue-700 dark:text-blue-300' : 'font-medium'}`}>{formatter(value, i18n.resolvedLanguage)}</dd>
      </div>;
    })}
  </dl>;
}
