import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatTime } from '@mogo/personal-finance-core';
import { Label, Section } from '../../components/Primitives';
import { usePreferences } from '../../platform/PreferencesProvider';
import { categoryLabel } from './categoryLabel';

export default function ExpenseList({ expenses, isToday, onEdit }) {
  const triggers = useRef(new Map());
  const { t, i18n } = useTranslation();
  const { colors } = usePreferences();
  return (
    <Section plain title={t(isToday ? 'recentExpenses' : 'yesterdayExpenses')}>
      <View style={[styles.list, { borderColor: colors.line }]}>
        {expenses.length ? (
          expenses.map(expense => (
            <Pressable
              key={expense.id}
              ref={node => {
                if (node) triggers.current.set(expense.id, node);
                else triggers.current.delete(expense.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${t('editExpenseTitle')} ${categoryLabel(
                expense,
                t,
              )} ${formatMoney(expense.amountCents, i18n.language)} ${
                expense.note || t('noNote')
              } ${formatTime(expense.occurredAt, i18n.language)}`}
              onPress={() => onEdit(expense, triggers.current.get(expense.id))}
              style={[styles.row, { borderColor: colors.line }]}
            >
              <Label style={styles.category} numberOfLines={2}>
                {categoryLabel(expense, t)}
              </Label>
              <Label muted numberOfLines={1} style={styles.note}>
                {expense.note || t('noNote')} ·{' '}
                {formatTime(expense.occurredAt, i18n.language)}
              </Label>
              <Label style={styles.amount}>
                {formatMoney(expense.amountCents, i18n.language)}
              </Label>
            </Pressable>
          ))
        ) : (
          <Label muted style={styles.empty}>
            {t(isToday ? 'noExpenses' : 'noYesterdayExpenses')}
          </Label>
        )}
      </View>
    </Section>
  );
}
const styles = StyleSheet.create({
  list: { borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    minHeight: 52,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  category: { width: '24%', fontSize: 14 },
  note: { flex: 1, fontSize: 13 },
  amount: {
    maxWidth: '40%',
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  empty: { paddingVertical: 28, textAlign: 'center', fontSize: 14 },
});
