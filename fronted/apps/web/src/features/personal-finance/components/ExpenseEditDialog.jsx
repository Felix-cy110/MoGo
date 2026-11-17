import React from 'react';
import { NOTE_POLICY, resolveCategoryMessageKey } from '@mogo/personal-finance-core';
import { FormFieldRow } from './FormFieldRow';

export function ExpenseEditDialog({
  t,
  open,
  categories,
  form,
  selectedCategory,
  feedback,
  feedbackText,
  onFormChange,
  onClose,
  onSubmit
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-5" role="dialog" aria-modal="true" aria-labelledby="expense-edit-dialog-title">
      <form className="w-full max-w-md border border-slate-300 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900" onSubmit={onSubmit}>
        <h2 id="expense-edit-dialog-title" className="text-lg font-semibold">{t('editExpenseTitle')}</h2>
        {feedback?.type === 'error' && <div className="notice notice-error mt-4 mb-0">{feedbackText}</div>}

        <div className="form-sheet mt-5">
          <FormFieldRow label={t('amountWithCurrency')} htmlFor="edit-expense-amount">
            <input
              id="edit-expense-amount"
              className="field form-row-field"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => onFormChange({ amount: event.target.value })}
              required
              autoFocus
            />
          </FormFieldRow>

          <FormFieldRow label={t('category')} htmlFor="edit-expense-category">
            <select
              id="edit-expense-category"
              className="field form-row-field"
              value={form.categoryId}
              onChange={(event) => onFormChange({ categoryId: event.target.value })}
              required
            >
              {categories.map((category) => {
                const messageKey = resolveCategoryMessageKey(category);
                return <option key={category.id} value={category.id}>{messageKey ? t(messageKey) : category.name}</option>;
              })}
            </select>
          </FormFieldRow>

          <FormFieldRow
            label={t(selectedCategory?.notePolicy === NOTE_POLICY.REQUIRED ? 'noteRequiredLabel' : 'noteOptional')}
            htmlFor="edit-expense-note"
            alignStart
          >
            <textarea
              id="edit-expense-note"
              className="field form-row-field min-h-20 resize-y"
              value={form.note}
              onChange={(event) => onFormChange({ note: event.target.value })}
              placeholder={t('notePlaceholder')}
            />
          </FormFieldRow>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="button-secondary" type="button" onClick={onClose}>{t('cancel')}</button>
          <button className="button-primary" type="submit">{t('updateExpense')}</button>
        </div>
      </form>
    </div>
  );
}
