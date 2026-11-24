import { createJsonRequest } from '@mogo/core-shared';
export const createInvestmentApi = (options = {}) => {
  const request = createJsonRequest(options);
  const send = (path, method, value) => request(`/investment/${path}`, { method, body: JSON.stringify(value) });
  return Object.freeze({
    listTargets: (archived = false) => request(`/investment/targets?archived=${archived}`),
    getTarget: id => request(`/investment/targets/${id}`),
    addTarget: value => send('targets', 'POST', value),
    updateTarget: (id, value) => send(`targets/${id}`, 'PUT', value),
    archiveTarget: (id, archived) => send(`targets/${id}/archive`, 'PUT', { archived }),
    addTrade: value => send('trades', 'POST', value),
    updateTrade: (id, value) => send(`trades/${id}`, 'PUT', value),
    deleteTrade: id => request(`/investment/trades/${id}`, { method: 'DELETE' })
  });
};
