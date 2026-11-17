import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildCategoryPayload,
  buildCategoryErrorFeedback,
  findCategory,
  isOtherCategory,
  resolveApiErrorMessageKey,
  sortCategoriesOtherLast,
  validateCategoryDraft
} from '@mogo/personal-finance-core';

const EMPTY_FORM = Object.freeze({ name: '' });

export const useCategoryManagement = ({ api }) => {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const requestSequence = useRef(0);

  const checkCategoryMutable = useCallback((category, operation) => {
    if (!isOtherCategory(category)) return true;
    setFeedback(buildCategoryErrorFeedback('CATEGORY_PROTECTED', operation));
    return false;
  }, []);

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const items = await api.searchCategories(query);
      if (requestId === requestSequence.current) setCategories(sortCategoriesOtherLast(items));
      return true;
    } catch (error) {
      if (requestId === requestSequence.current) {
        setFeedback({ type: 'error', key: resolveApiErrorMessageKey(error.code) });
      }
      return false;
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [api, query]);

  useEffect(() => {
    // 输入搜索词时稍作等待，避免 Web 和未来手机端为每个按键都发起查询。
    const requestId = ++requestSequence.current;
    setLoading(true);
    const timer = setTimeout(() => {
      api.searchCategories(query)
        .then((items) => {
          if (requestId === requestSequence.current) setCategories(sortCategoriesOtherLast(items));
        })
        .catch((error) => {
          if (requestId === requestSequence.current) {
            setFeedback({ type: 'error', key: resolveApiErrorMessageKey(error.code) });
          }
        })
        .finally(() => {
          if (requestId === requestSequence.current) setLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [api, query]);

  const addCategory = useCallback(async () => {
    setFeedback(null);
    const validationKey = validateCategoryDraft(form);
    if (validationKey) {
      setFeedback({ type: 'error', key: validationKey });
      return false;
    }
    try {
      await api.addCategory(buildCategoryPayload(form));
      setForm(EMPTY_FORM);
      await refresh();
      setFeedback({ type: 'success', key: 'categoryAdded' });
      return true;
    } catch (error) {
      setFeedback(buildCategoryErrorFeedback(error.code, 'add'));
      return false;
    }
  }, [api, form, refresh]);

  const startEditing = useCallback((category) => {
    if (!checkCategoryMutable(category, 'edit')) return;
    setFeedback(null);
    setEditingCategory(category);
    setEditForm({ name: category.name });
  }, [checkCategoryMutable]);

  const cancelEditing = useCallback(() => {
    setEditingCategory(null);
    setEditForm(EMPTY_FORM);
  }, []);

  const updateCategory = useCallback(async () => {
    if (!editingCategory) return false;
    if (!checkCategoryMutable(editingCategory, 'edit')) return false;
    setFeedback(null);
    const validationKey = validateCategoryDraft(editForm);
    if (validationKey) {
      setFeedback({ type: 'error', key: validationKey });
      return false;
    }
    try {
      await api.updateCategory(editingCategory.id, buildCategoryPayload(editForm));
      cancelEditing();
      await refresh();
      setFeedback({ type: 'success', key: 'categoryUpdated' });
      return true;
    } catch (error) {
      setFeedback(buildCategoryErrorFeedback(error.code, 'edit'));
      return false;
    }
  }, [api, cancelEditing, checkCategoryMutable, editForm, editingCategory, refresh]);

  const deleteCategory = useCallback(async (categoryId) => {
    if (!checkCategoryMutable(findCategory(categories, categoryId), 'delete')) return false;
    setFeedback(null);
    try {
      await api.deleteCategory(categoryId);
      if (editingCategory?.id === categoryId) cancelEditing();
      await refresh();
      setFeedback({ type: 'success', key: 'categoryDeleted' });
      return true;
    } catch (error) {
      setFeedback(buildCategoryErrorFeedback(error.code, 'delete'));
      return false;
    }
  }, [api, cancelEditing, categories, checkCategoryMutable, editingCategory?.id, refresh]);

  return {
    query,
    setQuery,
    categories,
    form,
    setForm,
    editingCategory,
    editForm,
    setEditForm,
    loading,
    feedback,
    dismissFeedback: () => setFeedback(null),
    checkCategoryMutable,
    addCategory,
    startEditing,
    cancelEditing,
    updateCategory,
    deleteCategory
  };
};
