import { centsToYuan } from './money.js';

export const NOTE_POLICY = Object.freeze({
  OPTIONAL: 'OPTIONAL',
  REQUIRED: 'REQUIRED'
});

export const findCategory = (categories, categoryId) =>
  categories.find((category) => String(category.id) === String(categoryId));

export const validateExpenseDraft = ({ budgetSet, budgetRequired = true, amountCents, category, note }) => {
  if (budgetRequired && !budgetSet) return 'budgetMissing';
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

export { createClientRequestId } from '@mogo/core-shared';

export const createExpenseDraft = (expense) => ({
  amount: centsToYuan(expense?.amountCents || 0),
  categoryId: String(expense?.categoryId || ''),
  note: expense?.note || ''
});

export const buildExpenseUpdatePayload = ({ amountCents, categoryId, note }) => ({
  amountCents,
  categoryId: Number(categoryId),
  note: note?.trim() || null
});
