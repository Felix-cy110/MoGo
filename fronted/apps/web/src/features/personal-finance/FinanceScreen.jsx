import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDailyFinance } from '@mogo/personal-finance-react';
import { api } from '../../services/api';
import { AppControls } from '../../components/AppControls';
import { NoticeDialog } from '../../components/NoticeDialog';
import { AlertDialog } from './components/AlertDialog';
import { BudgetOverview } from './components/BudgetOverview';
import { CategorySummary } from './components/CategorySummary';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseEditDialog } from './components/ExpenseEditDialog';
import { ExpenseList } from './components/ExpenseList';

export function FinanceScreen({ onBack, onManageCategories, onOpenAnalytics, onOpenProfile, onOpenSettings }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const finance = useDailyFinance({ api });
  const feedbackText = finance.feedback ? t(finance.feedback.key) : '';
  const dialogFeedback = finance.feedback?.presentation === 'dialog';

  useEffect(() => {
    document.title = `${t('appName')} ${t('appSubtitle')}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('metaDescription'));
  }, [language, t]);

  const updateForm = (patch) => finance.setForm((current) => ({ ...current, ...patch }));

  const handleSaveBudget = async (event) => {
    event.preventDefault();
    await finance.saveBudget();
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    await finance.addExpense();
  };

  const handleUpdateExpense = async (event) => {
    event.preventDefault();
    await finance.updateExpense();
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-5 py-2 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="back-button" type="button" onClick={onBack} aria-label={t('backToToolbox')}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">{t('financeFeatureName')}</h1>
            </div>
          </div>
          <AppControls onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings} />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
        {finance.feedback?.type === 'error' && !dialogFeedback && <div className="notice notice-error">{feedbackText}</div>}
        {finance.feedback?.type === 'success' && <div className="notice notice-success">{feedbackText}</div>}

        <BudgetOverview
          t={t}
          language={language}
          dashboard={finance.dashboard}
          budgetInput={finance.budgetInput}
          onBudgetChange={finance.setBudgetInput}
          onSaveBudget={handleSaveBudget}
          onOpenAnalytics={onOpenAnalytics}
          isToday={finance.access.isToday}
          canEditBudget={finance.access.canSaveBudget}
          onToggleDate={finance.toggleDate}
        />

        <section className="grid gap-8 py-7 lg:grid-cols-[320px_1fr]">
          <ExpenseForm
            t={t}
            categories={finance.categories}
            form={finance.form}
            selectedCategory={finance.selectedCategory}
            onFormChange={updateForm}
            onManageCategories={onManageCategories}
            canManageCategories={finance.access.canManageCategories}
            onSubmit={handleAddExpense}
          />
          <ExpenseList
            t={t}
            language={language}
            expenses={finance.dashboard?.expenses}
            onEdit={finance.startEditingExpense}
            isToday={finance.access.isToday}
          />
        </section>

        <CategorySummary t={t} language={language} categoryTotals={finance.dashboard?.categoryTotals} />
      </div>

      <ExpenseEditDialog
        t={t}
        open={finance.editingExpenseId !== null}
        categories={finance.categories}
        form={finance.editForm}
        selectedCategory={finance.selectedEditCategory}
        onFormChange={(patch) => finance.setEditForm((current) => ({ ...current, ...patch }))}
        feedback={finance.feedback}
        feedbackText={feedbackText}
        onClose={finance.cancelEditingExpense}
        onSubmit={handleUpdateExpense}
      />
      <AlertDialog t={t} alerts={finance.alerts} isToday={finance.access.isToday} onDismiss={finance.dismissAlerts} />
      <NoticeDialog
        title={dialogFeedback ? feedbackText : null}
        confirmLabel={t('confirm')}
        titleId="finance-notice-title"
        onDismiss={finance.dismissFeedback}
      />
    </main>
  );
}
