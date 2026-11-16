import { NOTE_POLICY } from './expense.js';

export const validateCategoryDraft = ({ name, notePolicy }) => {
  if (!name?.trim()) return 'categoryNameRequired';
  if (!Object.values(NOTE_POLICY).includes(notePolicy)) return 'invalidNotePolicy';
  return null;
};

export const buildCategoryPayload = ({ name, notePolicy }) => ({
  name: name.trim(),
  notePolicy
});
