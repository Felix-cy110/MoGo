import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createTargetDraft, createTradeDraft, investmentTargetHintKey } from '@mogo/investment-management-core';
import { FormDialog } from '../../components/FormDialog';
import { FormFieldRow } from '../../components/FormFieldRow';
export function InvestmentEditor({ kind, value, symbolLocked = false, saving, onSave, onClose, onDelete }) {
  const { t } = useTranslation();
  const target = kind === 'target';
  const [draft, setDraft] = useState(() => target ? createTargetDraft(value) : createTradeDraft(value));
  const titleKey = target ? (value ? 'investmentEditTarget' : 'investmentAddTarget') : (value ? 'investmentEditTrade' : 'investmentAddTrade');
  const field = (name, key, props = {}) => (
    <FormFieldRow label={t(key)} htmlFor={`investment-${name}`} key={name}>
      <input id={`investment-${name}`} className="field form-row-field" type="text" value={draft[name]}
        onChange={event => setDraft(current => ({ ...current, [name]: event.target.value }))} disabled={saving} {...props} />
    </FormFieldRow>
  );
  return <FormDialog open title={t(titleKey)} onClose={onClose} busy={saving}>
    <form noValidate onSubmit={async event => { event.preventDefault(); if (await onSave(draft)) onClose(); }}>
      <div className="form-sheet">
        {target ? <>
          {field('name', 'investmentName', { autoFocus: true })}
          {field('symbol', 'investmentSymbol', { disabled: saving || symbolLocked, autoCapitalize: 'characters' })}
          <FormFieldRow label={t('investmentQuoteCurrency')}><span className="text-sm">USDT</span></FormFieldRow>
        </> : <>
          {field('unitPrice', 'investmentUnitPrice', { inputMode: 'decimal', autoFocus: true })}
          {field('quoteAmount', 'investmentQuoteAmount', { inputMode: 'decimal' })}
          {field('localTime', 'investmentOccurredAt', { type: 'datetime-local', step: '60' })}
        </>}
        {field('note', 'investmentNote')}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{t(target ? investmentTargetHintKey(value) : 'investmentCalculationNote')}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {onDelete && <button type="button" className="button-secondary mr-auto text-red-700 dark:text-red-300" disabled={saving} onClick={onDelete}>{t('investmentDeleteTrade')}</button>}
        <button type="button" className="button-secondary" disabled={saving} onClick={onClose}>{t('investmentCancel')}</button>
        <button className="button-primary" type="submit" disabled={saving}>{t(saving ? 'investmentSaving' : 'investmentSave')}</button>
      </div>
    </form>
  </FormDialog>;
}
