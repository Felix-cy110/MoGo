import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { zhFinanceMessages } from '@mogo/finance-core';

const resources = {
  zh: { translation: zhFinanceMessages }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false }
});

export default i18n;
