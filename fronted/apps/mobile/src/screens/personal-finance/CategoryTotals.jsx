import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney, getLocale } from '@mogo/personal-finance-core';
import { Label, Section } from '../../components/Primitives';
import { usePreferences } from '../../platform/PreferencesProvider';
import { categoryLabel } from './categoryLabel';

export default function CategoryTotals({ items = [], breakdown = false }) {
  const { t, i18n } = useTranslation();
  const { colors } = usePreferences();
  const number = new Intl.NumberFormat(getLocale(i18n.language));
  const percent = new Intl.NumberFormat(getLocale(i18n.language), {
    style: 'percent',
  });
  return (
    <Section
      plain
      title={t(breakdown ? 'categoryBreakdown' : 'categorySummary')}
    >
      {!items.length ? (
        <Label muted>{t('noCategoryData')}</Label>
      ) : (
        <View style={[styles.table, { borderColor: colors.line }]}>
          {!breakdown && (
            <View style={[styles.row, { borderColor: colors.line }]}>
              <Label muted style={styles.name}>
                {t('category')}
              </Label>
              <Label muted style={styles.count}>
                {t('count')}
              </Label>
              <Label muted style={styles.amount}>
                {t('amount')}
              </Label>
            </View>
          )}
          {items.map(item => (
            <View
              key={item.categoryId}
              style={[styles.row, { borderColor: colors.line }]}
            >
              <View style={styles.name}>
                <Label style={styles.text}>{categoryLabel(item, t)}</Label>
                {breakdown && (
                  <Label muted style={styles.detail}>
                    {number.format(item.expenseCount || 0)} {t('count')} ·{' '}
                    {percent.format((item.sharePercent || 0) / 100)}
                  </Label>
                )}
              </View>
              {!breakdown && (
                <Label muted style={styles.count}>
                  {number.format(item.expenseCount || 0)}
                </Label>
              )}
              <Label style={styles.amount}>
                {formatMoney(item.amountCents, i18n.language)}
              </Label>
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}
const styles = StyleSheet.create({
  table: { borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, fontSize: 14 },
  count: {
    width: '16%',
    textAlign: 'right',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  amount: {
    width: '38%',
    textAlign: 'right',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  text: { fontSize: 14 },
  detail: { fontSize: 12, marginTop: 4 },
});
