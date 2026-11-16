export const validateCategoryDraft = ({ name }) => (!name?.trim() ? 'categoryNameRequired' : null);

export const buildCategoryPayload = ({ name }) => ({
  name: name.trim()
});
