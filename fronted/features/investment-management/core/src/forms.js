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
// datetime-local and the RN text editor use this machine format; display dates use Intl below.
export const localDateTimeInput = date => {
  const pad = number => String(number).padStart(2, '0');
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
export const createTradeDraft = (trade, now = new Date()) => ({
  unitPrice: trade?.unitPrice || '', quoteAmount: trade?.quoteAmount || '', note: trade?.note || '',
  localTime: localDateTimeInput(trade ? new Date(trade.occurredAt) : now).slice(0, 16),
  clientRequestId: trade?.clientRequestId || createClientRequestId(),
  originalOccurredAt: trade?.occurredAt,
  originalLocalTime: trade ? localDateTimeInput(new Date(trade.occurredAt)).slice(0, 16) : null
});
export const parseLocalTime = value => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getFullYear() < 1 || date.getFullYear() > 9999) return null;
  const normalized = value.length === 16 ? `${value}:00` : value;
  return localDateTimeInput(date) === normalized ? date : null;
};
export const validateTradeDraft = draft => {
  if (!validInvestmentDecimal(draft.unitPrice)) return 'investmentPriceInvalid';
  if (!validInvestmentDecimal(draft.quoteAmount)) return 'investmentAmountInvalid';
  if (!parseLocalTime(draft.localTime)) return 'investmentDateInvalid';
  if (!validText(draft.note, 1500)) return 'investmentTextInvalid';
  return null;
};
export const tradePayload = (draft, targetId) => ({
  targetId, side: 'BUY', unitPrice: normalizeInvestmentDecimal(draft.unitPrice),
  quoteAmount: normalizeInvestmentDecimal(draft.quoteAmount),
  occurredAt: draft.originalOccurredAt && draft.localTime === draft.originalLocalTime
    ? draft.originalOccurredAt : parseLocalTime(draft.localTime).toISOString(),
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
