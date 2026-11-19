import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { usePreferences } from '../platform/PreferencesProvider';
export default function IconButton({ icon, label, onPress }) {
  const { colors } = usePreferences();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.button}
    >
      <Svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.text}
        strokeWidth={1.7}
      >
        {icon === 'back' ? (
          <Path d="m14 5-7 7 7 7" />
        ) : icon === 'user' ? (
          <>
            <Circle cx={12} cy={8} r={3.5} />
            <Path d="M5 21v-2a7 7 0 0 1 14 0v2" />
          </>
        ) : (
          <>
            <Circle cx={12} cy={12} r={3} />
            <Path d="m10 2-1 3-3 1-3-1-2 4 2 3-1 3 2 4 3-1 3 2 2 2 4-2v-3l3-2 3-1v-4l-3-1-2-3V3l-4-1-2 2Z" />
          </>
        )}
      </Svg>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
