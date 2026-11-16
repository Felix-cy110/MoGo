import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExpensePayload,
  centsToYuan,
  formatLocalDate,
  NOTE_POLICY,
  validateExpenseDraft,
  yuanToCents
} from '../src/index.js';

test('converts money without storing decimals', () => {
  assert.equal(yuanToCents('25.50'), 2550);
  assert.equal(centsToYuan(2550), '25.50');
});

test('formats local dates for API requests', () => {
  assert.equal(formatLocalDate(new Date(2026, 10, 16)), '2026-11-16');
});

test('enforces budget and required-note rules', () => {
  assert.equal(validateExpenseDraft({ budgetSet: false }), 'budgetMissing');
  assert.equal(validateExpenseDraft({ budgetSet: true, amountCents: 0 }), 'invalidAmount');
  assert.equal(validateExpenseDraft({
    budgetSet: true,
    amountCents: 100,
    category: { notePolicy: NOTE_POLICY.REQUIRED },
    note: '  '
  }), 'noteRequired');
  assert.equal(validateExpenseDraft({
    budgetSet: true,
    amountCents: 100,
    category: { notePolicy: NOTE_POLICY.OPTIONAL },
    note: ''
  }), null);
});

test('normalizes expense payloads', () => {
  assert.deepEqual(buildExpensePayload({
    date: '2026-11-16',
    amountCents: 1800,
    categoryId: '4',
    note: '  日用品  ',
    clientRequestId: 'request-1'
  }), {
    date: '2026-11-16',
    amountCents: 1800,
    categoryId: 4,
    note: '日用品',
    clientRequestId: 'request-1'
  });
});
