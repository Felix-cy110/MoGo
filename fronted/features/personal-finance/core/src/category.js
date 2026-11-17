import { resolveApiErrorMessageKey } from './messages.js';

export const validateCategoryDraft = ({ name }) => (!name?.trim() ? 'categoryNameRequired' : null);

export const buildCategoryPayload = ({ name }) => ({
  name: name.trim()
});

export const isOtherCategory = (category) => category?.code === 'OTHER'
  || category?.categoryCode === 'OTHER'
  || category?.i18nKey === 'category.other';

export const buildCategoryErrorFeedback = (code, operation) => {
  let key = resolveApiErrorMessageKey(code);
  if (code === 'CATEGORY_PROTECTED') {
    key = operation === 'delete' ? 'categoryDeleteForbidden' : 'categoryEditForbidden';
  }
  return {
    type: 'error',
    key,
    presentation: code === 'CATEGORY_PROTECTED' || code === 'CATEGORY_NAME_EXISTS' ? 'dialog' : 'inline'
  };
};

// 分类实体和汇总项共用置底规则，不依赖可编辑名称或当前语言。
export const sortCategoriesOtherLast = (categories) => {
  const regular = [];
  const other = [];
  for (const category of categories) {
    (isOtherCategory(category) ? other : regular).push(category);
  }
  return [...regular, ...other];
};
