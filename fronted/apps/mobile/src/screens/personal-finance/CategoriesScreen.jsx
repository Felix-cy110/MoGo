import React, { useRef } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCategoryManagement } from '@mogo/personal-finance-react';
import {
  Action,
  Field,
  FormSheet,
  Label,
  Loading,
  Page,
  Section,
} from '../../components/Primitives';
import useFeedback from '../../components/useFeedback';
import { categoryLabel } from './categoryLabel';
import CategoryEditor from './CategoryEditor';
import { usePreferences } from '../../platform/PreferencesProvider';

export default function CategoriesScreen({ api }) {
  const model = useCategoryManagement({ api });
  const editTriggers = useRef(new Map());
  const editTrigger = useRef(null);
  const { t } = useTranslation();
  const { colors } = usePreferences();
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
    <Page plain>
      {!model.editingCategory && model.feedback?.presentation === 'inline' && (
        <Label accessibilityRole="alert">{t(model.feedback.key)}</Label>
      )}
      <Label muted style={styles.description}>
        {t('categoryManagementDescription')}
      </Label>
      <Section plain title={t('addCategory')}>
        <FormSheet>
          <Field
            label={t('categoryName')}
            value={model.form.name}
            placeholder={t('categoryNamePlaceholder')}
            maxLength={80}
            onChangeText={name => model.setForm({ name })}
            action={
              <Action
                compact
                title={t('addCategory')}
                onPress={model.addCategory}
              />
            }
          />
        </FormSheet>
      </Section>
      <TextInput
        accessibilityLabel={t('categorySearch')}
        placeholder={t('categorySearchPlaceholder')}
        placeholderTextColor={colors.muted}
        value={model.query}
        onChangeText={model.setQuery}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={[
          styles.search,
          { borderColor: colors.line, color: colors.text },
        ]}
      />
      {model.loading ? (
        <Loading />
      ) : (
        <View style={[styles.list, { borderColor: colors.line }]}>
          {!model.categories.length && (
            <Label muted style={styles.empty}>
              {t('noCategoriesFound')}
            </Label>
          )}
          {model.categories.map(category => (
            <View
              key={category.id}
              style={[styles.item, { borderColor: colors.line }]}
            >
              <View style={styles.name}>
                <Label>{categoryLabel(category, t)}</Label>
                <Label muted style={styles.status}>
                  {t(
                    category.active
                      ? 'categoryActive'
                      : 'categoryDeletedStatus',
                  )}
                </Label>
              </View>
              {category.active && (
                <View style={styles.actions}>
                  <Action
                    compact
                    title={t('editCategory')}
                    ref={node => {
                      if (node) editTriggers.current.set(category.id, node);
                      else editTriggers.current.delete(category.id);
                    }}
                    onPress={() => {
                      editTrigger.current = editTriggers.current.get(
                        category.id,
                      );
                      model.startEditing(category);
                    }}
                  />
                  <Action
                    compact
                    title={t('deleteCategory')}
                    danger
                    onPress={() => remove(category)}
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      <CategoryEditor model={model} returnFocusRef={editTrigger} />
    </Page>
  );
}
const styles = StyleSheet.create({
  description: { fontSize: 13, marginBottom: 24 },
  search: {
    borderWidth: 1,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  list: { borderTopWidth: StyleSheet.hairlineWidth },
  item: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1 },
  status: { fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12, maxWidth: '50%' },
  empty: { paddingVertical: 24 },
});
