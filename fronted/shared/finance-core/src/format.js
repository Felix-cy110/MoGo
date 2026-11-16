const LANGUAGE_LOCALES = Object.freeze({
  zh: 'zh-CN',
  en: 'en-US'
});

export const getLocale = (language = 'zh') => LANGUAGE_LOCALES[language] || LANGUAGE_LOCALES.zh;

export const formatMoney = (amountCents, language = 'zh') => new Intl.NumberFormat(getLocale(language), {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Number(amountCents || 0) / 100);

export const formatTime = (value, language = 'zh') => new Intl.DateTimeFormat(getLocale(language), {
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value));

export const formatDisplayDate = (value, language = 'zh') => {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(getLocale(language), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(year, month - 1, day));
};
