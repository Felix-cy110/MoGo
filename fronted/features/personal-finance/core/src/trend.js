// Geometry only: Web pointer events and native touch events stay in their platform views.
export const buildTrendChart = (days, {
  width = 760,
  height = 300,
  padding = { top: 24, right: 22, bottom: 48, left: 12 },
  maxLabels = 7
} = {}) => {
  const chartWidth = Math.max(1, width - padding.left - padding.right);
  const chartHeight = Math.max(1, height - padding.top - padding.bottom);
  const maxAmount = Math.max(1, ...days.map((day) => Number(day.amountCents || 0)));
  const points = days.map((day, index) => ({
    ...day,
    x: padding.left + chartWidth * (days.length <= 1 ? 0.5 : index / (days.length - 1)),
    y: padding.top + chartHeight * (1 - Number(day.amountCents || 0) / maxAmount)
  }));
  const linePoints = points.map(({ x, y }) => `${x},${y}`).join(' ');
  return {
    width, height, padding, chartWidth, chartHeight, points, linePoints,
    areaPoints: points.length
      ? `${points[0].x},${padding.top + chartHeight} ${linePoints} ${points.at(-1).x},${padding.top + chartHeight}`
      : '',
    labelStep: Math.max(1, Math.ceil((days.length - 1) / Math.max(1, maxLabels - 1)))
  };
};

export const findNearestTrendPoint = (points, x) => {
  if (!points.length) return null;
  return points.reduce((nearest, point, index) =>
    Math.abs(point.x - x) < Math.abs(points[nearest].x - x) ? index : nearest, 0);
};
