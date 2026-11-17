import { createJsonRequest } from '@mogo/core-shared';
export { ApiError as FinanceApiError } from '@mogo/core-shared';

export const createFinanceApi = ({ baseUrl = '', fetchImpl = globalThis.fetch } = {}) => {
  const request = createJsonRequest({ baseUrl, fetchImpl });

  return Object.freeze({
    getCategories: () => request('/categories'),
    searchCategories: (query = '') => request(`/categories/manage?query=${encodeURIComponent(query)}`),
    addCategory: (payload) => request('/categories', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    updateCategory: (categoryId, payload) => request(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
    deleteCategory: (categoryId) => request(`/categories/${categoryId}`, {
      method: 'DELETE'
    }),
    getDashboard: (date) => request(`/dashboard?date=${encodeURIComponent(date)}`),
    getAnalytics: (startDate, endDate) => request(
      `/analytics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    ),
    saveBudget: (date, amountCents) => request('/budgets/daily', {
      method: 'PUT',
      body: JSON.stringify({ date, amountCents })
    }),
    addExpense: (payload) => request('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    updateExpense: (expenseId, payload) => request(`/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  });
};
