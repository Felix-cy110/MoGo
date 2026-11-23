import { formatLocalDate } from './date.js';
import { sortCategoriesOtherLast } from './category.js';

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

const parseDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const daysInRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
};

const fillDaysInRange = (days, startDate, endDate) => {
  if (!startDate || !endDate) return days;
  const values = new Map(days.map((day) => [day.date, day]));
  const result = [];
  const cursor = parseDate(startDate);
  const end = parseDate(endDate);
  while (cursor <= end) {
    const date = formatLocalDate(cursor);
    result.push(values.get(date) || { date, amountCents: 0, expenseCount: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
};

export const buildAnalyticsView = (dashboard, period) => {
  const days = fillDaysInRange(dashboard?.days || [], dashboard?.startDate, dashboard?.endDate);
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
    categoryTotals: sortCategoriesOtherLast(dashboard?.categoryTotals || []).map((category) => ({
      ...category,
      sharePercent: totalAmountCents > 0 ? Math.round((category.amountCents / totalAmountCents) * 100) : 0
    }))
  };
};
