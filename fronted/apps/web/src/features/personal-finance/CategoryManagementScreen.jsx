import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveCategoryMessageKey } from '@mogo/personal-finance-core';
import { useCategoryManagement } from '@mogo/personal-finance-react';
import { AppControls } from '../../components/AppControls';
import { api } from '../../services/api';
import { FormFieldRow } from '../../components/FormFieldRow';
import { NoticeDialog } from '../../components/NoticeDialog';

function BackButton({ label, onClick }) {
  return (
    <button className="back-button" type="button" onClick={onClick} aria-label={label}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function CategoryManagementScreen({ onBack }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const management = useCategoryManagement({ api });
  const feedbackText = management.feedback ? t(management.feedback.key) : '';
  const dialogFeedback = management.feedback?.presentation === 'dialog';

  useEffect(() => {
    document.title = `${t('manageCategories')} · ${t('appName')}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('categoryManagementDescription'));
  }, [language, t]);

  const handleAdd = async (event) => {
    event.preventDefault();
    await management.addCategory();
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    await management.updateCategory();
  };

  const handleDelete = async (category, displayName) => {
    if (!management.checkCategoryMutable(category, 'delete')) return;
    if (globalThis.confirm?.(t('confirmDeleteCategory', { name: displayName }))) {
      await management.deleteCategory(category.id);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-5 py-2 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <BackButton label={t('financeFeatureName')} onClick={onBack} />
            <h1 className="truncate text-xl font-semibold">{t('manageCategories')}</h1>
          </div>
          <AppControls />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-7 sm:px-8">
        <p className="section-label">{t('categoryManagementDescription')}</p>
        {management.feedback?.type === 'error' && !dialogFeedback && <div className="notice notice-error mt-5">{feedbackText}</div>}
        {management.feedback?.type === 'success' && <div className="notice notice-success mt-5">{feedbackText}</div>}

        <form className="mt-6" onSubmit={handleAdd}>
          <h2 className="section-title">{t('addCategory')}</h2>
          <div className="form-sheet mt-3">
            <FormFieldRow label={t('categoryName')} htmlFor="new-category-name">
              <div className="flex min-w-0 items-center gap-3">
                <input
                  id="new-category-name"
                  className="field form-row-field min-w-0 flex-1"
                  type="text"
                  maxLength="80"
                  value={management.form.name}
                  onChange={(event) => management.setForm({ name: event.target.value })}
                  placeholder={t('categoryNamePlaceholder')}
                  required
                />
                <button className="form-row-submit" type="submit">{t('addCategory')}</button>
              </div>
            </FormFieldRow>
          </div>
        </form>

        <section className="mt-8">
          <div>
            <label className="block w-full">
              <span className="sr-only">{t('categorySearch')}</span>
              <input
                className="field"
                type="search"
                value={management.query}
                onChange={(event) => management.setQuery(event.target.value)}
                placeholder={t('categorySearchPlaceholder')}
              />
            </label>
          </div>

          <div className="category-list mt-3">
            {management.loading && <p className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">{t('loadingCategories')}</p>}
            {!management.loading && management.categories.length === 0 && (
              <p className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">{t('noCategoriesFound')}</p>
            )}
            {!management.loading && management.categories.map((category) => {
              const messageKey = resolveCategoryMessageKey(category);
              const displayName = messageKey ? t(messageKey) : category.name;
              return (
                <div className="category-row" key={category.id}>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{displayName}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t(category.active ? 'categoryActive' : 'categoryDeletedStatus')}
                    </p>
                  </div>
                  {category.active && (
                    <div className="flex items-center gap-3 text-sm">
                      <button className="category-action" type="button" onClick={() => management.startEditing(category)}>
                        {t('editCategory')}
                      </button>
                      <button className="category-action category-action-danger" type="button" onClick={() => handleDelete(category, displayName)}>
                        {t('deleteCategory')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <NoticeDialog
        title={dialogFeedback ? feedbackText : null}
        confirmLabel={t('confirm')}
        titleId="category-notice-title"
        onDismiss={management.dismissFeedback}
      />

      {management.editingCategory && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-5" role="dialog" aria-modal="true" aria-labelledby="edit-category-title">
          <form className="w-full max-w-sm border border-slate-300 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900" onSubmit={handleUpdate}>
            <h2 id="edit-category-title" className="text-lg font-semibold">{t('editCategory')}</h2>
            <div className="form-sheet mt-5">
              <FormFieldRow label={t('categoryName')} htmlFor="edit-category-name">
                <input
                  id="edit-category-name"
                  className="field form-row-field"
                  type="text"
                  maxLength="80"
                  value={management.editForm.name}
                  onChange={(event) => management.setEditForm({ name: event.target.value })}
                  autoFocus
                  required
                />
              </FormFieldRow>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="button-secondary" type="button" onClick={management.cancelEditing}>{t('cancel')}</button>
              <button className="button-primary" type="submit">{t('saveCategory')}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
