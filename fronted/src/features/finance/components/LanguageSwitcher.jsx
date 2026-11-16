import React from 'react';

export function LanguageSwitcher({ t, language, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <span className="sr-only">{t('language')}</span>
      <select
        className="border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
        value={language}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t('language')}
      >
        <option value="zh">{t('languageZh')}</option>
        <option value="en">{t('languageEn')}</option>
      </select>
    </label>
  );
}
