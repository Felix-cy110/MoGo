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
    setForm((current) => ({ ...current, categoryId: current.categoryId || String(categoryData[0]?.id || '') }));
  };

  useEffect(() => {
    refresh().catch((reason) => setError(reason.message || t('loadFailed')));
  }, []);

  const saveBudget = async (event) => {
    event.preventDefault();
    setError('');
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
  return (
    <main className="min-h-screen bg-[#f4f7f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">{t('appName')}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t('appSubtitle')}</h1>
          </div>
          <time className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">{date}</time>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {toast && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{toast}</div>}

        <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-2xl bg-slate-950 p-7 text-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">{t('today')}</p>
                <p className="mt-3 text-5xl font-semibold tracking-tight">¥{centsToYuan(dashboard?.totalAmountCents)}</p>
                <p className="mt-2 text-sm text-slate-400">{t('spent')}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2 text-right">
                <p className="text-xs text-slate-400">{t('usage')}</p>
                <p className="mt-1 text-xl font-semibold">{dashboard?.usagePercent || 0}%</p>
              </div>
            </div>
            <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-rose-400' : progress >= 80 ? 'bg-amber-300' : 'bg-emerald-400'}`} style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex justify-between text-sm text-slate-400">
              <span>{t('budget')} ¥{centsToYuan(dashboard?.budgetAmountCents)}</span>
              <span>{t('remaining')} ¥{centsToYuan(dashboard?.remainingAmountCents)}</span>
            </div>
          </div>

          <form onSubmit={saveBudget} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{t('budget')}</p>
            <h2 className="mt-2 text-xl font-semibold">设置今天的上限</h2>
            <label className="mt-6 block text-sm font-medium text-slate-600" htmlFor="budget">金额（元）</label>
            <input id="budget" className="field mt-2 text-2xl" type="number" min="0.01" step="0.01" value={budgetInput} onChange={(event) => setBudgetInput(event.target.value)} placeholder={t('budgetPlaceholder')} required />
            <button className="button-primary mt-4 w-full" type="submit">{t('saveBudget')}</button>
          </form>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <form onSubmit={addExpense} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('addExpense')}</h2>
              <span className="text-xs font-medium text-slate-400">{t('today')}</span>
            </div>
            <label className="mt-6 block text-sm font-medium text-slate-600" htmlFor="amount">{t('amount')}</label>
            <input id="amount" className="field mt-2" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder={t('amountPlaceholder')} required />
            <label className="mt-4 block text-sm font-medium text-slate-600" htmlFor="category">{t('category')}</label>
            <select id="category" className="field mt-2" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <label className="mt-4 block text-sm font-medium text-slate-600" htmlFor="note">{t('note')}{selectedCategory?.notePolicy === 'REQUIRED' ? '（必填）' : ''}</label>
            <textarea id="note" className="field mt-2 min-h-24 resize-y" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder={t('notePlaceholder')} />
            <button className="button-primary mt-5 w-full" type="submit">{t('submit')}</button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{t('recentExpenses')}</h2>
            <div className="mt-5 divide-y divide-slate-100">
              {dashboard?.expenses?.length ? dashboard.expenses.map((expense) => (
                <div className="flex items-center justify-between gap-4 py-4" key={expense.id}>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{expense.categoryName}</p>
                    <p className="mt-1 truncate text-sm text-slate-400">{expense.note || '无备注'} · {new Date(expense.occurredAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-slate-900">¥{centsToYuan(expense.amountCents)}</p>
                </div>
              )) : <p className="py-10 text-center text-sm text-slate-400">{t('noExpenses')}</p>}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{t('categorySummary')}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dashboard?.categoryTotals?.map((item) => (
              <div className="rounded-xl bg-slate-50 p-4" key={item.categoryId}>
                <p className="text-sm text-slate-500">{item.categoryName}</p>
                <p className="mt-2 text-2xl font-semibold">¥{centsToYuan(item.amountCents)}</p>
                <p className="mt-1 text-xs text-slate-400">{item.expenseCount} 笔</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {alerts.length > 0 && <div className="fixed inset-0 z-10 grid place-items-center bg-slate-950/35 p-6" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-xl">!</span><h2 className="text-xl font-semibold">{t('warning')}</h2></div>
          <div className="mt-5 space-y-3">{alerts.map((alert) => <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900" key={alert.code}>{alert.thresholdPercent >= 100 ? t('alertExceeded') : t('alertWarning')}</p>)}</div>
          <button className="button-secondary mt-6 w-full" onClick={() => setAlerts([])} type="button">知道了</button>
        </div>
      </div>}
    </main>
  );
}

export default App;
