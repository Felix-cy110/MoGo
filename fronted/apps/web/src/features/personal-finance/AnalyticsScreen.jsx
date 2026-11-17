import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ANALYTICS_PERIOD,
  formatDisplayDate,
  formatMoney,
  getLocale,
  resolveCategoryMessageKey
} from '@mogo/personal-finance-core';
import { useFinanceAnalytics } from '@mogo/personal-finance-react';
import { AppControls } from '../../components/AppControls';
import { api } from '../../services/api';

function BackButton({ label, onClick }) {
  return (
    <button className="back-button" type="button" onClick={onClick} aria-label={label}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Metric({ label, value }) {
  return (
    <div className="analytics-metric">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function LineChart({ days, language, label }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const width = 760;
  const height = 300;
  const padding = { top: 24, right: 22, bottom: 48, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxAmount = Math.max(1, ...days.map((day) => Number(day.amountCents || 0)));
  const points = days.map((day, index) => {
    const ratio = days.length <= 1 ? 0.5 : index / (days.length - 1);
    const x = padding.left + chartWidth * ratio;
    const y = padding.top + chartHeight - (Number(day.amountCents || 0) / maxAmount) * chartHeight;
    return { ...day, x, y };
  });
  const linePoints = points.map(({ x, y }) => `${x},${y}`).join(' ');
  const areaPoints = `${padding.left},${padding.top + chartHeight} ${linePoints} ${padding.left + chartWidth},${padding.top + chartHeight}`;
  const dateFormatter = new Intl.DateTimeFormat(getLocale(language), { month: 'numeric', day: 'numeric' });
  const labelStep = days.length > 12 ? Math.ceil(days.length / 7) : 1;
  const selectedPoint = selectedIndex === null ? null : points[selectedIndex];
  const tooltipWidth = 96;
  const tooltipHeight = 30;
  const tooltipX = selectedPoint
    ? Math.min(Math.max(selectedPoint.x - tooltipWidth / 2, padding.left), width - padding.right - tooltipWidth)
    : 0;
  const tooltipY = selectedPoint
    ? Math.max(padding.top, selectedPoint.y - tooltipHeight - 12)
    : 0;

  const getNearestPointIndex = (clientX, element) => {
    const bounds = element.getBoundingClientRect();
    const viewBoxX = ((clientX - bounds.left) / bounds.width) * width;
    return points.reduce((nearestIndex, point, index) => (
      Math.abs(point.x - viewBoxX) < Math.abs(points[nearestIndex].x - viewBoxX) ? index : nearestIndex
    ), 0);
  };

  // Web 端用鼠标/指针移动模拟手机端手指滑动，RN 端复用同一交互意图。
  const handlePointerMove = (event) => {
    setSelectedIndex(getNearestPointIndex(event.clientX, event.currentTarget));
  };

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedIndex(getNearestPointIndex(event.clientX, event.currentTarget));
  };

  const handlePointerLeave = (event) => {
    if (event.pointerType === 'mouse') {
      setSelectedIndex(null);
    }
  };

  return (
    <svg
      className="analytics-line-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
    >
      {[0, 0.5, 1].map((ratio) => {
        const y = padding.top + chartHeight * ratio;
        return <line className="analytics-grid-line" key={ratio} x1={padding.left} x2={padding.left + chartWidth} y1={y} y2={y} />;
      })}
      <polygon className="analytics-area" points={areaPoints} />
      {selectedPoint && (
        <line
          className="analytics-focus-line"
          x1={selectedPoint.x}
          x2={selectedPoint.x}
          y1={padding.top}
          y2={padding.top + chartHeight}
        />
      )}
      <polyline className="analytics-line" points={linePoints} />
      {points.map((point, index) => (
        <g key={point.date}>
          <circle
            className={index === selectedIndex ? 'analytics-point analytics-point-selected' : 'analytics-point'}
            cx={point.x}
            cy={point.y}
            r={index === selectedIndex ? '6' : '4'}
          >
            <title>{formatMoney(point.amountCents, language)}</title>
          </circle>
          {(index % labelStep === 0 || index === points.length - 1) && (
            <text className="analytics-axis-label" x={point.x} y={height - 16} textAnchor="middle">
              {dateFormatter.format(new Date(`${point.date}T00:00:00`))}
            </text>
          )}
        </g>
      ))}
      {selectedPoint && (
        <g className="analytics-tooltip" pointerEvents="none">
          <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="4" />
          <text className="analytics-tooltip-amount" x={tooltipX + tooltipWidth / 2} y={tooltipY + 20} textAnchor="middle">
            {formatMoney(selectedPoint.amountCents, language)}
          </text>
        </g>
      )}
      <rect
        className="analytics-interaction-layer"
        x={padding.left}
        y={padding.top}
        width={chartWidth}
        height={chartHeight}
        aria-hidden="true"
      />
    </svg>
  );
}

export function AnalyticsScreen({ onBack }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const analytics = useFinanceAnalytics({ api });
  const feedbackText = analytics.feedback ? t(analytics.feedback.key) : '';

  useEffect(() => {
    document.title = `${t('expenseAnalysis')} · ${t('appName')}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('expenseAnalysisDescription'));
  }, [language, t]);

  const rangeText = t('analysisRange', {
    start: formatDisplayDate(analytics.range.startDate, language),
    end: formatDisplayDate(analytics.range.endDate, language)
  });

  return (
    <main className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-5 py-2 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <BackButton label={t('backToFinance')} onClick={onBack} />
            <h1 className="truncate text-xl font-semibold">{t('expenseAnalysis')}</h1>
          </div>
          <AppControls />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="analytics-tabs" role="tablist" aria-label={t('expenseAnalysis')}>
            <button
              className={analytics.period === ANALYTICS_PERIOD.WEEK ? 'analytics-tab analytics-tab-active' : 'analytics-tab'}
              type="button"
              role="tab"
              aria-selected={analytics.period === ANALYTICS_PERIOD.WEEK}
              onClick={() => analytics.setPeriod(ANALYTICS_PERIOD.WEEK)}
            >
              {t('weeklyAnalysis')}
            </button>
            <button
              className={analytics.period === ANALYTICS_PERIOD.MONTH ? 'analytics-tab analytics-tab-active' : 'analytics-tab'}
              type="button"
              role="tab"
              aria-selected={analytics.period === ANALYTICS_PERIOD.MONTH}
              onClick={() => analytics.setPeriod(ANALYTICS_PERIOD.MONTH)}
            >
              {t('monthlyAnalysis')}
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{rangeText}</p>
        </div>

        {analytics.feedback?.type === 'error' && <div className="notice notice-error mt-5">{feedbackText}</div>}
        {analytics.loading && <p className="py-10 text-sm text-slate-500 dark:text-slate-400">{t('loadingAnalysis')}</p>}

        {!analytics.loading && (
          <>
            <section className="analytics-metrics mt-6">
              <Metric label={t('totalSpent')} value={formatMoney(analytics.view.totalAmountCents, language)} />
              <Metric label={t('dailyAverage')} value={formatMoney(analytics.view.averageAmountCents, language)} />
              <Metric label={t('activeDays')} value={analytics.view.activeDayCount} />
              <Metric label={t('expenseEntries')} value={analytics.view.expenseCount} />
            </section>

            {analytics.view.expenseCount === 0 ? (
              <p className="mt-8 border-y border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {t('noAnalysisData')}
              </p>
            ) : (
              <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
                <section>
                  <h2 className="section-title">{t('spendingTrend')}</h2>
                  <div className="analytics-line-chart mt-4">
                    <LineChart
                      days={analytics.view.days}
                      language={language}
                      label={t('spendingTrend')}
                    />
                  </div>
                </section>

                <section>
                  <h2 className="section-title">{t('categoryBreakdown')}</h2>
                  <div className="mt-4 border-y border-slate-200 dark:border-slate-800">
                    {analytics.view.categoryTotals.map((category) => {
                      const messageKey = resolveCategoryMessageKey(category);
                      const name = messageKey ? t(messageKey) : category.categoryName;
                      const percent = analytics.view.totalAmountCents > 0
                        ? Math.round((category.amountCents / analytics.view.totalAmountCents) * 100)
                        : 0;
                      return (
                        <div className="analytics-category-row" key={category.categoryId}>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{name}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {category.expenseCount} {t('count')} · {percent}%
                            </p>
                          </div>
                          <p className="text-sm font-medium">{formatMoney(category.amountCents, language)}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
