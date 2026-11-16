import React from 'react';
import { centsToYuan } from '@mogo/finance-core';

export function CategorySummary({ t, categoryTotals = [] }) {
  return (
    <section className="border-t border-slate-200 pt-7">
      <h2 className="section-title">{t('categorySummary')}</h2>
      {categoryTotals.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 font-medium">{t('category')}</th>
                <th className="py-2 text-right font-medium">笔数</th>
                <th className="py-2 text-right font-medium">金额</th>
              </tr>
            </thead>
            <tbody>
              {categoryTotals.map((item) => (
                <tr className="border-b border-slate-100" key={item.categoryId}>
                  <td className="py-3">{item.categoryName}</td>
                  <td className="py-3 text-right text-slate-500">{item.expenseCount}</td>
                  <td className="py-3 text-right font-medium tabular-nums">¥{centsToYuan(item.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="mt-3 text-sm text-slate-400">暂无分类数据</p>}
    </section>
  );
}
