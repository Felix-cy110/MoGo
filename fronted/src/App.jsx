import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from './services/api';

const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const yuanToCents = (value) => Math.round(Number(value || 0) * 100);
const centsToYuan = (value) => (Number(value || 0) / 100).toFixed(2);

function App() {
  const { t } = useTranslation();
  const [date] = useState(today());
  const [categories, setCategories] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [form, setForm] = useState({ amount: '', categoryId: '', note: '' });
  const [alerts, setAlerts] = useState([]);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item.id) === String(form.categoryId)),
    [categories, form.categoryId]
  );

  const refresh = async () => {
    const [categoryData, dashboardData] = await Promise.all([
      api.getCategories(),
      api.getDashboard(date)
    ]);
    setCategories(categoryData);
    setDashboard(dashboardData);
    setBudgetInput(dashboardData.budgetSet ? centsToYuan(dashboardData.budgetAmountCents) : '');
    setForm((current) => ({
      ...current,
      categoryId: current.categoryId || String(categoryData[0]?.id || '')
    }));
  };

  useEffect(() => {
    refresh().catch((reason) => setError(reason.message || t('loadFailed')));
  }, []);

  const saveBudget = async (event) => {
    event.preventDefault();
    setError('');
    setToast('');
    try {
      await api.saveBudget(date, yuanToCents(budgetInput));
      await refresh();
      setToast(t('saved'));
    } catch (reason) {
      setError(reason.message || t('saveFailed'));
    }
  };

  const addExpense = async (event) => {
    event.preventDefault();
    setError('');
    setToast('');
    if (!dashboard?.budgetSet) {
      setError(t('budgetMissing'));
      return;
    }
    if (selectedCategory?.notePolicy === 'REQUIRED' && !form.note.trim()) {
      setError(t('noteRequired'));
      return;
    }
    try {
      const response = await api.addExpense({
        date,
        amountCents: yuanToCents(form.amount),
        categoryId: Number(form.categoryId),
        note: form.note.trim() || null,
        clientRequestId: crypto.randomUUID()
      });
      setForm((current) => ({ ...current, amount: '', note: '' }));
      setAlerts(response.alerts || []);
      await refresh();
    } catch (reason) {
      setError(reason.message || t('saveFailed'));
    }
  };

  const progress = Math.min(dashboard?.usagePercent || 0, 100);
  const progressClass = progress >= 100 ? 'bg-red-600' : progress >= 80 ? 'bg-amber-500' : 'bg-slate-700';

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-end justify-between px-5 py-5 sm:px-8">
          <div>
            <h1 className="text-xl font-semibold">{t('appName')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('appSubtitle')}</p>
          </div>
          <time className="text-sm text-slate-500">{date}</time>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
        {error && <div className="notice notice-error">{error}</div>}
        {toast && <div className="notice notice-success">{toast}</div>}

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

            <form onSubmit={saveBudget}>
              <label className="form-label" htmlFor="budget">{t('budget')}（元）</label>
              <div className="mt-2 flex gap-2">
                <input
                  id="budget"
                  className="field"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={budgetInput}
                  onChange={(event) => setBudgetInput(event.target.value)}
                  placeholder={t('budgetPlaceholder')}
                  required
                />
                <button className="button-primary shrink-0" type="submit">{t('saveBudget')}</button>
              </div>
            </form>
          </div>
        </section>

        <section className="grid gap-8 py-7 lg:grid-cols-[320px_1fr]">
          <form onSubmit={addExpense}>
            <h2 className="section-title">{t('addExpense')}</h2>

            <label className="form-label mt-5" htmlFor="amount">{t('amount')}（元）</label>
            <input
              id="amount"
              className="field mt-2"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              placeholder={t('amountPlaceholder')}
              required
            />

            <label className="form-label mt-4" htmlFor="category">{t('category')}</label>
            <select
              id="category"
              className="field mt-2"
              value={form.categoryId}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <label className="form-label mt-4" htmlFor="note">
              {t('note')}{selectedCategory?.notePolicy === 'REQUIRED' ? '（必填）' : '（选填）'}
            </label>
            <textarea
              id="note"
              className="field mt-2 min-h-20 resize-y"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              placeholder={t('notePlaceholder')}
            />

            <button className="button-primary mt-5 w-full" type="submit">{t('submit')}</button>
          </form>

          <div className="min-w-0">
            <h2 className="section-title">{t('recentExpenses')}</h2>
            <div className="mt-3 border-t border-slate-200">
              {dashboard?.expenses?.length ? dashboard.expenses.map((expense) => (
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
        </section>

        <section className="border-t border-slate-200 pt-7">
          <h2 className="section-title">{t('categorySummary')}</h2>
          {dashboard?.categoryTotals?.length ? (
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
                  {dashboard.categoryTotals.map((item) => (
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
      </div>

      {alerts.length > 0 && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-black/30 p-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm border border-slate-300 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{t('warning')}</h2>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              {alerts.map((alert) => (
                <p key={alert.code}>{alert.thresholdPercent >= 100 ? t('alertExceeded') : t('alertWarning')}</p>
              ))}
            </div>
            <button className="button-secondary mt-5 w-full" onClick={() => setAlerts([])} type="button">知道了</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
