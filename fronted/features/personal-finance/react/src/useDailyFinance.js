import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildCategoryPayload,
  buildExpensePayload,
  centsToYuan,
  createClientRequestId,
  findCategory,
  formatLocalDate,
  resolveApiErrorMessageKey,
  validateCategoryDraft,
  validateExpenseDraft,
  yuanToCents
} from '@mogo/personal-finance-core';

const EMPTY_FORM = Object.freeze({ amount: '', categoryId: '', note: '' });
const EMPTY_CATEGORY_FORM = Object.freeze({ name: '' });

export const useDailyFinance = ({ api, initialDate = formatLocalDate() }) => {
  const [date] = useState(initialDate);
  const [categories, setCategories] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [alerts, setAlerts] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const selectedCategory = useMemo(
    () => findCategory(categories, form.categoryId),
    [categories, form.categoryId]
  );

  const refresh = useCallback(async () => {
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
  }, [api, date]);

  useEffect(() => {
    refresh().catch(() => setFeedback({ type: 'error', key: 'loadFailed' }));
  }, [refresh]);

  const saveBudget = useCallback(async () => {
    setFeedback(null);
    try {
      await api.saveBudget(date, yuanToCents(budgetInput));
      await refresh();
      setFeedback({ type: 'success', key: 'saved' });
      return true;
    } catch (error) {
      setFeedback({ type: 'error', key: resolveApiErrorMessageKey(error.code) });
      return false;
    }
  }, [api, budgetInput, date, refresh]);

  const addCategory = useCallback(async () => {
    setFeedback(null);
    const validationKey = validateCategoryDraft(categoryForm);
    if (validationKey) {
      setFeedback({ type: 'error', key: validationKey });
      return false;
    }

    try {
      const category = await api.addCategory(buildCategoryPayload(categoryForm));
      setCategoryForm(EMPTY_CATEGORY_FORM);
      await refresh();
      setForm((current) => ({ ...current, categoryId: String(category.id) }));
      setFeedback({ type: 'success', key: 'saved' });
      return true;
    } catch (error) {
      setFeedback({ type: 'error', key: resolveApiErrorMessageKey(error.code) });
      return false;
    }
  }, [api, categoryForm, refresh]);

  const addExpense = useCallback(async () => {
    setFeedback(null);
    const amountCents = yuanToCents(form.amount);
    const validationKey = validateExpenseDraft({
      budgetSet: dashboard?.budgetSet,
      amountCents,
      category: selectedCategory,
      note: form.note
    });
    if (validationKey) {
      setFeedback({ type: 'error', key: validationKey });
      return false;
    }

    try {
      const response = await api.addExpense(buildExpensePayload({
        date,
        amountCents,
        categoryId: form.categoryId,
        note: form.note,
        clientRequestId: createClientRequestId()
      }));
      setForm((current) => ({ ...current, amount: '', note: '' }));
      setAlerts(response.alerts || []);
      await refresh();
      return true;
    } catch (error) {
      setFeedback({ type: 'error', key: resolveApiErrorMessageKey(error.code) });
      return false;
    }
  }, [api, dashboard?.budgetSet, date, form, refresh, selectedCategory]);

  return {
    date,
    categories,
    dashboard,
    budgetInput,
    setBudgetInput,
    form,
    setForm,
    categoryForm,
    setCategoryForm,
    selectedCategory,
    alerts,
    dismissAlerts: () => setAlerts([]),
    feedback,
    saveBudget,
    addCategory,
    addExpense
  };
};
