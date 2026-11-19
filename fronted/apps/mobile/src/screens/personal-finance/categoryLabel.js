import { resolveCategoryMessageKey } from '@mogo/personal-finance-core';
export const categoryLabel = (item, t) => {
  const key = resolveCategoryMessageKey({
    ...item,
    code: item.code || item.categoryCode,
  });
  return key ? t(key) : item.name || item.categoryName;
};
