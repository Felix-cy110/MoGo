import { useCallback, useEffect, useRef, useState } from 'react';

const extractTargets = items =>
  (Array.isArray(items) ? items : [])
    .map(item => item?.target)
    .filter(Boolean);

export const useInvestmentMarketTargets = ({ api, enabled }) => {
  const [targets, setTargets] = useState([]);
  const sequence = useRef(0);

  const refreshTargets = useCallback(async () => {
    const current = ++sequence.current;
    if (!enabled || !api?.listTargets) {
      setTargets([]);
      return;
    }
    try {
      const items = await api.listTargets();
      if (sequence.current === current) setTargets(extractTargets(items));
    } catch {
      // Keep the last known subscriptions when a local read fails temporarily.
    }
  }, [api, enabled]);

  useEffect(() => {
    refreshTargets();
    return () => {
      ++sequence.current;
    };
  }, [refreshTargets]);

  return { targets, refreshTargets };
};
