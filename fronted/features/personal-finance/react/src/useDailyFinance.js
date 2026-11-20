import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildExpensePayload,
  buildExpenseUpdatePayload,
  canEditExpenseForDay,
  centsToYuan,
  createClientRequestId,
  createDailyFinanceAccess,
  createExpenseDraft,
  findCategory,
  formatLocalDate,
  resolveApiErrorMessageKey,
  shiftLocalDate,
  sortCategoriesOtherLast,
  validateExpenseDraft,
  yuanToCents
} from '@mogo/personal-finance-core';

const EMPTY_FORM = Object.freeze({ amount: '', categoryId: '', note: '' });

export const useDailyFinance = ({ api, initialDate = formatLocalDate() }) => {
  const todayDate = initialDate;
  const yesterdayDate = useMemo(() => shiftLocalDate(todayDate, -1), [todayDate]);
  const [date, setDate] = useState(todayDate);
  const [categories, setCategories] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [alerts, setAlerts] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const access = useMemo(
    () => createDailyFinanceAccess({ selectedDate: date, todayDate }),
    [date, todayDate]
  );

  const selectedCategory = useMemo(
    () => findCategory(categories, form.categoryId),
    [categories, form.categoryId]
  );
  const selectedEditCategory = useMemo(
    () => findCategory(categories, editForm.categoryId),
    [categories, editForm.categoryId]
  );

  const refresh = useCallback(async () => {
    const [categoryData, dashboardData] = await Promise.all([
      api.getCategories(),
      api.getDashboard(date)
    ]);
    const orderedCategories = sortCategoriesOtherLast(categoryData);
    setCategories(orderedCategories);
    setDashboard({
      ...dashboardData,
      categoryTotals: sortCategoriesOtherLast(dashboardData.categoryTotals || [])
    });
    setBudgetInput(dashboardData.budgetSet ? centsToYuan(dashboardData.budgetAmountCents) : '');
    setForm((current) => ({
      ...current,
      categoryId: current.categoryId || String(orderedCategories[0]?.id || '')
    }));
  }, [api, date]);

  useEffect(() => {
    refresh().catch(() => setFeedback({ type: 'error', key: 'loadFailed' }));
  }, [refresh]);

  const saveBudget = useCallback(async () => {
    setFeedback(null);
    if (!access.canSaveBudget) {
      setFeedback({ type: 'error', key: 'yesterdayReadOnlyHint' });
      return false;
    }
    try {
      await api.saveBudget(date, yuanToCents(budgetInput));
      await refresh();
      setFeedback({ type: 'success', key: 'saved' });
      return true;
    } catch (error) {
      setFeedback({ type: 'error', key: resolveApiErrorMessageKey(error.code) });
      return false;
    }
  }, [access.canSaveBudget, api, budgetInput, date, refresh]);

  const addExpense = useCallback(async () => {
    setFeedback(null);
    const amountCents = yuanToCents(form.amount);
    const validationKey = validateExpenseDraft({
      budgetSet: dashboard?.budgetSet,
      budgetRequired: access.isToday,
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
  }, [access.isToday, api, dashboard?.budgetSet, date, form, refresh, selectedCategory]);

  const startEditingExpense = useCallback((expense) => {
    setFeedback(null);
    if (!canEditExpenseForDay({ expense, selectedDate: date, todayDate })) {
      setFeedback({ type: 'error', key: 'expenseEditForbidden', presentation: 'dialog' });
      return false;
    }
    setEditingExpenseId(expense.id);
    setEditForm(createExpenseDraft(expense));
    return true;
  }, [date, todayDate]);

  const cancelEditingExpense = useCallback(() => {
    setEditingExpenseId(null);
    setEditForm(EMPTY_FORM);
  }, []);

  const updateExpense = useCallback(async () => {
    setFeedback(null);
    const expense = dashboard?.expenses?.find((item) => item.id === editingExpenseId);
    if (!canEditExpenseForDay({ expense, selectedDate: date, todayDate })) {
      setFeedback({ type: 'error', key: 'expenseEditForbidden', presentation: 'dialog' });
      return false;
    }
    const amountCents = yuanToCents(editForm.amount);
    const validationKey = validateExpenseDraft({
      budgetSet: dashboard?.budgetSet,
      amountCents,
      category: selectedEditCategory,
      note: editForm.note
    });
    if (validationKey) {
      setFeedback({ type: 'error', key: validationKey });
      return false;
    }

    try {
      const response = await api.updateExpense(editingExpenseId, buildExpenseUpdatePayload({
        amountCents,
        categoryId: editForm.categoryId,
        note: editForm.note
      }));
      setAlerts(response.alerts || []);
      cancelEditingExpense();
      await refresh();
      setFeedback({ type: 'success', key: 'saved' });
      return true;
    } catch (error) {
      const forbidden = error.code === 'EXPENSE_EDIT_FORBIDDEN';
      if (forbidden) cancelEditingExpense();
      setFeedback({
        type: 'error',
        key: resolveApiErrorMessageKey(error.code),
        ...(forbidden ? { presentation: 'dialog' } : {})
      });
      return false;
    }
  }, [api, cancelEditingExpense, dashboard?.budgetSet, dashboard?.expenses, date, editForm, editingExpenseId, refresh, selectedEditCategory, todayDate]);


  const toggleDate = useCallback(() => {
    setDate((current) => current === todayDate ? yesterdayDate : todayDate);
    setDashboard(null);
    setBudgetInput('');
    setEditingExpenseId(null);
    setEditForm(EMPTY_FORM);
    setAlerts([]);
    setFeedback(null);
    setForm((current) => ({ ...current, amount: '', note: '' }));
  }, [todayDate, yesterdayDate]);

  return {
    date,
    access,
    toggleDate,
    categories,
    dashboard,
    budgetInput,
    setBudgetInput,
    form,
    setForm,
    selectedCategory,
    editingExpenseId,
    editForm,
    setEditForm,
    selectedEditCategory,
    alerts,
    dismissAlerts: () => setAlerts([]),
    feedback,
    dismissFeedback: () => setFeedback(null),
    refresh,
    saveBudget,
    addExpense,
    startEditingExpense,
    cancelEditingExpense,
    updateExpense
  };
};
