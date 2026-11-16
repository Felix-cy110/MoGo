export class FinanceApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'FinanceApiError';
    this.code = code;
    this.status = status;
  }
}

const joinUrl = (baseUrl, path) => `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

export const createFinanceApi = ({ baseUrl = '', fetchImpl = globalThis.fetch } = {}) => {
  if (!fetchImpl) throw new Error('fetchImpl is required');

  const request = async (path, options = {}) => {
    const response = await fetchImpl(joinUrl(baseUrl, path), {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new FinanceApiError(body.code || 'REQUEST_FAILED', body.message || '请求失败', response.status);
    }
    return response.json();
  };

  return Object.freeze({
    getCategories: () => request('/categories'),
    getDashboard: (date) => request(`/dashboard?date=${encodeURIComponent(date)}`),
    saveBudget: (date, amountCents) => request('/budgets/daily', {
      method: 'PUT',
      body: JSON.stringify({ date, amountCents })
    }),
    addExpense: (payload) => request('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  });
};
