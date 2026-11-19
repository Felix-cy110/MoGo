import React from 'react';
import { useTranslation } from 'react-i18next';
import { LinkRow, Page, Section } from '../components/Primitives';
export default function HomeScreen({ navigate, features }) {
  const { t } = useTranslation();
  return (
    <Page>
      <Section>
        {features.includes('personal-finance') && (
          <LinkRow
            title={t('financeFeatureName')}
            onPress={() => navigate('finance')}
          />
        )}
        <LinkRow
          title={t('leetcodeInterviewFeatureName')}
          onPress={() => navigate('leetcode')}
        />
      </Section>
    </Page>
  );
}
