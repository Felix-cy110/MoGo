import { useCallback, useState } from 'react';
import { filterInvestmentTargets, targetPayload, validateTargetDraft } from '@mogo/investment-management-core';
import { useInvestmentResource } from './useInvestmentResource.js';
export const useInvestmentTargets = ({ api }) => {
  const [query, setQuery] = useState('');
  const load = useCallback(() => api.listTargets(), [api]);
  const resource = useInvestmentResource(load);
  const save = draft => {
    const error = validateTargetDraft(draft);
    if (error) { resource.notify(error); return Promise.resolve(false); }
    return resource.mutate(() => api.addTarget(targetPayload(draft)));
  };
  return { ...resource, query, setQuery,
    items: filterInvestmentTargets(resource.data || [], query), save };
};
