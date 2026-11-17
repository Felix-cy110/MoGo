import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ANALYTICS_PERIOD,
  buildAnalyticsRange,
  buildAnalyticsView,
  resolveApiErrorMessageKey
} from '@mogo/personal-finance-core';

export const useFinanceAnalytics = ({ api, referenceDate = new Date() }) => {
  const [period, setPeriod] = useState(ANALYTICS_PERIOD.WEEK);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const referenceKey = `${referenceDate.getFullYear()}-${referenceDate.getMonth()}-${referenceDate.getDate()}`;
  const range = useMemo(
    () => buildAnalyticsRange(period, referenceDate),
    [period, referenceKey]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      setDashboard(await api.getAnalytics(range.startDate, range.endDate));
    } catch (error) {
      setFeedback({ type: 'error', key: resolveApiErrorMessageKey(error.code) });
    } finally {
      setLoading(false);
    }
  }, [api, range.endDate, range.startDate]);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    period,
    setPeriod,
    range,
    dashboard,
    view: buildAnalyticsView(dashboard, period),
    loading,
    feedback,
    refresh
  };
};
