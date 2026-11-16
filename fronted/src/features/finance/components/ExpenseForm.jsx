import React from 'react';
import { NOTE_POLICY, resolveCategoryMessageKey } from '@mogo/finance-core';

export function ExpenseForm({ t, categories, form, selectedCategory, onFormChange, onManageCategories, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="section-title">{t('addExpense')}</h2>

      <label className="form-label mt-5" htmlFor="amount">{t('amountWithCurrency')}</label>
      <input
        id="amount"
        className="field mt-2"
        type="number"
        min="0.01"
        step="0.01"
        value={form.amount}
        onChange={(event) => onFormChange({ amount: event.target.value })}
        placeholder={t('amountPlaceholder')}
        required
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="form-label" htmlFor="category">{t('category')}</label>
        <button className="text-sm text-slate-500 underline-offset-4 hover:underline dark:text-slate-400" type="button" onClick={onManageCategories}>
          {t('addCategory')}
        </button>
      </div>
      <select
        id="category"
        className="field mt-2"
        value={form.categoryId}
        onChange={(event) => onFormChange({ categoryId: event.target.value })}
        required
      >
        {categories.map((category) => {
          const messageKey = resolveCategoryMessageKey(category);
          return <option key={category.id} value={category.id}>{messageKey ? t(messageKey) : category.name}</option>;
        })}
      </select>

      <label className="form-label mt-4" htmlFor="note">
        {t(selectedCategory?.notePolicy === NOTE_POLICY.REQUIRED ? 'noteRequiredLabel' : 'noteOptional')}
      </label>
      <textarea
        id="note"
        className="field mt-2 min-h-20 resize-y"
        value={form.note}
        onChange={(event) => onFormChange({ note: event.target.value })}
        placeholder={t('notePlaceholder')}
      />

      <button className="button-primary mt-5 w-full" type="submit">{t('submit')}</button>
    </form>
  );
}
