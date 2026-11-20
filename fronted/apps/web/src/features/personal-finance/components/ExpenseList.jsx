import React from 'react';
import { formatMoney, formatTime, resolveCategoryMessageKey } from '@mogo/personal-finance-core';

const ExpenseRowContent = ({ t, language, expense }) => {
  const categoryKey = resolveCategoryMessageKey({ code: expense.categoryCode });
  return (
    <>
      <span className="text-slate-600 dark:text-slate-300">{categoryKey ? t(categoryKey) : expense.categoryName}</span>
      <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">
        {expense.note || t('noNote')} · {formatTime(expense.occurredAt, language)}
      </span>
      <span className="font-medium tabular-nums">{formatMoney(expense.amountCents, language)}</span>
    </>
  );
};

export function ExpenseList({ t, language, expenses = [], onEdit, editable, isToday }) {
  return (
    <div className="min-w-0">
      <h2 className="section-title">{t(isToday ? 'recentExpenses' : 'yesterdayExpenses')}</h2>
      <div className="mt-3 border-t border-slate-200 dark:border-slate-800">
        {expenses.length ? expenses.map((expense) => editable ? (
          <button className="expense-row" type="button" onClick={() => onEdit(expense)} key={expense.id}>
            <ExpenseRowContent t={t} language={language} expense={expense} />
          </button>
        ) : (
          <div className="expense-row expense-row-static" key={expense.id}>
            <ExpenseRowContent t={t} language={language} expense={expense} />
          </div>
        )) : (
          <p className="border-b border-slate-100 py-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
            {t(isToday ? 'noExpenses' : 'noYesterdayExpenses')}
          </p>
        )}
      </div>
    </div>
  );
}
