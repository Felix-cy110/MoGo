import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import FormDialog from '../../components/FormDialog';
import { Action, Field, FormSheet, Label } from '../../components/Primitives';

export default function CategoryEditor({ model, returnFocusRef }) {
  const { t } = useTranslation();
  return (
    <FormDialog
      visible={!!model.editingCategory}
      returnFocusRef={returnFocusRef}
      title={t('editCategory')}
      onClose={model.cancelEditing}
    >
      {model.feedback?.presentation === 'inline' && (
        <Label accessibilityRole="alert">{t(model.feedback.key)}</Label>
      )}
      <FormSheet>
        <Field
          label={t('categoryName')}
          value={model.editForm.name}
          maxLength={80}
          onChangeText={name => model.setEditForm({ name })}
        />
      </FormSheet>
      <View style={styles.actions}>
        <Action
          variant="secondary"
          title={t('cancel')}
          onPress={model.cancelEditing}
        />
        <Action
          variant="primary"
          title={t('saveCategory')}
          onPress={model.updateCategory}
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
