import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceAnalytics } from '@mogo/personal-finance-react';
import { formatMoney } from '@mogo/personal-finance-core';
import {
  Action,
  Label,
  Loading,
  Page,
  Row,
  Section,
} from '../../components/Primitives';
import ChoiceField from '../../components/ChoiceField';
import CategoryTotals from './CategoryTotals';
import TrendChart from './TrendChart';
export default function AnalyticsScreen({ api }) {
  const model = useFinanceAnalytics({ api });
  const { t, i18n } = useTranslation();
  return (
    <Page>
      <Section>
        <ChoiceField
          label={t('expenseAnalysis')}
          value={model.period}
          onChange={model.setPeriod}
          options={[
            { value: 'week', label: t('weeklyAnalysis') },
            { value: 'month', label: t('monthlyAnalysis') },
          ]}
        />
      </Section>
      {model.loading ? (
        <Loading />
      ) : model.feedback ? (
        <>
          <Label>{t(model.feedback.key)}</Label>
          <Action title={t('retry')} onPress={model.refresh} />
        </>
      ) : (
        <>
          <Section>
            <Row label={t('totalSpent')}>
              <Label>
                {formatMoney(model.view.totalAmountCents, i18n.language)}
              </Label>
            </Row>
            <Row label={t('dailyAverage')}>
              <Label>
                {formatMoney(model.view.averageAmountCents, i18n.language)}
              </Label>
            </Row>
            <Row label={t('expenseEntries')}>
              <Label>
                {new Intl.NumberFormat(i18n.language).format(
                  model.view.expenseCount,
                )}
              </Label>
            </Row>
          </Section>
          <Section title={t('spendingTrend')}>
            <TrendChart key={model.period} days={model.view.days} />
          </Section>
          <CategoryTotals items={model.view.categoryTotals} />
        </>
      )}
    </Page>
  );
}
