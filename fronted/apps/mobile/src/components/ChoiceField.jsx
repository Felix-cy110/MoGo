import React, { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../platform/PreferencesProvider';
import { Action, Label, Row } from './Primitives';

export default function ChoiceField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  action,
}) {
  const trigger = useRef(null);
  const heading = useRef(null);
  const focus = ref => {
    const node = findNodeHandle(ref.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  };
  const [open, setOpen] = useState(false);
  const { colors } = usePreferences();
  const { t } = useTranslation();
  return (
    <>
      <Row label={label} action={action}>
        <Pressable
          ref={trigger}
          disabled={disabled}
          accessibilityState={{ disabled }}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => setOpen(true)}
          style={styles.trigger}
        >
          <Label>
            {options.find(option => option.value === value)?.label ||
              t('selection')}
            {' ▾'}
          </Label>
        </Pressable>
      </Row>
      <Modal
        visible={open}
        transparent
        onShow={() => focus(heading)}
        onDismiss={() => focus(trigger)}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View
            accessibilityViewIsModal
            style={[styles.dialog, { backgroundColor: colors.surface }]}
          >
            <Label
              ref={heading}
              accessible
              accessibilityRole="header"
              style={styles.title}
            >
              {label}
            </Label>
            <ScrollView>
              {options.map(option => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === option.value }}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={styles.option}
                >
                  <Label
                    style={
                      value === option.value
                        ? [styles.selected, { color: colors.accent }]
                        : undefined
                    }
                  >
                    {option.label}
                  </Label>
                </Pressable>
              ))}
            </ScrollView>
            <Action title={t('close')} onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  selected: { fontWeight: '600' },
  trigger: { minHeight: 44, justifyContent: 'center' },
  backdrop: {
    flex: 1,
    backgroundColor: '#0008',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: { maxHeight: '75%', borderRadius: 12, padding: 12 },
  title: { padding: 12, fontWeight: '600' },
  option: { padding: 12, minHeight: 48 },
});
