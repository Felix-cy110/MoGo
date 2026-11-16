import React from 'react';
import { formatMoney, resolveCategoryMessageKey } from '@mogo/finance-core';

export function CategorySummary({ t, language, categoryTotals = [] }) {
  return (
    <section className="border-t border-slate-200 pt-7">
      <h2 className="section-title">{t('categorySummary')}</h2>
      {categoryTotals.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 font-medium">{t('category')}</th>
                <th className="py-2 text-right font-medium">{t('count')}</th>
                <th className="py-2 text-right font-medium">{t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {categoryTotals.map((item) => {
                const categoryKey = resolveCategoryMessageKey({ code: item.categoryCode });
                return (
                  <tr className="border-b border-slate-100" key={item.categoryId}>
                    <td className="py-3">{categoryKey ? t(categoryKey) : item.categoryName}</td>
                    <td className="py-3 text-right text-slate-500">{item.expenseCount}</td>
                    <td className="py-3 text-right font-medium tabular-nums">{formatMoney(item.amountCents, language)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="mt-3 text-sm text-slate-400">{t('noCategoryData')}</p>}
    </section>
  );
}
