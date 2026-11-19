import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label, Page } from '../components/Primitives';
export default function LeetCodeScreen() {
  const { t } = useTranslation();
  return (
    <Page>
      <Label muted>{t('leetcodeInterviewPlanning')}</Label>
    </Page>
  );
}
