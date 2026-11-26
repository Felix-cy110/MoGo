import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  calculateInvestmentProfitLoss,
  formatInvestmentProfitLoss,
} from '@mogo/investment-management-core';
import { Label } from '../../components/Primitives';
import { usePreferences } from '../../platform/PreferencesProvider';

export default function InvestmentProfitLoss({ price, summary }) {
  const { t, i18n } = useTranslation();
  const { colors } = usePreferences();
  const profitLoss = formatInvestmentProfitLoss(
    calculateInvestmentProfitLoss({ price, summary }),
    i18n.resolvedLanguage,
  );
  if (!profitLoss) return null;

  const color = profitLoss.direction === 'profit'
    ? colors.accent
    : profitLoss.direction === 'loss'
      ? colors.danger
      : colors.muted;

  return (
    <Label
      style={[styles.value, { color }]}
      accessibilityLabel={t('investmentProfitLossLabel', profitLoss)}
    >
      {t('investmentProfitLoss', profitLoss)}
    </Label>
  );
}

const styles = StyleSheet.create({
  value: {
    maxWidth: '55%',
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
