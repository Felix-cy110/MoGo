import React from 'react';

export function LanguageSwitcher({ t, language, onToggle }) {
  const isChinese = language?.startsWith('zh');
  const targetLanguage = isChinese ? 'en' : 'zh';
  const label = t(isChinese ? 'switchToEnglish' : 'switchToChinese');

  return (
    <button
      className="language-switcher"
      type="button"
      onClick={() => onToggle(targetLanguage)}
      aria-label={label}
      title={label}
    >
      {t(isChinese ? 'languageEn' : 'languageZh')}
    </button>
  );
}
