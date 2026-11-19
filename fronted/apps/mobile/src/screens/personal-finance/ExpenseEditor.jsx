import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../../platform/PreferencesProvider';
import IconButton from '../../components/IconButton';
import { Action, Label, Page, Section } from '../../components/Primitives';
import ExpenseFields from './ExpenseFields';

export default function ExpenseEditor({ model }) {
  const { t } = useTranslation();
  const { colors } = usePreferences();
  return (
    <Modal
      visible={model.editingExpenseId != null}
      animationType="slide"
      onRequestClose={model.cancelEditingExpense}
    >
      <SafeAreaView
        accessibilityViewIsModal
        style={[styles.screen, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <IconButton
            icon="back"
            label={t('back')}
            onPress={model.cancelEditingExpense}
          />
          <Label accessibilityRole="header" style={styles.title}>
            {t('editExpenseTitle')}
          </Label>
        </View>
        <Page>
          <Section>
            <ExpenseFields
              form={model.editForm}
              setForm={model.setEditForm}
              categories={model.categories}
            />
            <Action title={t('updateExpense')} onPress={model.updateExpense} />
            <Action title={t('cancel')} onPress={model.cancelEditingExpense} />
          </Section>
        </Page>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  title: { fontSize: 17, fontWeight: '600', flex: 1 },
});
