import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useInvestmentDetail } from '@mogo/investment-management-react';
import {
  formatInvestmentDecimal,
  formatInvestmentTime,
} from '@mogo/investment-management-core';
import { Action, Label, Loading, Page } from '../../components/Primitives';
import useFeedback from '../../components/useFeedback';
import { usePreferences } from '../../platform/PreferencesProvider';
import InvestmentSummary from './InvestmentSummary';
import InvestmentEditor from './InvestmentEditor';
export default function InvestmentTargetScreen({ api, targetId }) {
  const { t, i18n } = useTranslation();
  const { colors } = usePreferences();
  const model = useInvestmentDetail({ api, targetId });
  const [editor, setEditor] = useState(null);
  const addButton = useRef(null);
  useFeedback(model.feedback, model.clearFeedback);
  const data = model.data;
  const confirm = (key, action) =>
    Alert.alert(t(key), '', [
      { text: t('investmentCancel'), style: 'cancel' },
      {
        text: t('investmentConfirm'),
        onPress: async () => {
          if (await action()) setEditor(null);
        },
      },
    ]);
  const number = value => formatInvestmentDecimal(value, i18n.resolvedLanguage);
  return (
    <Page plain>
      {model.loading && <Loading />}
      {model.loadError && (
        <>
          <Label>{t(model.loadError)}</Label>
          <Action title={t('investmentRetry')} onPress={model.reload} />
        </>
      )}
      {data && !model.loading && !model.loadError && (
        <>
          <Label accessibilityRole="header" style={styles.title}>
            {data.target.name}
          </Label>
          <Label muted>
            {data.target.symbol} / {data.target.quoteCurrency}
          </Label>
          <InvestmentSummary
            summary={data.summary}
            symbol={data.target.symbol}
          />
          <Label muted style={styles.hint}>
            {t('investmentCalculationNote')}
          </Label>
          {Boolean(data.target.note) && (
            <Label style={styles.hint}>{data.target.note}</Label>
          )}
          {data.target.archivedAt && (
            <Label style={styles.hint}>{t('investmentArchivedHint')}</Label>
          )}
          <View style={styles.actions}>
            {!data.target.archivedAt && (
              <>
                <Action
                  ref={addButton}
                  title={t('investmentAddTrade')}
                  variant="primary"
                  onPress={() => setEditor({ kind: 'trade' })}
                />
                <Action
                  title={t('investmentEditTarget')}
                  onPress={() =>
                    setEditor({ kind: 'target', value: data.target })
                  }
                />
              </>
            )}
            {model.canArchive && (
              <Action
                title={t(
                  data.target.archivedAt
                    ? 'investmentRestore'
                    : 'investmentArchive',
                )}
                disabled={model.saving}
                onPress={() =>
                  confirm(
                    data.target.archivedAt
                      ? 'investmentRestoreConfirm'
                      : 'investmentArchiveConfirm',
                    () => model.archive(!data.target.archivedAt),
                  )
                }
              />
            )}
          </View>
          <Label accessibilityRole="header" style={styles.title}>
            {t('investmentTrades')}
          </Label>
          {!data.trades.length && (
            <Label muted>{t('investmentNoTrades')}</Label>
          )}
          {data.trades.map(trade => (
            <Pressable
              key={trade.id}
              accessibilityRole="button"
              accessibilityLabel={t('investmentTradeRow', {
                date: formatInvestmentTime(
                  trade.occurredAt,
                  i18n.resolvedLanguage,
                ),
                amount: number(trade.quoteAmount),
                price: number(trade.unitPrice),
              })}
              disabled={Boolean(data.target.archivedAt)}
              onPress={() => setEditor({ kind: 'trade', value: trade })}
              style={[styles.trade, { borderColor: colors.line }]}
            >
              <Label muted>
                {formatInvestmentTime(trade.occurredAt, i18n.resolvedLanguage)}
              </Label>
              <View style={styles.values}>
                <View style={styles.value}>
                  <Label muted style={styles.small}>
                    {t('investmentQuoteAmount')}
                  </Label>
                  <Label>{number(trade.quoteAmount)}</Label>
                </View>
                <View style={styles.value}>
                  <Label muted style={styles.small}>
                    {t('investmentUnitPrice')}
                  </Label>
                  <Label>{number(trade.unitPrice)}</Label>
                </View>
              </View>
              {Boolean(trade.note) && <Label>{trade.note}</Label>}
            </Pressable>
          ))}
        </>
      )}
      {editor && (
        <InvestmentEditor
          key={`${editor.kind}-${editor.value?.id || 'new'}`}
          {...editor}
          symbolLocked={data?.symbolLocked}
          saving={model.saving}
          onClose={() => setEditor(null)}
          returnFocusRef={addButton}
          onSave={draft =>
            editor.kind === 'target'
              ? model.saveTarget(draft)
              : model.saveTrade(draft, editor.value?.id)
          }
          onDelete={
            editor.kind === 'trade' && editor.value
              ? () =>
                  confirm('investmentDeleteConfirm', () =>
                    model.deleteTrade(editor.value.id),
                  )
              : undefined
          }
        />
      )}
    </Page>
  );
}
const styles = StyleSheet.create({
  title: { fontWeight: '600', fontSize: 16, marginBottom: 8 },
  hint: { fontSize: 12, marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  trade: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    gap: 8,
  },
  values: { flexDirection: 'row', gap: 12 },
  value: { width: '47%' },
  small: { fontSize: 12 },
});
