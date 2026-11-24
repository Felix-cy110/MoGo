import { useCallback, useState } from 'react';
import { filterInvestmentTargets, targetPayload, validateTargetDraft } from '@mogo/investment-management-core';
import { useInvestmentResource } from './useInvestmentResource.js';
export const useInvestmentTargets = ({ api }) => {
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState('');
  const load = useCallback(() => api.listTargets(archived), [api, archived]);
  const resource = useInvestmentResource(load);
  const save = draft => {
    const error = validateTargetDraft(draft);
    if (error) { resource.notify(error); return Promise.resolve(false); }
    return resource.mutate(() => api.addTarget(targetPayload(draft)));
  };
  return { ...resource, archived, setArchived, query, setQuery,
    items: filterInvestmentTargets(resource.data || [], query), save };
};
