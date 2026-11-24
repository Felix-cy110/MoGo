import React from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialog } from '../../components/FormDialog';
export function InvestmentConfirm({ messageKey, busy, onConfirm, onClose }) {
  const { t } = useTranslation();
  return <FormDialog open title={t(messageKey)} onClose={onClose} busy={busy}>
    <div className="flex justify-end gap-2">
      <button className="button-secondary" disabled={busy} onClick={onClose} autoFocus>{t('investmentCancel')}</button>
      <button className="button-primary" disabled={busy} onClick={onConfirm}>{t('investmentConfirm')}</button>
    </div>
  </FormDialog>;
}
