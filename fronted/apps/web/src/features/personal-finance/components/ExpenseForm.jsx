import React from 'react';
import { NOTE_POLICY, resolveCategoryMessageKey } from '@mogo/personal-finance-core';
import { FormFieldRow } from '../../../components/FormFieldRow';

export function ExpenseForm({ t, categories, form, selectedCategory, onFormChange, onManageCategories, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="section-title">{t('addExpense')}</h2>

      <div className="form-sheet mt-4">
        <FormFieldRow label={t('amountWithCurrency')} htmlFor="amount">
          <input
            id="amount"
            className="field form-row-field"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(event) => onFormChange({ amount: event.target.value })}
            placeholder={t('amountPlaceholder')}
            required
          />
        </FormFieldRow>

        <FormFieldRow label={t('category')} htmlFor="category">
          <div className="flex min-w-0 items-center gap-2">
            <select
              id="category"
              className="field form-row-field min-w-0 flex-1"
              value={form.categoryId}
              onChange={(event) => onFormChange({ categoryId: event.target.value })}
              required
            >
              {categories.map((category) => {
                const messageKey = resolveCategoryMessageKey(category);
                return <option key={category.id} value={category.id}>{messageKey ? t(messageKey) : category.name}</option>;
              })}
            </select>
            <button className="form-row-action" type="button" onClick={onManageCategories}>
              {t('manageCategories')}
            </button>
          </div>
        </FormFieldRow>

        <FormFieldRow
          label={t(selectedCategory?.notePolicy === NOTE_POLICY.REQUIRED ? 'noteRequiredLabel' : 'noteOptional')}
          htmlFor="note"
          alignStart
        >
          <textarea
            id="note"
            className="field form-row-field min-h-20 resize-y"
            value={form.note}
            onChange={(event) => onFormChange({ note: event.target.value })}
            placeholder={t('notePlaceholder')}
          />
        </FormFieldRow>
      </div>

      <button className="button-primary mt-4 w-full" type="submit">{t('submit')}</button>
    </form>
  );
}
