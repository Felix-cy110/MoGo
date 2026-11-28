export const formatInvestmentDecimal = (value, language) => {
  if (value == null) return '—';
  const [integer, fraction] = String(value).split('.');
  const digitFormatter = new Intl.NumberFormat(language, { useGrouping: false });
  const localizeDigits = digits => [...digits].map(digit => digitFormatter.format(Number(digit))).join('');
  const sampleParts = new Intl.NumberFormat(language, { maximumFractionDigits: 0 })
    .formatToParts(1234567890123);
  const integerParts = sampleParts.filter(part => part.type === 'integer').map(part => part.value.length);
  const group = sampleParts.find(part => part.type === 'group')?.value;
  const primaryGroupSize = integerParts.at(-1) ?? integer.length;
  const secondaryGroupSize = integerParts.at(-2) ?? primaryGroupSize;
  const sign = integer.startsWith('-') ? '-' : '';
  let remaining = sign ? integer.slice(1) : integer;
  const groups = [];
  let groupSize = primaryGroupSize;
  while (remaining.length > groupSize && group) {
    groups.unshift(remaining.slice(-groupSize));
    remaining = remaining.slice(0, -groupSize);
    groupSize = secondaryGroupSize;
  }
  groups.unshift(remaining);
  const minusSign = sign
    ? new Intl.NumberFormat(language).formatToParts(-1).find(part => part.type === 'minusSign')?.value ?? '-'
    : '';
  const whole = minusSign + groups.map(localizeDigits).join(group ?? '');
  if (!fraction) return whole;
  const separator = new Intl.NumberFormat(language).formatToParts(1.1).find(part => part.type === 'decimal').value;
  return whole + separator + localizeDigits(fraction);
};

const roundToFractionDigits = (value, fractionDigits) => {
  const [integer, fraction = ''] = value.split('.');
  const negative = integer.startsWith('-');
  const magnitudeInteger = negative ? integer.slice(1) : integer;
  const scale = 10n ** BigInt(fractionDigits);
  const retained = fraction.slice(0, fractionDigits).padEnd(fractionDigits, '0');
  const shouldRoundUp = Number(fraction[fractionDigits] ?? 0) >= 5;
  const scaled = BigInt(magnitudeInteger) * scale
    + BigInt(retained || 0)
    + BigInt(shouldRoundUp);
  const roundedInteger = scaled / scale;
  const roundedFraction = (scaled % scale).toString().padStart(fractionDigits, '0');
  const sign = negative && scaled !== 0n ? '-' : '';
  return fractionDigits > 0
    ? `${sign}${roundedInteger}.${roundedFraction}`
    : `${sign}${roundedInteger}`;
};

const roundFractionToSignificantDigits = (value, significantDigits) => {
  const [, fraction = ''] = value.split('.');
  const firstSignificantDigit = fraction.search(/[1-9]/);
  if (firstSignificantDigit === -1) return value.split('.')[0];

  const rounded = roundToFractionDigits(
    value,
    firstSignificantDigit + significantDigits,
  );
  const [roundedInteger, roundedFraction = ''] = rounded.split('.');
  const roundedFirstSignificantDigit = roundedFraction.search(/[1-9]/);
  if (roundedFirstSignificantDigit === -1) return roundedInteger;

  const displayFractionDigits =
    roundedFirstSignificantDigit + significantDigits;
  return `${roundedInteger}.${roundedFraction
    .slice(0, displayFractionDigits)
    .padEnd(displayFractionDigits, '0')}`;
};

// Integer digits are preserved. Only the fractional part is rounded for display.
export const formatInvestmentFractionSignificantDigits = (
  value,
  language,
  significantDigits = 2,
) => {
  if (value == null) return '—';
  if (!Number.isInteger(significantDigits) || significantDigits < 1) {
    throw new RangeError('significantDigits must be a positive integer');
  }
  return formatInvestmentDecimal(
    roundFractionToSignificantDigits(value, significantDigits),
    language,
  );
};

export const formatInvestmentQuantity = (value, language) =>
  formatInvestmentFractionSignificantDigits(value, language, 2);
export const formatInvestmentTime = (value, language) => new Intl.DateTimeFormat(language, {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
}).format(new Date(value));
export const filterInvestmentTargets = (items, query) => {
  const search = query.trim().toLocaleLowerCase();
  return items.filter(({ target }) => `${target.name} ${target.symbol}`.toLocaleLowerCase().includes(search));
};
