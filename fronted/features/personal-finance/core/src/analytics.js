import { formatLocalDate } from './date.js';

export const ANALYTICS_PERIOD = Object.freeze({
  WEEK: 'week',
  MONTH: 'month'
});

const startOfWeek = (date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
};

export const buildAnalyticsRange = (period, referenceDate = new Date()) => {
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const start = period === ANALYTICS_PERIOD.MONTH
    ? new Date(end.getFullYear(), end.getMonth(), 1)
    : startOfWeek(end);
  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end)
  };
};

const daysInRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
};

export const buildAnalyticsView = (dashboard, period) => {
  const days = dashboard?.days || [];
  const totalAmountCents = Number(dashboard?.totalAmountCents || 0);
  const activeDayCount = days.filter((day) => day.amountCents > 0).length;
  const dayCount = daysInRange(dashboard?.startDate, dashboard?.endDate);
  return {
    period,
    totalAmountCents,
    expenseCount: Number(dashboard?.expenseCount || 0),
    activeDayCount,
    averageAmountCents: Math.round(totalAmountCents / dayCount),
    maxAmountCents: Math.max(0, ...days.map((day) => Number(day.amountCents || 0))),
    days,
    categoryTotals: dashboard?.categoryTotals || []
  };
};
