import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatInvestmentDecimal } from '@mogo/investment-management-core';
import { Label } from '../../components/Primitives';
export default function InvestmentSummary({ summary, symbol }) {
  const { t, i18n } = useTranslation();
  const values = [
    ['investmentTotalAmount', summary.totalQuoteAmount],
    ['investmentTotalQuantity', summary.totalQuantity],
    ['investmentAveragePrice', summary.averageEntryPrice],
    ['investmentBuyCount', String(summary.buyCount)],
  ];
  return (
    <View style={styles.grid}>
      {values.map(([key, value]) => (
        <View key={key} style={styles.item}>
          <Label muted style={styles.label}>
            {t(key, { symbol })}
          </Label>
          <Label>{formatInvestmentDecimal(value, i18n.resolvedLanguage)}</Label>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 12,
  },
  item: { width: '47%' },
  label: { fontSize: 12 },
});
