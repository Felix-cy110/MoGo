import { useCallback, useEffect, useRef, useState } from 'react';
import { investmentErrorKey } from '@mogo/investment-management-core';

export const useInvestmentResource = load => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const sequence = useRef(0);
  const mounted = useRef(false);
  const busy = useRef(false);
  const reload = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true); setLoadError(null);
    try {
      const value = await load();
      if (mounted.current && current === sequence.current) setData(value);
    } catch (error) {
      if (mounted.current && current === sequence.current) {
        setData(null);
        setLoadError(error.code === 'FEATURE_UNAVAILABLE' ? 'investmentUnavailable' : 'investmentLoadFailed');
      }
    } finally {
      if (mounted.current && current === sequence.current) setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    mounted.current = true; reload();
    return () => { mounted.current = false; ++sequence.current; };
  }, [reload]);
  const notify = useCallback(key => setFeedback({ key, presentation: 'dialog' }), []);
  const clearFeedback = useCallback(() => setFeedback(null), []);
  const mutate = useCallback(async (action, successKey = 'investmentSaved', reloadAfter = true) => {
    if (busy.current) return false;
    busy.current = true; setSaving(true); setFeedback(null);
    try {
      await action();
      if (mounted.current) {
        // A failed refresh must never turn a committed write into a retryable save.
        if (reloadAfter) await reload();
        if (mounted.current) notify(successKey);
      }
      return true;
    } catch (error) {
      if (mounted.current) notify(investmentErrorKey(error.code));
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [reload, notify]);
  return { data, loading, loadError, saving, feedback, reload, mutate, notify, clearFeedback };
};
