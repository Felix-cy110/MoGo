import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { financeMessages } from '@mogo/personal-finance-core';
import { profileMessages } from '@mogo/user-profile-core';
import { leetcodeInterviewMessages } from '@mogo/leetcode-interview-core';
import { investmentManagementMessages } from '@mogo/investment-management-core';
import { settingsMessages } from '@mogo/core-shared';

const mobileMessages = {
  zh: {
    back: '返回',
    loading: '加载中',
    retry: '重试',
    close: '关闭',
    storageError: '无法打开本机数据，请检查存储空间后重试。原数据不会被清除。',
    preferencesError: '设置读取或保存失败，请重试。',
    lightTheme: '浅色',
    darkTheme: '深色',
    selection: '请选择',
    trendHint: '左右滑动查看每日花销',
  },
  en: {
    back: 'Back',
    loading: 'Loading',
    retry: 'Retry',
    close: 'Close',
    storageError:
      'Cannot open local data. Check available storage and retry. Existing data is not cleared.',
    preferencesError: 'Could not load or save preferences. Please retry.',
    lightTheme: 'Light',
    darkTheme: 'Dark',
    selection: 'Choose an option',
    trendHint: 'Slide to inspect daily spending',
  },
};
export const resources = Object.fromEntries(
  ['zh', 'en'].map(language => [
    language,
    {
      translation: {
        ...financeMessages[language],
        ...profileMessages[language],
        ...settingsMessages[language],
        ...leetcodeInterviewMessages[language],
        ...investmentManagementMessages[language],
        ...mobileMessages[language],
      },
    },
  ]),
);
i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
  initImmediate: false,
});
export default i18n;
