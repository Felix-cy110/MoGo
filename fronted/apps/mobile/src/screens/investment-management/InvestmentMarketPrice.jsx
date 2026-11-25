import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatInvestmentDecimal, investmentMarketSymbol } from '@mogo/investment-management-core';
import { Label } from '../../components/Primitives';

export default function InvestmentMarketPrice({ target, price }) {
  const { t, i18n } = useTranslation();
  const symbol = investmentMarketSymbol(target);
  if (!symbol || !price) return null;
  const value = formatInvestmentDecimal(price, i18n.resolvedLanguage);
  return (
    <Label
      muted
      style={styles.price}
      accessibilityLabel={t('investmentMarketPriceLabel', { symbol, price: value })}>
      {'  '}{t('investmentMarketPrice', { price: value })}
    </Label>
  );
}
const styles = StyleSheet.create({
  price: { fontSize: 14, fontWeight: '400', fontVariant: ['tabular-nums'] },
});
