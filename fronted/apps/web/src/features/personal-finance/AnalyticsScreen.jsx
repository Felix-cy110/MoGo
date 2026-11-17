import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ANALYTICS_PERIOD,
  formatDisplayDate,
  formatMoney,
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

export function AnalyticsScreen({ onBack }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const analytics = useFinanceAnalytics({ api });
  const maxAmount = analytics.view.maxAmountCents || 1;
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
                  <div className="analytics-chart mt-4">
                    {analytics.view.days.map((day) => (
                      <div className="analytics-bar-row" key={day.date}>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDisplayDate(day.date, language)}
                        </span>
                        <div className="analytics-bar-track">
                          <div
                            className="analytics-bar-fill"
                            style={{ width: `${Math.max(3, (day.amountCents / maxAmount) * 100)}%` }}
                          />
                        </div>
                        <span className="text-right text-sm font-medium">{formatMoney(day.amountCents, language)}</span>
                      </div>
                    ))}
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
