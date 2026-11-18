import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { defaultLanguage, financeMessages, supportedLanguages } from '@mogo/personal-finance-core';
import { profileMessages } from '@mogo/user-profile-core';
import { settingsMessages } from '@mogo/core-shared';

const STORAGE_KEY = 'mogo.language';
const storedLanguage = globalThis.localStorage?.getItem(STORAGE_KEY);
const initialLanguage = supportedLanguages.includes(storedLanguage) ? storedLanguage : defaultLanguage;

const resources = Object.fromEntries(
  Object.entries(financeMessages).map(([language, translation]) => [language, {
    translation: { ...translation, ...profileMessages[language], ...settingsMessages[language] }
  }])
);

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: defaultLanguage,
  supportedLngs: supportedLanguages,
  interpolation: { escapeValue: false }
});

i18n.on('languageChanged', (language) => {
  globalThis.localStorage?.setItem(STORAGE_KEY, language);
  if (globalThis.document) globalThis.document.documentElement.lang = language;
});

if (globalThis.document) globalThis.document.documentElement.lang = initialLanguage;

export default i18n;
