import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAnalyticsView, buildTrendChart, findNearestTrendPoint, resolveAlertMessageKey } from '../src/index.js';

test('chart handles empty, single and zero-spending series without invalid coordinates', () => {
  assert.equal(findNearestTrendPoint([], 20), null);
  assert.equal(buildTrendChart([]).areaPoints, '');
  const single = buildTrendChart([{ date: '2026-11-23', amountCents: 0 }]);
  assert.equal(single.points[0].x, single.padding.left + single.chartWidth / 2);
  assert.equal(single.points[0].y, single.padding.top + single.chartHeight);
  assert.equal(findNearestTrendPoint(single.points, -100), 0);
});

test('both chart sizes select the same day at corresponding positions and clamp outside touches', () => {
  const days = Array.from({ length: 30 }, (_, index) => ({ date: `2026-11-${String(index + 1).padStart(2, '0')}`, amountCents: index * 100 }));
  for (const width of [280, 760]) {
    const chart = buildTrendChart(days, { width });
    assert.equal(findNearestTrendPoint(chart.points, -10), 0);
    assert.equal(findNearestTrendPoint(chart.points, width + 50), 29);
    assert.equal(findNearestTrendPoint(chart.points, chart.points[13].x + 0.1), 13);
    assert.ok(chart.points.every(point => Number.isFinite(point.y) && point.y >= chart.padding.top));
    assert.ok(chart.labelStep > 1);
  }
});

test('analytics shares rounded category percentages while keeping Other last', () => {
  const view = buildAnalyticsView({ totalAmountCents: 300, categoryTotals: [
    { categoryCode: 'OTHER', amountCents: 100 }, { categoryCode: 'MEAL', amountCents: 200 }
  ] }, 'week');
  assert.deepEqual(view.categoryTotals.map(item => [item.categoryCode, item.sharePercent]), [['MEAL', 67], ['OTHER', 33]]);
  assert.equal(buildAnalyticsView({ totalAmountCents: 0, categoryTotals: [{ amountCents: 0 }] }).categoryTotals[0].sharePercent, 0);
});

test('budget warning language describes the selected day in both clients', () => {
  assert.equal(resolveAlertMessageKey({ thresholdPercent: 80 }), 'alertWarning');
  assert.equal(resolveAlertMessageKey({ thresholdPercent: 100 }), 'alertExceeded');
  assert.equal(resolveAlertMessageKey({ messageKey: 'alert.budget.warning' }, { isToday: false }), 'alertWarningYesterday');
  assert.equal(resolveAlertMessageKey({ thresholdPercent: 100 }, { isToday: false }), 'alertExceededYesterday');
});
