import React, { createContext, useContext, useRef, useState } from 'react';
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
const FormSheetContext = createContext(false);

export function Page({ children, plain = false }) {
  const { colors } = usePreferences();
  return (
    <KeyboardAvoidingView
      style={[styles.flex, plain && { backgroundColor: colors.surface }]}
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
export function Section({ title, children, plain = false }) {
  const { colors } = usePreferences();
  return (
    <View style={styles.section}>
      {title && (
        <Label
          accessibilityRole="header"
          style={[styles.heading, plain && styles.plainHeading]}
        >
          {title}
        </Label>
      )}
      <View
        style={!plain && [styles.card, { backgroundColor: colors.surface }]}
      >
        {children}
      </View>
    </View>
  );
}
export function FormSheet({ children }) {
  const { colors } = usePreferences();
  return (
    <FormSheetContext.Provider value>
      <View
        style={[
          styles.sheet,
          { borderColor: colors.line, backgroundColor: colors.background },
        ]}
      >
        {children}
      </View>
    </FormSheetContext.Provider>
  );
}
export function Row({ label, children, action, alignStart = false }) {
  const sheet = useContext(FormSheetContext);
  const { colors } = usePreferences();
  return (
    <View
      style={[
        styles.row,
        sheet && styles.sheetRow,
        alignStart && styles.rowStart,
        { borderColor: colors.line },
      ]}
    >
      <Label style={[styles.rowLabel, sheet && styles.sheetLabel]}>
        {label}
      </Label>
      <View style={styles.rowControls}>
        <View style={styles.rowValue}>{children}</View>
        {action && <View style={styles.rowAction}>{action}</View>}
      </View>
    </View>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  numeric = false,
  action,
  ...props
}) {
  const { colors } = usePreferences();
  const sheet = useContext(FormSheetContext);
  return (
    <Row label={label} action={action} alignStart={props.multiline}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          sheet && styles.sheetInput,
          props.multiline && styles.multiline,
          { color: colors.text, borderColor: colors.line },
        ]}
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
  variant = 'text',
  compact = false,
  style,
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
        compact && styles.compactAction,
        variant !== 'text' && [
          styles.actionBorder,
          { borderColor: colors.text },
        ],
        variant === 'primary' && { backgroundColor: colors.text },
        style,
        { opacity: disabled || busy ? 0.45 : pressed ? 0.65 : 1 },
      ]}
    >
      <Text
        style={[
          styles.actionLabel,
          compact && styles.compactLabel,
          {
            color: danger
              ? colors.danger
              : variant === 'primary'
              ? colors.surface
              : variant === 'text'
              ? colors.accent
              : colors.text,
          },
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
  plainHeading: { marginBottom: 12 },
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
  sheetLabel: { width: '30%', fontSize: 14 },
  rowControls: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { flex: 1, minWidth: 0 },
  rowAction: { maxWidth: '48%' },
  rowStart: { alignItems: 'flex-start', paddingVertical: 12 },
  sheet: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  sheetRow: { borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  sheetInput: { borderBottomWidth: 0 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  compactAction: { paddingHorizontal: 0, minWidth: 44, flexShrink: 1 },
  compactLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  actionBorder: { borderWidth: 1, borderRadius: 6 },
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
