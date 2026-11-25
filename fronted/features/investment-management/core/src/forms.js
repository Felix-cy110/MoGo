import { createClientRequestId } from '@mogo/core-shared';

const decimalPattern = /^\d{1,18}(?:\.\d{1,18})?$/;
export const validInvestmentDecimal = value => decimalPattern.test(value.trim()) && /[1-9]/.test(value);
export const normalizeInvestmentDecimal = value => {
  const [whole, fraction = ''] = value.trim().split('.');
  const integer = whole.replace(/^0+(?=\d)/, '');
  const decimals = fraction.replace(/0+$/, '');
  return decimals ? `${integer}.${decimals}` : integer;
};
export const createTargetDraft = (value = {}) => ({ name: value.name || '', symbol: value.symbol || '', note: value.note || '' });
const utf8Length = value => [...value].reduce((size, char) => {
  const code = char.codePointAt(0);
  if (code >= 0xd800 && code <= 0xdfff) return Infinity;
  return size + (code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4);
}, 0);
const validText = (value, maximum, required = false) => (!required || value.trim().length > 0) &&
  utf8Length(value.trim()) <= maximum && !/[\x00-\x1f\x7f]/.test(value.trim());
export const validateTargetDraft = draft => {
  if (!validText(draft.name, 240, true) || !validText(draft.note, 1500)) return 'investmentTextInvalid';
  if (!/^[A-Z0-9][A-Z0-9._-]{0,19}$/.test(draft.symbol.trim().toUpperCase())) return 'investmentSymbolInvalid';
  return null;
};
export const targetPayload = draft => ({ name: draft.name.trim(), symbol: draft.symbol.trim().toUpperCase(), quoteCurrency: 'USDT', note: draft.note.trim() });
// Capture the record action once; editing and retries must preserve the original instant.
export const createTradeDraft = (trade, now = new Date()) => ({
  unitPrice: trade?.unitPrice || '', quoteAmount: trade?.quoteAmount || '', note: trade?.note || '',
  occurredAt: trade ? trade.occurredAt : now.toISOString(),
  clientRequestId: trade?.clientRequestId || createClientRequestId()
});
export const validateTradeDraft = draft => {
  if (!validInvestmentDecimal(draft.unitPrice)) return 'investmentPriceInvalid';
  if (!validInvestmentDecimal(draft.quoteAmount)) return 'investmentAmountInvalid';
  const time = new Date(draft.occurredAt);
  if (!Number.isFinite(time.getTime()) || time.getUTCFullYear() < 1 || time.getUTCFullYear() > 9999 ||
      time.toISOString() !== draft.occurredAt) return 'investmentDateInvalid';
  if (!validText(draft.note, 1500)) return 'investmentTextInvalid';
  return null;
};
export const tradePayload = (draft, targetId) => ({
  targetId, side: 'BUY', unitPrice: normalizeInvestmentDecimal(draft.unitPrice),
  quoteAmount: normalizeInvestmentDecimal(draft.quoteAmount),
  occurredAt: draft.occurredAt,
  note: draft.note.trim(), clientRequestId: draft.clientRequestId
});
export const canArchiveInvestmentTarget = target => !target?.builtinCode;
export const investmentTargetHintKey = target => target?.builtinCode ? 'investmentBuiltinHint' : 'investmentSymbolHint';

const errorKeys = {
  INVESTMENT_BUILTIN_PROTECTED: 'investmentBuiltinProtected',
  INVESTMENT_DECIMAL_INVALID: 'investmentDecimalInvalid', INVESTMENT_TARGET_EXISTS: 'investmentTargetExists',
  INVESTMENT_TARGET_NOT_FOUND: 'investmentTargetMissing', INVESTMENT_TARGET_ARCHIVED: 'investmentTargetArchivedError',
  INVESTMENT_TRADE_NOT_FOUND: 'investmentTradeMissing', INVESTMENT_SYMBOL_LOCKED: 'investmentSymbolLocked',
  INVESTMENT_SYMBOL_INVALID: 'investmentSymbolInvalid', INVESTMENT_TEXT_INVALID: 'investmentTextInvalid',
  INVESTMENT_DATE_INVALID: 'investmentDateInvalid', INVESTMENT_REQUEST_CONFLICT: 'investmentRequestConflict',
  FEATURE_UNAVAILABLE: 'investmentUnavailable'
};
export const investmentErrorKey = code => errorKeys[code] || 'investmentSaveFailed';
