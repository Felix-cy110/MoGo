import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDailyFinance } from '@mogo/finance-react';
import { api } from '../../services/api';
import { AlertDialog } from './components/AlertDialog';
import { BudgetOverview } from './components/BudgetOverview';
import { CategorySummary } from './components/CategorySummary';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';

export function FinanceScreen() {
  const { t } = useTranslation();
  const finance = useDailyFinance({ api });
  const feedbackText = finance.feedback
    ? finance.feedback.message || t(finance.feedback.key)
    : '';

  const updateForm = (patch) => finance.setForm((current) => ({ ...current, ...patch }));

  const handleSaveBudget = async (event) => {
    event.preventDefault();
    await finance.saveBudget();
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    await finance.addExpense();
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-end justify-between px-5 py-5 sm:px-8">
          <div>
            <h1 className="text-xl font-semibold">{t('appName')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('appSubtitle')}</p>
          </div>
          <time className="text-sm text-slate-500">{finance.date}</time>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
        {finance.feedback?.type === 'error' && <div className="notice notice-error">{feedbackText}</div>}
        {finance.feedback?.type === 'success' && <div className="notice notice-success">{feedbackText}</div>}

        <BudgetOverview
          t={t}
          dashboard={finance.dashboard}
          budgetInput={finance.budgetInput}
          onBudgetChange={finance.setBudgetInput}
          onSaveBudget={handleSaveBudget}
        />

        <section className="grid gap-8 py-7 lg:grid-cols-[320px_1fr]">
          <ExpenseForm
            t={t}
            categories={finance.categories}
            form={finance.form}
            selectedCategory={finance.selectedCategory}
            onFormChange={updateForm}
            onSubmit={handleAddExpense}
          />
          <ExpenseList t={t} expenses={finance.dashboard?.expenses} />
        </section>

        <CategorySummary t={t} categoryTotals={finance.dashboard?.categoryTotals} />
      </div>

      <AlertDialog t={t} alerts={finance.alerts} onDismiss={finance.dismissAlerts} />
    </main>
  );
}
