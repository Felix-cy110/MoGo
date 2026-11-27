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
  const scale = 10n ** BigInt(fractionDigits);
  const retained = fraction.slice(0, fractionDigits).padEnd(fractionDigits, '0');
  const shouldRoundUp = Number(fraction[fractionDigits] ?? 0) >= 5;
  const scaled = BigInt(integer) * scale + BigInt(retained || 0) + BigInt(shouldRoundUp);
  const roundedInteger = scaled / scale;
  const roundedFraction = (scaled % scale).toString().padStart(fractionDigits, '0');
  return fractionDigits > 0
    ? `${roundedInteger}.${roundedFraction}`
    : roundedInteger.toString();
};

const roundToSignificantDigits = (value, significantDigits) => {
  const exponentOf = decimal => {
    const [integer, fraction = ''] = decimal.split('.');
    const normalizedInteger = integer.replace(/^0+(?=\d)/, '');
    if (normalizedInteger !== '0') return normalizedInteger.length - 1;
    const firstFractionDigit = fraction.search(/[1-9]/);
    return firstFractionDigit === -1 ? null : -(firstFractionDigit + 1);
  };

  const exponent = exponentOf(value);
  if (exponent == null) return '0';
  const fractionDigits = significantDigits - exponent - 1;
  let rounded;
  if (fractionDigits >= 0) {
    rounded = roundToFractionDigits(value, fractionDigits);
  } else {
    const [integer] = value.split('.');
    const factor = 10n ** BigInt(-fractionDigits);
    const whole = BigInt(integer);
    const quotient = whole / factor;
    const remainder = whole % factor;
    rounded = (
      (quotient + (remainder * 2n >= factor ? 1n : 0n)) * factor
    ).toString();
  }

  const roundedExponent = exponentOf(rounded);
  const displayFractionDigits = Math.max(
    0,
    significantDigits - roundedExponent - 1,
  );
  if (displayFractionDigits === 0) return rounded.split('.')[0];

  const [roundedInteger, roundedFraction = ''] = rounded.split('.');
  return `${roundedInteger}.${roundedFraction
    .slice(0, displayFractionDigits)
    .padEnd(displayFractionDigits, '0')}`;
};

// Quantities are rounded only for display; persisted values and calculations retain full precision.
export const formatInvestmentQuantity = (value, language) => {
  if (value == null) return '—';
  return formatInvestmentDecimal(roundToSignificantDigits(value, 2), language);
};
export const formatInvestmentTime = (value, language) => new Intl.DateTimeFormat(language, {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
}).format(new Date(value));
export const filterInvestmentTargets = (items, query) => {
  const search = query.trim().toLocaleLowerCase();
  return items.filter(({ target }) => `${target.name} ${target.symbol}`.toLocaleLowerCase().includes(search));
};
