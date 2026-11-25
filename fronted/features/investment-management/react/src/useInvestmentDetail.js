import { useCallback } from 'react';
import { targetPayload, tradePayload, validateTargetDraft, validateTradeDraft } from '@mogo/investment-management-core';
import { useInvestmentResource } from './useInvestmentResource.js';
export const useInvestmentDetail = ({ api, targetId }) => {
  const load = useCallback(() => api.getTarget(targetId), [api, targetId]);
  const resource = useInvestmentResource(load);
  const saveTarget = draft => {
    const error = validateTargetDraft(draft);
    if (error) { resource.notify(error); return Promise.resolve(false); }
    return resource.mutate(() => api.updateTarget(targetId, targetPayload(draft)));
  };
  const saveTrade = (draft, id) => {
    const error = validateTradeDraft(draft);
    if (error) { resource.notify(error); return Promise.resolve(false); }
    const payload = tradePayload(draft, targetId);
    return resource.mutate(() => id ? api.updateTrade(id, payload) : api.addTrade(payload));
  };
  return { ...resource, saveTarget, saveTrade,
    deleteTrade: id => resource.mutate(() => api.deleteTrade(id), 'investmentDeleted') };
};
