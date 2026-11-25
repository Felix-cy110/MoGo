import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  createTargetDraft,
  createTradeDraft,
  investmentTargetHintKey,
} from '@mogo/investment-management-core';
import FormDialog from '../../components/FormDialog';
import {
  Action,
  Field,
  FormSheet,
  Label,
  Row,
} from '../../components/Primitives';
export default function InvestmentEditor({
  kind,
  value,
  openedAt,
  symbolLocked = false,
  saving,
  onSave,
  onClose,
  onDelete,
  returnFocusRef,
}) {
  const { t } = useTranslation();
  const target = kind === 'target';
  const [draft, setDraft] = useState(() =>
    target ? createTargetDraft(value) : createTradeDraft(value, openedAt),
  );
  const title = target
    ? value
      ? 'investmentEditTarget'
      : 'investmentAddTarget'
    : value
    ? 'investmentEditTrade'
    : 'investmentAddTrade';
  const field = (name, key, props = {}) => (
    <Field
      key={name}
      label={t(key)}
      value={draft[name]}
      editable={!saving}
      onChangeText={text => setDraft(current => ({ ...current, [name]: text }))}
      {...props}
    />
  );
  return (
    <FormDialog
      visible
      title={t(title)}
      onClose={() => {
        if (!saving) onClose();
      }}
      returnFocusRef={returnFocusRef}
    >
      <FormSheet>
        {target ? (
          <>
            {field('name', 'investmentName', { autoFocus: true })}
            {field('symbol', 'investmentSymbol', {
              editable: !saving && !symbolLocked,
              autoCapitalize: 'characters',
            })}
            <Row label={t('investmentQuoteCurrency')}>
              <Label>USDT</Label>
            </Row>
          </>
        ) : (
          <>
            {field('unitPrice', 'investmentUnitPrice', {
              numeric: true,
              autoFocus: true,
            })}
            {field('quoteAmount', 'investmentQuoteAmount', { numeric: true })}
          </>
        )}
        {field('note', 'investmentNote')}
      </FormSheet>
      <Label muted style={styles.hint}>
        {t(target ? investmentTargetHintKey(value) : 'investmentCalculationNote')}
      </Label>
      <View style={styles.actions}>
        {onDelete && (
          <Action
            title={t('investmentDeleteTrade')}
            disabled={saving}
            danger
            onPress={onDelete}
          />
        )}
        <Action
          title={t('investmentCancel')}
          disabled={saving}
          onPress={onClose}
        />
        <Action
          title={t(saving ? 'investmentSaving' : 'investmentSave')}
          disabled={saving}
          variant="primary"
          onPress={async () => {
            if (await onSave(draft)) onClose();
          }}
        />
      </View>
    </FormDialog>
  );
}
const styles = StyleSheet.create({
  hint: { marginTop: 12, fontSize: 12 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
