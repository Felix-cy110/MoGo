import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCategoryManagement } from '@mogo/personal-finance-react';
import {
  Action,
  Field,
  Label,
  Loading,
  Page,
  Section,
} from '../../components/Primitives';
import useFeedback from '../../components/useFeedback';
import { categoryLabel } from './categoryLabel';

export default function CategoriesScreen({ api }) {
  const model = useCategoryManagement({ api });
  const { t } = useTranslation();
  useFeedback(model.feedback, model.dismissFeedback);
  const remove = category => {
    if (!model.checkCategoryMutable(category, 'delete')) return;
    Alert.alert(
      t('deleteCategory'),
      t('confirmDeleteCategory', { name: categoryLabel(category, t) }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteCategory'),
          style: 'destructive',
          onPress: () => model.deleteCategory(category.id),
        },
      ],
    );
  };
  return (
    <Page>
      <Section
        title={t(model.editingCategory ? 'editCategory' : 'addCategory')}
      >
        <Field
          label={t('categoryName')}
          value={model.editingCategory ? model.editForm.name : model.form.name}
          onChangeText={name =>
            model.editingCategory
              ? model.setEditForm({ name })
              : model.setForm({ name })
          }
        />
        {model.feedback?.presentation === 'inline' && (
          <Label>{t(model.feedback.key)}</Label>
        )}
        <Action
          title={t(model.editingCategory ? 'saveCategory' : 'addCategory')}
          onPress={
            model.editingCategory ? model.updateCategory : model.addCategory
          }
        />
        {model.editingCategory && (
          <Action title={t('cancel')} onPress={model.cancelEditing} />
        )}
      </Section>
      <Section>
        <Field
          label={t('categorySearch')}
          value={model.query}
          onChangeText={model.setQuery}
        />
      </Section>
      {model.loading ? (
        <Loading />
      ) : (
        <Section>
          {model.categories.map(category => (
            <View key={category.id} style={styles.item}>
              <Label style={styles.name}>
                {categoryLabel(category, t)}
                {!category.active ? ` · ${t('categoryDeletedStatus')}` : ''}
              </Label>
              {category.active && (
                <View style={styles.actions}>
                  <Action
                    title={t('editCategory')}
                    onPress={() => model.startEditing(category)}
                  />
                  <Action
                    title={t('deleteCategory')}
                    danger
                    onPress={() => remove(category)}
                  />
                </View>
              )}
            </View>
          ))}
          {!model.categories.length && <Label>{t('noCategoriesFound')}</Label>}
        </Section>
      )}
    </Page>
  );
}
const styles = StyleSheet.create({
  item: { paddingHorizontal: 12, paddingVertical: 6 },
  name: { paddingTop: 6 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
});
