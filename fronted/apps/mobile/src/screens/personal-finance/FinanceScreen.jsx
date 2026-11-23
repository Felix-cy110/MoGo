import React, { useEffect, useRef } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDailyFinance } from '@mogo/personal-finance-react';
import { resolveAlertMessageKey } from '@mogo/personal-finance-core';
import {
  Action,
  Label,
  Loading,
  Page,
  Section,
} from '../../components/Primitives';
import useFeedback from '../../components/useFeedback';
import ExpenseFields from './ExpenseFields';
import CategoryTotals from './CategoryTotals';
import ExpenseEditor from './ExpenseEditor';
import BudgetOverview from './BudgetOverview';
import ExpenseList from './ExpenseList';

export default function FinanceScreen({ api, navigate, date }) {
  const model = useDailyFinance({ api, initialDate: date });
  const { t } = useTranslation();
  const lastAlerts = useRef(null);
  const editTrigger = useRef(null);
  useFeedback(
    model.alerts.length ? null : model.feedback,
    model.dismissFeedback,
  );
  const { alerts, dismissAlerts, dismissFeedback, access } = model;
  useEffect(() => {
    if (!alerts.length || lastAlerts.current === alerts) return;
    lastAlerts.current = alerts;
    Alert.alert(
      t('warning'),
      alerts
        .map(alert =>
          t(resolveAlertMessageKey(alert, { isToday: access.isToday })),
        )
        .join('\n'),
      [
        {
          text: t('confirm'),
          onPress: () => {
            dismissAlerts();
            dismissFeedback();
          },
        },
      ],
      { cancelable: false },
    );
  }, [alerts, dismissAlerts, dismissFeedback, access.isToday, t]);
  if (!model.dashboard)
    return (
      <Page plain>
        {model.feedback ? (
          <>
            <Label>{t('loadFailed')}</Label>
            <Action
              title={t('retry')}
              onPress={() =>
                model.refresh().catch(() => Alert.alert(t('loadFailed')))
              }
            />
          </>
        ) : (
          <Loading />
        )}
      </Page>
    );
  return (
    <Page plain>
      <BudgetOverview
        model={model}
        onOpenAnalytics={() => navigate('analytics')}
      />
      <Section plain title={t('addExpense')}>
        <ExpenseFields
          form={model.form}
          setForm={model.setForm}
          categories={model.categories}
          onManageCategories={
            access.canManageCategories
              ? () => navigate('categories')
              : undefined
          }
        />
        <Action
          variant="primary"
          style={styles.submit}
          title={t('submit')}
          onPress={model.addExpense}
        />
      </Section>
      <ExpenseList
        expenses={model.dashboard.expenses}
        isToday={access.isToday}
        onEdit={(expense, trigger) => {
          editTrigger.current = trigger;
          model.startEditingExpense(expense);
        }}
      />
      <CategoryTotals items={model.dashboard.categoryTotals} />
      <ExpenseEditor model={model} returnFocusRef={editTrigger} />
    </Page>
  );
}
const styles = StyleSheet.create({
  submit: { marginTop: 16, marginBottom: 12 },
});
