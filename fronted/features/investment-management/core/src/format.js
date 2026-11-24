export const formatInvestmentDecimal = (value, language) => {
  if (value == null) return '—';
  const [integer, fraction] = value.split('.');
  const whole = new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(BigInt(integer));
  if (!fraction) return whole;
  const separator = new Intl.NumberFormat(language).formatToParts(1.1).find(part => part.type === 'decimal').value;
  const digitFormatter = new Intl.NumberFormat(language, { useGrouping: false });
  return whole + separator + [...fraction].map(digit => digitFormatter.format(Number(digit))).join('');
};
export const formatInvestmentTime = (value, language) => new Intl.DateTimeFormat(language, {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
}).format(new Date(value));
export const filterInvestmentTargets = (items, query) => {
  const search = query.trim().toLocaleLowerCase();
  return items.filter(({ target }) => `${target.name} ${target.symbol}`.toLocaleLowerCase().includes(search));
};
