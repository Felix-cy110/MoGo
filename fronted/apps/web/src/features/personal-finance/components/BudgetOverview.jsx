import React from 'react';
import { clampPercent, formatMoney } from '@mogo/personal-finance-core';
import { FormFieldRow } from '../../../components/FormFieldRow';

export function BudgetOverview({
  t,
  language,
  dashboard,
  budgetInput,
  onBudgetChange,
  onSaveBudget,
  onOpenAnalytics,
  isToday,
  canEditBudget,
  onToggleDate
}) {
  const progress = clampPercent(dashboard?.usagePercent);
  const progressClass = progress >= 100 ? 'bg-red-600' : progress >= 80 ? 'bg-amber-500' : 'bg-slate-700 dark:bg-slate-300';

  return (
    <section className="border-b border-slate-200 pb-7 dark:border-slate-800">
      <div className={`grid gap-6 ${canEditBudget ? 'md:grid-cols-[1fr_360px] md:items-end' : ''}`}>
        <div>
          <div className="flex items-center justify-between gap-4">
            <button
              className="section-label inline-flex items-center gap-1.5 rounded-sm text-left hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:hover:text-slate-100"
              type="button"
              onClick={onToggleDate}
              aria-label={t(isToday ? 'toggleToYesterday' : 'toggleToToday')}
            >
              <span>{t(isToday ? 'today' : 'yesterday')}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="analytics-link" type="button" onClick={onOpenAnalytics}>
              <span>{t('expenseAnalysis')}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none">
                <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-3xl font-semibold">{formatMoney(dashboard?.totalAmountCents, language)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('budget')} {formatMoney(dashboard?.budgetAmountCents, language)} · {t('remaining')} {formatMoney(dashboard?.remainingAmountCents, language)}
            </p>
          </div>
          <div className="mt-4 h-2 max-w-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
            <div className={`h-full ${progressClass}`} style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('usage')}: {dashboard?.usagePercent || 0}%</p>
          {!isToday && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('yesterdayReadOnlyHint')}</p>}
        </div>

        {canEditBudget && (
          <form onSubmit={onSaveBudget}>
            <div className="form-sheet">
              <FormFieldRow label={t('budgetWithCurrency')} htmlFor="budget">
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    id="budget"
                    className="field form-row-field min-w-0 flex-1"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={budgetInput}
                    onChange={(event) => onBudgetChange(event.target.value)}
                    placeholder={t('budgetPlaceholder')}
                    required
                  />
                  <button className="form-row-submit" type="submit">{t('saveBudget')}</button>
                </div>
              </FormFieldRow>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
