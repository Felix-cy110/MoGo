import React, { useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDailyFinance } from '@mogo/personal-finance-react';
import {
  formatMoney,
  formatTime,
  resolveAlertMessageKey,
} from '@mogo/personal-finance-core';
import {
  Action,
  Field,
  Label,
  LinkRow,
  Loading,
  Page,
  Row,
  Section,
} from '../../components/Primitives';
import useFeedback from '../../components/useFeedback';
import ExpenseFields from './ExpenseFields';
import CategoryTotals from './CategoryTotals';
import ExpenseEditor from './ExpenseEditor';
import { categoryLabel } from './categoryLabel';

export default function FinanceScreen({ api, navigate, date }) {
  const model = useDailyFinance({ api, initialDate: date });
  const { t, i18n } = useTranslation();
  const lastAlerts = useRef(null);
  useFeedback(
    model.alerts.length ? null : model.feedback,
    model.dismissFeedback,
  );
  const { alerts, dismissAlerts, dismissFeedback } = model;
  useEffect(() => {
    if (!alerts.length || lastAlerts.current === alerts) return;
    lastAlerts.current = alerts;
    Alert.alert(
      t('warning'),
      alerts.map(alert => t(resolveAlertMessageKey(alert))).join('\n'),
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
  }, [alerts, dismissAlerts, dismissFeedback, t]);
  if (!model.dashboard)
    return (
      <Page>
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
  const money = value => formatMoney(value, i18n.language);
  return (
    <Page>
      <Section>
        <Field
          label={t('budgetWithCurrency')}
          numeric
          value={model.budgetInput}
          onChangeText={model.setBudgetInput}
        />
        <Action title={t('saveBudget')} onPress={model.saveBudget} />
        <Row label={t('spent')}>
          <Label>{money(model.dashboard.totalAmountCents)}</Label>
        </Row>
        <Row label={t('remaining')}>
          <Label>{money(model.dashboard.remainingAmountCents)}</Label>
        </Row>
      </Section>
      <Section title={t('addExpense')}>
        <ExpenseFields
          form={model.form}
          setForm={model.setForm}
          categories={model.categories}
        />
        <Action title={t('submit')} onPress={model.addExpense} />
        <LinkRow
          title={t('manageCategories')}
          onPress={() => navigate('categories')}
        />
        <LinkRow
          title={t('expenseAnalysis')}
          onPress={() => navigate('analytics')}
        />
      </Section>
      <Section title={t('recentExpenses')}>
        {model.dashboard.expenses.length ? (
          model.dashboard.expenses.map(expense => (
            <Pressable
              key={expense.id}
              accessibilityRole="button"
              accessibilityLabel={`${t('editExpenseTitle')} ${categoryLabel(
                expense,
                t,
              )} ${money(expense.amountCents)}`}
              onPress={() => model.startEditingExpense(expense)}
              style={styles.expense}
            >
              <View style={styles.description}>
                <Label>{categoryLabel(expense, t)}</Label>
                <Label muted>
                  {expense.note || t('noNote')} ·{' '}
                  {formatTime(expense.occurredAt, i18n.language)}
                </Label>
              </View>
              <Label>{money(expense.amountCents)}</Label>
            </Pressable>
          ))
        ) : (
          <Row label={t('noExpenses')} />
        )}
      </Section>
      <CategoryTotals items={model.dashboard.categoryTotals} />
      <ExpenseEditor model={model} />
    </Page>
  );
}
const styles = StyleSheet.create({
  expense: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
  },
  description: { flex: 1 },
});
