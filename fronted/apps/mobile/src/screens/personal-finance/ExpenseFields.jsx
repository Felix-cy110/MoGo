import React from 'react';
import { useTranslation } from 'react-i18next';
import { findCategory } from '@mogo/personal-finance-core';
import ChoiceField from '../../components/ChoiceField';
import { Action, Field, FormSheet } from '../../components/Primitives';
import { categoryLabel } from './categoryLabel';

export default function ExpenseFields({
  form,
  setForm,
  categories,
  onManageCategories,
}) {
  const { t } = useTranslation();
  const selected = findCategory(categories, form.categoryId);
  const update = (key, value) =>
    setForm(current => ({ ...current, [key]: value }));
  return (
    <FormSheet>
      <Field
        label={t('amountWithCurrency')}
        value={form.amount}
        onChangeText={value => update('amount', value)}
        numeric
        placeholder={t('amountPlaceholder')}
      />
      <ChoiceField
        label={t('category')}
        value={form.categoryId}
        onChange={value => update('categoryId', value)}
        action={
          onManageCategories && (
            <Action
              compact
              title={t('manageCategories')}
              onPress={onManageCategories}
            />
          )
        }
        options={categories.map(category => ({
          value: String(category.id),
          label: categoryLabel(category, t),
        }))}
      />
      <Field
        label={t(
          selected?.notePolicy === 'REQUIRED'
            ? 'noteRequiredLabel'
            : 'noteOptional',
        )}
        value={form.note}
        onChangeText={value => update('note', value)}
        multiline
        placeholder={t('notePlaceholder')}
      />
    </FormSheet>
  );
}
