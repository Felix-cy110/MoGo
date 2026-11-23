import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import FormDialog from '../../components/FormDialog';
import { Action } from '../../components/Primitives';
import ExpenseFields from './ExpenseFields';

export default function ExpenseEditor({ model, returnFocusRef }) {
  const { t } = useTranslation();
  return (
    <FormDialog
      visible={model.editingExpenseId != null}
      returnFocusRef={returnFocusRef}
      title={t('editExpenseTitle')}
      onClose={model.cancelEditingExpense}
    >
      <ExpenseFields
        form={model.editForm}
        setForm={model.setEditForm}
        categories={model.categories}
      />
      <View style={styles.actions}>
        <Action
          variant="secondary"
          title={t('cancel')}
          onPress={model.cancelEditingExpense}
        />
        <Action
          variant="primary"
          title={t('updateExpense')}
          onPress={model.updateExpense}
        />
      </View>
    </FormDialog>
  );
}
const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
});
