import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatDisplayDate } from '@mogo/personal-finance-core';
import { usePreferences } from '../../platform/PreferencesProvider';
import { Label } from '../../components/Primitives';

export default function TrendChart({ days }) {
  const [width, setWidth] = useState(280);
  const [selected, setSelected] = useState(null);
  const { colors } = usePreferences();
  const { t, i18n } = useTranslation();
  const height = 150,
    inset = 16;
  const maximum = Math.max(1, ...days.map(day => day.amountCents));
  const points = days.map((day, index) => ({
    x:
      days.length === 1
        ? width / 2
        : inset + (index * (width - inset * 2)) / (days.length - 1),
    y: height - inset - (day.amountCents / maximum) * (height - inset * 2),
  }));
  const active = selected == null ? null : Math.min(selected, days.length - 1);
  const select = event => {
    // RN uses a finger drag here; Web's equivalent is mouse hover on the trend line.
    const relative =
      (event.nativeEvent.locationX - inset) / Math.max(1, width - inset * 2);
    setSelected(
      Math.max(
        0,
        Math.min(days.length - 1, Math.round(relative * (days.length - 1))),
      ),
    );
  };
  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <Label style={styles.value}>
        {active != null && days[active]
          ? formatMoney(days[active].amountCents, i18n.language)
          : ' '}
      </Label>
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
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={select}
        onResponderMove={select}
        onResponderTerminationRequest={() => false}
      >
        <Svg width={width} height={height}>
          <Polyline
            points={points.map(point => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
          />
          {points.length === 1 && (
            <Circle
              cx={points[0].x}
              cy={points[0].y}
              r={3}
              fill={colors.accent}
            />
          )}
          {active != null && points[active] && (
            <Circle
              cx={points[active].x}
              cy={points[active].y}
              r={5}
              fill={colors.accent}
            />
          )}
        </Svg>
      </View>
      <View style={styles.axis}>
        <Label muted>
          {days[0] && formatDisplayDate(days[0].date, i18n.language)}
        </Label>
        <Label muted>
          {days.length > 1 &&
            formatDisplayDate(days[days.length - 1].date, i18n.language)}
        </Label>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  value: { textAlign: 'center', minHeight: 28 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', padding: 8 },
});
