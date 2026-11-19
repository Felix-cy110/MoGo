import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../platform/PreferencesProvider';

export function Label({ children, muted = false, style, ...props }) {
  const { colors } = usePreferences();
  return (
    <Text
      {...props}
      style={[
        styles.text,
        { color: muted ? colors.muted : colors.text },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Page({ children }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.page}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Section({ title, children }) {
  const { colors } = usePreferences();
  return (
    <View style={styles.section}>
      {title && <Label style={styles.heading}>{title}</Label>}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {children}
      </View>
    </View>
  );
}
export function Row({ label, children }) {
  const { colors } = usePreferences();
  return (
    <View style={[styles.row, { borderColor: colors.line }]}>
      <Label style={styles.rowLabel}>{label}</Label>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  numeric = false,
  ...props
}) {
  const { colors } = usePreferences();
  return (
    <Row label={label}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text, borderColor: colors.line }]}
        {...props}
      />
    </Row>
  );
}
export function Action({
  title,
  onPress,
  disabled = false,
  danger = false,
  ...props
}) {
  const { colors } = usePreferences();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const press = async () => {
    if (lock.current || disabled) return;
    lock.current = true;
    setBusy(true);
    try {
      await onPress();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={press}
      style={({ pressed }) => [
        styles.action,
        { opacity: disabled || busy ? 0.45 : pressed ? 0.65 : 1 },
      ]}
    >
      <Text
        style={[
          styles.actionLabel,
          { color: danger ? colors.danger : colors.accent },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function LinkRow({ title, onPress }) {
  const { colors } = usePreferences();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.link, { borderColor: colors.line }]}
    >
      <Label style={styles.flex}>{title}</Label>
      <Label muted>›</Label>
    </Pressable>
  );
}
export function Loading() {
  const { t } = useTranslation();
  const { colors } = usePreferences();
  return (
    <ActivityIndicator
      accessibilityLabel={t('loading')}
      color={colors.accent}
      style={styles.loading}
    />
  );
}
const styles = StyleSheet.create({
  actionLabel: { fontSize: 15, fontWeight: '600' },
  flex: { flex: 1 },
  text: { fontSize: 15, lineHeight: 22 },
  page: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  section: { marginBottom: 16 },
  heading: { fontWeight: '600', marginBottom: 8 },
  card: { borderRadius: 8, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 10,
  },
  rowLabel: { width: '35%' },
  rowValue: { flex: 1 },
  input: {
    minHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    padding: 4,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loading: { padding: 24 },
});
