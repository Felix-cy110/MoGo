const request = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || '请求失败');
  }
  return response.json();
};

export const api = {
  getCategories: () => request('/api/categories'),
  getDashboard: (date) => request(`/api/dashboard?date=${date}`),
  saveBudget: (date, amountCents) => request('/api/budgets/daily', {
    method: 'PUT',
    body: JSON.stringify({ date, amountCents })
  }),
  addExpense: (payload) => request('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
};
