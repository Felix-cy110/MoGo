import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Polygon,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import {
  buildTrendChart,
  findNearestTrendPoint,
  formatMoney,
  formatDisplayDate,
  getLocale,
} from '@mogo/personal-finance-core';
import { usePreferences } from '../../platform/PreferencesProvider';

export default function TrendChart({ days }) {
  const [width, setWidth] = useState(300);
  const [selected, setSelected] = useState(null);
  const { colors } = usePreferences();
  const { t, i18n } = useTranslation();
  const chart = buildTrendChart(days, {
    width,
    height: 220,
    padding: { top: 36, right: 24, bottom: 36, left: 24 },
    maxLabels: width < 360 ? 5 : 7,
  });
  const { points, padding, chartWidth, chartHeight, height } = chart;
  const active =
    selected == null || !days.length
      ? null
      : Math.min(selected, days.length - 1);
  const point = active == null ? null : points[active];
  const amount = point ? formatMoney(point.amountCents, i18n.language) : '';
  const tooltipWidth = Math.min(
    width - 16,
    Math.max(96, amount.length * 8 + 20),
  );
  const tooltipX = point
    ? Math.max(
        8,
        Math.min(width - tooltipWidth - 8, point.x - tooltipWidth / 2),
      )
    : 0;
  const tooltipY = point ? Math.max(2, point.y - 42) : 0;
  const dateFormatter = new Intl.DateTimeFormat(getLocale(i18n.language), {
    month: 'numeric',
    day: 'numeric',
  });
  const select = event => {
    // 手机用手指滑动选择节点；Web 对应鼠标 hover，坐标和最近节点算法共用。
    setSelected(findNearestTrendPoint(points, event.nativeEvent.locationX));
  };
  return (
    <View
      onLayout={event => setWidth(Math.max(1, event.nativeEvent.layout.width))}
      style={[styles.chart, { borderColor: colors.line }]}
    >
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('spendingTrend')}
        accessibilityHint={t('trendHint')}
        accessibilityValue={{
          min: 0,
          max: Math.max(0, days.length - 1),
          now: active ?? 0,
          text: days[active ?? 0]
            ? `${formatDisplayDate(
                days[active ?? 0].date,
                i18n.language,
              )} ${formatMoney(days[active ?? 0].amountCents, i18n.language)}`
            : t('noAnalysisData'),
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={event =>
          setSelected(
            Math.max(
              0,
              Math.min(
                days.length - 1,
                (active ?? 0) +
                  (event.nativeEvent.actionName === 'increment' ? 1 : -1),
              ),
            ),
          )
        }
        onStartShouldSetResponder={() => days.length > 0}
        onMoveShouldSetResponder={() => days.length > 0}
        onResponderGrant={select}
        onResponderMove={select}
        onResponderTerminationRequest={() => false}
      >
        <Svg pointerEvents="none" width={width} height={height}>
          {[0, 0.5, 1].map(ratio => (
            <Line
              key={ratio}
              x1={padding.left}
              x2={padding.left + chartWidth}
              y1={padding.top + chartHeight * ratio}
              y2={padding.top + chartHeight * ratio}
              stroke={colors.line}
            />
          ))}
          <Polygon
            points={chart.areaPoints}
            fill={colors.text}
            opacity={0.09}
          />
          {point && (
            <Line
              x1={point.x}
              x2={point.x}
              y1={padding.top}
              y2={padding.top + chartHeight}
              stroke={colors.muted}
              strokeDasharray="4 4"
            />
          )}
          <Polyline
            points={chart.linePoints}
            fill="none"
            stroke={colors.text}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((item, index) => (
            <React.Fragment key={item.date}>
              <Circle
                cx={item.x}
                cy={item.y}
                r={active === index ? 5 : 3}
                fill={active === index ? colors.text : colors.surface}
                stroke={colors.text}
                strokeWidth={2}
              />
              {(index % chart.labelStep === 0 ||
                index === points.length - 1) && (
                <SvgText
                  x={item.x}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize={11}
                  fill={colors.muted}
                >
                  {dateFormatter.format(new Date(`${item.date}T00:00:00`))}
                </SvgText>
              )}
            </React.Fragment>
          ))}
          {point && (
            <>
              <Rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={30}
                rx={4}
                fill={colors.text}
              />
              <SvgText
                x={tooltipX + tooltipWidth / 2}
                y={tooltipY + 20}
                textAnchor="middle"
                fontSize={12}
                fontWeight="600"
                fill={colors.surface}
              >
                {amount}
              </SvgText>
            </>
          )}
        </Svg>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  chart: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
