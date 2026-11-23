import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  clampPercent,
  formatMoney,
  getLocale,
} from '@mogo/personal-finance-core';
import { Action, Field, FormSheet, Label } from '../../components/Primitives';
import { usePreferences } from '../../platform/PreferencesProvider';

export default function BudgetOverview({ model, onOpenAnalytics }) {
  const { t, i18n } = useTranslation();
  const { colors, mode } = usePreferences();
  const { dashboard, access } = model;
  const money = amount => formatMoney(amount, i18n.language);
  const progress = clampPercent(dashboard.usagePercent);
  const percent = new Intl.NumberFormat(getLocale(i18n.language), {
    style: 'percent',
    maximumFractionDigits: 2,
  }).format((dashboard.usagePercent || 0) / 100);
  const progressColor =
    progress >= 100
      ? colors.danger
      : progress >= 80
      ? mode === 'dark'
        ? '#fbbf24'
        : '#b45309'
      : colors.text;
  return (
    <View style={[styles.section, { borderColor: colors.line }]}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            access.isToday ? 'toggleToYesterday' : 'toggleToToday',
          )}
          onPress={model.toggleDate}
          style={styles.dateButton}
        >
          <Label muted>{t(access.isToday ? 'today' : 'yesterday')} ▾</Label>
        </Pressable>
        <Action
          compact
          title={`${t('expenseAnalysis')} ›`}
          accessibilityLabel={t('expenseAnalysis')}
          onPress={onOpenAnalytics}
        />
      </View>
      <Label style={styles.total}>{money(dashboard.totalAmountCents)}</Label>
      <Label muted style={styles.detail}>
        {t('budget')} {money(dashboard.budgetAmountCents)} · {t('remaining')}{' '}
        {money(dashboard.remainingAmountCents)}
      </Label>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('usage')}
        accessibilityValue={{ min: 0, max: 100, now: progress, text: percent }}
        style={[styles.track, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.fill,
            { width: `${progress}%`, backgroundColor: progressColor },
          ]}
        />
      </View>
      <Label muted style={styles.detail}>
        {t('usage')}: {percent}
      </Label>
      {access.canSaveBudget ? (
        <View style={styles.budget}>
          <FormSheet>
            <Field
              label={t('budgetWithCurrency')}
              numeric
              value={model.budgetInput}
              onChangeText={model.setBudgetInput}
              placeholder={t('budgetPlaceholder')}
              action={
                <Action
                  compact
                  title={t('saveBudget')}
                  onPress={model.saveBudget}
                />
              }
            />
          </FormSheet>
        </View>
      ) : (
        <Label muted style={styles.hint}>
          {t('yesterdayReadOnlyHint')}
        </Label>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
    marginBottom: 24,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateButton: { minHeight: 44, justifyContent: 'center' },
  total: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  detail: { fontSize: 13 },
  track: { height: 8, overflow: 'hidden', marginTop: 16, marginBottom: 8 },
  fill: { height: '100%' },
  budget: { marginTop: 20 },
  hint: { marginTop: 12, fontSize: 13 },
});
