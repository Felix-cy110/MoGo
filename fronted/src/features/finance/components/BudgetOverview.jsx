import React from 'react';
import { centsToYuan, clampPercent } from '@mogo/finance-core';

export function BudgetOverview({ t, dashboard, budgetInput, onBudgetChange, onSaveBudget }) {
  const progress = clampPercent(dashboard?.usagePercent);
  const progressClass = progress >= 100 ? 'bg-red-600' : progress >= 80 ? 'bg-amber-500' : 'bg-slate-700';

  return (
    <section className="border-b border-slate-200 pb-7">
      <div className="grid gap-6 md:grid-cols-[1fr_300px] md:items-end">
        <div>
          <p className="section-label">{t('today')}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-3xl font-semibold">¥{centsToYuan(dashboard?.totalAmountCents)}</p>
            <p className="text-sm text-slate-500">
              {t('budget')} ¥{centsToYuan(dashboard?.budgetAmountCents)} · {t('remaining')} ¥{centsToYuan(dashboard?.remainingAmountCents)}
            </p>
          </div>
          <div className="mt-4 h-2 max-w-2xl overflow-hidden bg-slate-100">
            <div className={`h-full ${progressClass}`} style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500">{t('usage')}：{dashboard?.usagePercent || 0}%</p>
        </div>

        <form onSubmit={onSaveBudget}>
          <label className="form-label" htmlFor="budget">{t('budget')}（元）</label>
          <div className="mt-2 flex gap-2">
            <input
              id="budget"
              className="field"
              type="number"
              min="0.01"
              step="0.01"
              value={budgetInput}
              onChange={(event) => onBudgetChange(event.target.value)}
              placeholder={t('budgetPlaceholder')}
              required
            />
            <button className="button-primary shrink-0" type="submit">{t('saveBudget')}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
