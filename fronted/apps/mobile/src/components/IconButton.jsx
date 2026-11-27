import React, { forwardRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { usePreferences } from '../platform/PreferencesProvider';
/*
 * Settings outline from Lucide, matching the Web icon.
 *
 * ISC License
 *
 * Copyright (c) 2026 Lucide Icons and Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
const SETTINGS_OUTLINE =
  'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915';

const IconButton = forwardRef(function IconButton({
  backgroundColor,
  borderColor,
  color,
  icon,
  label,
  onPress,
  outlined = false,
}, ref) {
  const { colors } = usePreferences();
  const iconColor = color ?? colors.text;
  const iconSize = outlined ? 18 : 22;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={outlined ? 6 : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        outlined && [
          styles.outlinedButton,
          { backgroundColor, borderColor },
        ],
        pressed && styles.pressed,
      ]}
    >
      <Svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon === 'back' ? (
          <Path d="m14 5-7 7 7 7" />
        ) : icon === 'user' ? (
          <>
            <Circle cx={12} cy={8} r={3.5} />
            <Path d="M5 21v-2a7 7 0 0 1 14 0v2" />
          </>
        ) : icon === 'plus' ? (
          <>
            <Path d="M12 5v14" />
            <Path d="M5 12h14" />
          </>
        ) : (
          <>
            <Circle cx={12} cy={12} r={3} />
            <Path d={SETTINGS_OUTLINE} />
          </>
        )}
      </Svg>
    </Pressable>
  );
});
export default IconButton;
const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
  },
  pressed: { opacity: 0.65 },
});
