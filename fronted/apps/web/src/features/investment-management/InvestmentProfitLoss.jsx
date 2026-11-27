import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  calculateInvestmentProfitLoss,
  formatInvestmentProfitLoss,
} from '@mogo/investment-management-core';

export function InvestmentProfitLoss({ price, summary }) {
  const { t, i18n } = useTranslation();
  const profitLoss = formatInvestmentProfitLoss(
    calculateInvestmentProfitLoss({ price, summary }),
    i18n.resolvedLanguage,
  );
  if (!profitLoss) return null;

  const color = profitLoss.direction === 'profit'
    ? 'text-emerald-700 dark:text-emerald-400'
    : profitLoss.direction === 'loss'
      ? 'text-red-700 dark:text-red-400'
      : 'text-slate-500 dark:text-slate-400';
  return (
    <span
      className={`max-w-[55%] shrink-0 text-right text-sm font-medium tabular-nums ${color}`}
      aria-label={t('investmentProfitLossLabel', profitLoss)}
    >
      {t('investmentProfitLoss', profitLoss)}
    </span>
  );
}
