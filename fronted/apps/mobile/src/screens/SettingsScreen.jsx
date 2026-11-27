import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../platform/PreferencesProvider';
import { LinkRow, Page, Section } from '../components/Primitives';
import ChoiceField from '../components/ChoiceField';
export default function SettingsScreen({ navigate = () => {} }) {
  const { t, i18n } = useTranslation();
  const { theme, update } = usePreferences();
  return (
    <Page>
      <Section>
        <ChoiceField
          label={t('language')}
          value={i18n.language}
          onChange={value => update('language', value)}
          options={[
            { value: 'zh', label: t('languageZh') },
            { value: 'en', label: t('languageEn') },
          ]}
        />
        <ChoiceField
          label={t('appearance')}
          value={theme}
          onChange={value => update('theme', value)}
          options={[
            { value: 'light', label: t('lightTheme') },
            { value: 'dark', label: t('darkTheme') },
          ]}
        />
      </Section>
      <Section>
        <LinkRow
          title={t('dataManagement')}
          onPress={() => navigate('dataManagement')}
        />
      </Section>
    </Page>
  );
}
