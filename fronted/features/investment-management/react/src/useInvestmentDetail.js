import { useCallback } from 'react';
import { canArchiveInvestmentTarget, targetPayload, tradePayload, validateTargetDraft, validateTradeDraft } from '@mogo/investment-management-core';
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
  const canArchive = canArchiveInvestmentTarget(resource.data?.target);
  const archive = archived => {
    if (archived && !canArchive) {
      resource.notify('investmentBuiltinProtected');
      return Promise.resolve(false);
    }
    return resource.mutate(() => api.archiveTarget(targetId, archived), archived ? 'investmentArchiveSaved' : 'investmentRestoreSaved');
  };
  return { ...resource, saveTarget, saveTrade, canArchive, archive,
    deleteTrade: id => resource.mutate(() => api.deleteTrade(id), 'investmentDeleted') };
};
