import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label, Page } from '../components/Primitives';

export default function InvestmentManagementScreen() {
  const { t } = useTranslation();
  return (
    <Page>
      <Label muted>{t('investmentManagementPlanning')}</Label>
    </Page>
  );
}
