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
    investment: Object.freeze({
      listTargets: () => call('investment.listTargets'),
      getTarget: id => call('investment.getTarget', { id }),
      addTarget: payload => call('investment.addTarget', payload),
      updateTarget: (id, payload) =>
        call('investment.updateTarget', { ...payload, id }),
      deleteTarget: id => call('investment.deleteTarget', { id }),
      addTrade: payload => call('investment.addTrade', payload),
      updateTrade: (id, payload) =>
        call('investment.updateTrade', { ...payload, id }),
      deleteTrade: id => call('investment.deleteTrade', { id }),
    }),
    profile: Object.freeze({
      getProfile: () => call('profile.getProfile'),
      saveProfile: payload => call('profile.saveProfile', payload),
    }),
    backup: Object.freeze({
      exportData: password => call('backup.exportData', { password }),
      importData: payload => call('backup.importData', payload),
      writeBackupFile: (fileName, content) => {
        if (!bridge?.writeBackupFile)
          throw new ApiError(
            'NATIVE_UNAVAILABLE',
            'Native file export is not installed',
            503,
          );
        return bridge.writeBackupFile(fileName, content);
      },
      readBackupFile: uri => {
        if (!bridge?.readBackupFile)
          throw new ApiError(
            'NATIVE_UNAVAILABLE',
            'Native file import is not installed',
            503,
          );
        return bridge.readBackupFile(uri);
      },
    }),
  });
};
