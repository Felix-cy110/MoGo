import React from 'react';
import { formatMoney, formatTime, resolveCategoryMessageKey } from '@mogo/finance-core';

export function ExpenseList({ t, language, expenses = [] }) {
  return (
    <div className="min-w-0">
      <h2 className="section-title">{t('recentExpenses')}</h2>
      <div className="mt-3 border-t border-slate-200">
        {expenses.length ? expenses.map((expense) => {
          const categoryKey = resolveCategoryMessageKey({ code: expense.categoryCode });
          return (
            <div className="grid grid-cols-[90px_1fr_auto] items-center gap-3 border-b border-slate-100 py-3 text-sm" key={expense.id}>
              <span className="text-slate-600">{categoryKey ? t(categoryKey) : expense.categoryName}</span>
              <span className="min-w-0 truncate text-slate-500">
                {expense.note || t('noNote')} · {formatTime(expense.occurredAt, language)}
              </span>
              <span className="font-medium tabular-nums">{formatMoney(expense.amountCents, language)}</span>
            </div>
          );
        }) : <p className="border-b border-slate-100 py-8 text-center text-sm text-slate-400">{t('noExpenses')}</p>}
      </div>
    </div>
  );
}
