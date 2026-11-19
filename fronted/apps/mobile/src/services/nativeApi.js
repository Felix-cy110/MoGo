import { ApiError } from '@mogo/core-shared';

// Exposes the same service contract consumed by the Web Hooks, without HTTP.
export const createNativeApis = bridge => {
  const call = async (method, payload = {}) => {
    if (!bridge)
      throw new ApiError(
        'NATIVE_UNAVAILABLE',
        'Native module is not installed',
        503,
      );
    const response = JSON.parse(
      await bridge.execute(method, JSON.stringify(payload)),
    );
    if (!response.ok)
      throw new ApiError(response.code, response.code, response.status);
    return response.data;
  };
  return Object.freeze({
    capabilities: () => call('capabilities'),
    finance: Object.freeze({
      getCategories: () => call('finance.getCategories'),
      searchCategories: (query = '') =>
        call('finance.searchCategories', { query }),
      addCategory: payload => call('finance.addCategory', payload),
      updateCategory: (id, payload) =>
        call('finance.updateCategory', { ...payload, id }),
      deleteCategory: id => call('finance.deleteCategory', { id }),
      getDashboard: date => call('finance.getDashboard', { date }),
      getAnalytics: (startDate, endDate) =>
        call('finance.getAnalytics', { startDate, endDate }),
      saveBudget: (date, amountCents) =>
        call('finance.saveBudget', { date, amountCents }),
      addExpense: payload => call('finance.addExpense', payload),
      updateExpense: (id, payload) =>
        call('finance.updateExpense', { ...payload, id }),
    }),
    profile: Object.freeze({
      getProfile: () => call('profile.getProfile'),
      saveProfile: payload => call('profile.saveProfile', payload),
    }),
  });
};
