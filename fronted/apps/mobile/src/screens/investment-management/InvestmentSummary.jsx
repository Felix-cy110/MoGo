import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  formatInvestmentDecimal,
  formatInvestmentQuantity,
} from '@mogo/investment-management-core';
import { Label } from '../../components/Primitives';
import { usePreferences } from '../../platform/PreferencesProvider';
export default function InvestmentSummary({ summary, symbol }) {
  const { t, i18n } = useTranslation();
  const { colors } = usePreferences();
  const values = [
    ['investmentTotalAmount', summary.totalQuoteAmount, formatInvestmentDecimal],
    ['investmentTotalQuantity', summary.totalQuantity, formatInvestmentQuantity],
    ['investmentAveragePrice', summary.averageEntryPrice, formatInvestmentDecimal],
    ['investmentBuyCount', String(summary.buyCount), formatInvestmentDecimal],
  ];
  return (
    <View style={styles.grid}>
      {values.map(([key, value, formatter]) => {
        const highlighted = key === 'investmentAveragePrice';
        const highlightColor = highlighted && { color: colors.highlight };
        return (
          <View key={key} style={styles.item}>
            <Label muted style={[styles.label, highlightColor]}>
              {t(key, { symbol })}
            </Label>
            <Label style={[highlightColor, highlighted && styles.highlightValue]}>
              {formatter(value, i18n.resolvedLanguage)}
            </Label>
          </View>
        );
      })}
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
  highlightValue: { fontWeight: '600' },
});
