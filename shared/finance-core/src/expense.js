export const NOTE_POLICY = Object.freeze({
  OPTIONAL: 'OPTIONAL',
  REQUIRED: 'REQUIRED'
});

export const findCategory = (categories, categoryId) =>
  categories.find((category) => String(category.id) === String(categoryId));

export const validateExpenseDraft = ({ budgetSet, amountCents, category, note }) => {
  if (!budgetSet) return 'budgetMissing';
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 'invalidAmount';
  if (category?.notePolicy === NOTE_POLICY.REQUIRED && !note?.trim()) return 'noteRequired';
  return null;
};

export const buildExpensePayload = ({ date, amountCents, categoryId, note, clientRequestId }) => ({
  date,
  amountCents,
  categoryId: Number(categoryId),
  note: note?.trim() || null,
  clientRequestId
});

export const createClientRequestId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
