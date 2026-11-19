import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@mogo/personal-finance-core';
import { Label, Row, Section } from '../../components/Primitives';
import { categoryLabel } from './categoryLabel';
export default function CategoryTotals({ items = [] }) {
  const { t, i18n } = useTranslation();
  return (
    <Section title={t('categorySummary')}>
      {items.length ? (
        items.map(item => (
          <Row key={item.categoryId} label={categoryLabel(item, t)}>
            <Label>{formatMoney(item.amountCents, i18n.language)}</Label>
          </Row>
        ))
      ) : (
        <Row label={t('noCategoryData')} />
      )}
    </Section>
  );
}
