import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { usePreferences } from '../platform/PreferencesProvider';
import { Label } from './Primitives';

export default function FormDialog({
  visible,
  title,
  onClose,
  returnFocusRef,
  children,
}) {
  const { colors } = usePreferences();
  const heading = useRef(null);
  const wasVisible = useRef(false);
  const restoreFocus = () => {
    const node =
      returnFocusRef?.current && findNodeHandle(returnFocusRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  };
  useEffect(() => {
    // iOS provides onDismiss; Android restores focus after removing the modal window.
    const shouldRestore =
      wasVisible.current && !visible && Platform.OS === 'android';
    wasVisible.current = visible;
    if (!shouldRestore) return;
    const frame = requestAnimationFrame(() => {
      const node =
        returnFocusRef?.current && findNodeHandle(returnFocusRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, returnFocusRef]);
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onDismiss={restoreFocus}
      onRequestClose={onClose}
      onShow={() => {
        const node = findNodeHandle(heading.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={[
            styles.dialog,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <Label
              ref={heading}
              accessible
              accessibilityRole="header"
              style={styles.title}
            >
              {title}
            </Label>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0006',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: { width: '100%', maxWidth: 440, maxHeight: '90%', borderWidth: 1 },
  content: { padding: 20 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 20 },
});
