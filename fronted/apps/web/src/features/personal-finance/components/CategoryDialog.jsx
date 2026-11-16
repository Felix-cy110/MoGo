import React from 'react';
import { FormFieldRow } from './FormFieldRow';

export function CategoryDialog({ t, open, form, feedback, feedbackText, onFormChange, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-5" role="dialog" aria-modal="true" aria-labelledby="category-dialog-title">
      <form className="w-full max-w-sm border border-slate-300 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900" onSubmit={onSubmit}>
        <h2 id="category-dialog-title" className="text-lg font-semibold">{t('addCategory')}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('customCategoryHint')}</p>
        {feedback?.type === 'error' && <div className="notice notice-error mt-4 mb-0">{feedbackText}</div>}

        <div className="form-sheet mt-5">
          <FormFieldRow label={t('categoryName')} htmlFor="category-name">
            <input
              id="category-name"
              className="field form-row-field"
              type="text"
              maxLength="80"
              value={form.name}
              onChange={(event) => onFormChange({ name: event.target.value })}
              placeholder={t('categoryNamePlaceholder')}
              autoFocus
              required
            />
          </FormFieldRow>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="button-secondary" type="button" onClick={onClose}>{t('cancel')}</button>
          <button className="button-primary" type="submit">{t('addCategory')}</button>
        </div>
      </form>
    </div>
  );
}
