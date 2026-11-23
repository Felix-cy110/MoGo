import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFinanceAnalytics } from '@mogo/personal-finance-react';
import {
  ANALYTICS_PERIOD,
  formatDisplayDate,
  formatMoney,
  getLocale,
} from '@mogo/personal-finance-core';
import {
  Action,
  Label,
  Loading,
  Page,
  Section,
} from '../../components/Primitives';
import { usePreferences } from '../../platform/PreferencesProvider';
import CategoryTotals from './CategoryTotals';
import TrendChart from './TrendChart';

export default function AnalyticsScreen({ api }) {
  const model = useFinanceAnalytics({ api });
  const { t, i18n } = useTranslation();
  const { colors } = usePreferences();
  const number = new Intl.NumberFormat(getLocale(i18n.language));
  const metrics = [
    ['totalSpent', formatMoney(model.view.totalAmountCents, i18n.language)],
    ['dailyAverage', formatMoney(model.view.averageAmountCents, i18n.language)],
    ['activeDays', number.format(model.view.activeDayCount)],
    ['expenseEntries', number.format(model.view.expenseCount)],
  ];
  return (
    <Page plain>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t('expenseAnalysis')}
        style={[styles.tabs, { borderColor: colors.line }]}
      >
        {[
          [ANALYTICS_PERIOD.WEEK, 'weeklyAnalysis'],
          [ANALYTICS_PERIOD.MONTH, 'monthlyAnalysis'],
        ].map(([value, key]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityLabel={t(key)}
            accessibilityState={{ selected: model.period === value }}
            onPress={() => model.setPeriod(value)}
            style={[
              styles.tab,
              model.period === value && { borderBottomColor: colors.text },
            ]}
          >
            <Label muted={model.period !== value}>{t(key)}</Label>
          </Pressable>
        ))}
      </View>
      <Label muted style={styles.range}>
        {t('analysisRange', {
          start: formatDisplayDate(model.range.startDate, i18n.language),
          end: formatDisplayDate(model.range.endDate, i18n.language),
        })}
      </Label>
      {model.loading ? (
        <Loading />
      ) : model.feedback ? (
        <>
          <Label>{t(model.feedback.key)}</Label>
          <Action title={t('retry')} onPress={model.refresh} />
        </>
      ) : (
        <>
          <View style={[styles.metrics, { borderColor: colors.line }]}>
            {metrics.map(([key, value], index) => (
              <View
                key={key}
                style={[
                  styles.metric,
                  index % 2 === 0 && styles.leftMetric,
                  index > 1 && styles.bottomMetric,
                  { borderColor: colors.line },
                ]}
              >
                <Label muted style={styles.metricLabel}>
                  {t(key)}
                </Label>
                <Label style={styles.metricValue}>{value}</Label>
              </View>
            ))}
          </View>
          {model.view.expenseCount === 0 ? (
            <Label muted style={styles.empty}>
              {t('noAnalysisData')}
            </Label>
          ) : (
            <>
              <Section plain title={t('spendingTrend')}>
                <TrendChart key={model.period} days={model.view.days} />
              </Section>
              <CategoryTotals items={model.view.categoryTotals} breakdown />
            </>
          )}
        </>
      )}
    </Page>
  );
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  range: { fontSize: 13, marginTop: 12, marginBottom: 24 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
  },
  metric: { width: '50%', padding: 16 },
  leftMetric: { borderRightWidth: StyleSheet.hairlineWidth },
  bottomMetric: { borderTopWidth: StyleSheet.hairlineWidth },
  metricLabel: { fontSize: 12 },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  empty: { paddingVertical: 24 },
});
