import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatInvestmentDecimal, investmentMarketSymbol } from '@mogo/investment-management-core';

export function InvestmentMarketPrice({ target, price, prominent = false }) {
  const { t, i18n } = useTranslation();
  const symbol = investmentMarketSymbol(target);
  if (!symbol || !price) return null;
  const value = formatInvestmentDecimal(price, i18n.resolvedLanguage);
  const className = prominent
    ? 'block text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100'
    : 'ml-2 inline-block text-sm font-normal tabular-nums text-slate-600 dark:text-slate-300';
  return <span className={className}
    title={t('investmentMarketPriceLabel', { symbol, price: value })}>
    {t('investmentMarketPrice', { price: value })}
  </span>;
}
