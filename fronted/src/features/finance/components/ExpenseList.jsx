import React from 'react';
import { centsToYuan } from '@mogo/finance-core';

export function ExpenseList({ t, expenses = [] }) {
  return (
    <div className="min-w-0">
      <h2 className="section-title">{t('recentExpenses')}</h2>
      <div className="mt-3 border-t border-slate-200">
        {expenses.length ? expenses.map((expense) => (
          <div className="grid grid-cols-[90px_1fr_auto] items-center gap-3 border-b border-slate-100 py-3 text-sm" key={expense.id}>
            <span className="text-slate-600">{expense.categoryName}</span>
            <span className="min-w-0 truncate text-slate-500">
              {expense.note || '无备注'} · {new Date(expense.occurredAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="font-medium tabular-nums">¥{centsToYuan(expense.amountCents)}</span>
          </div>
        )) : <p className="border-b border-slate-100 py-8 text-center text-sm text-slate-400">{t('noExpenses')}</p>}
      </div>
    </div>
  );
}
