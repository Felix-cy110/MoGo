import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { usePreferences } from '../platform/PreferencesProvider';
import { getToolboxPalette } from './toolboxTheme';

function FeatureIcon({ type, palette }) {
  if (type === 'investment') {
    return (
      <Svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke={palette.iconText}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="m3 17 6-6 4 4 8-8" />
        <Path d="M14 7h7v7" />
      </Svg>
    );
  }

  return (
    <Text
      style={[
        styles.iconLabel,
        type === 'leetcode' && styles.leetcodeIconLabel,
        { color: palette.iconText },
      ]}
    >
      {type === 'finance' ? '¥' : 'LC'}
    </Text>
  );
}

export default function ToolboxFeatureRow({
  description,
  first = false,
  icon,
  onPress,
  title,
}) {
  const { mode } = usePreferences();
  const palette = getToolboxPalette(mode);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        first && styles.firstRow,
        {
          backgroundColor: pressed ? palette.pressed : palette.background,
          borderColor: palette.line,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: palette.iconBackground },
        ]}
      >
        <FeatureIcon type={icon} palette={palette} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.description, { color: palette.muted }]}>
          {description}
        </Text>
      </View>
      <Text
        accessibilityElementsHidden
        style={[styles.chevron, { color: palette.chevron }]}
      >
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    minHeight: 73,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
  firstRow: { borderTopWidth: 1 },
  icon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconLabel: { fontSize: 16, fontWeight: '600' },
  leetcodeIconLabel: { fontSize: 14 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  description: { marginTop: 4, fontSize: 14, lineHeight: 20 },
  chevron: { flexShrink: 0, fontSize: 18, lineHeight: 22 },
});
