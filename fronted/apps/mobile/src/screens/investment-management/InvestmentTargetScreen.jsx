import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  useInvestmentDetail,
  useInvestmentMarket,
  useInvestmentMarketSnapshot,
} from '@mogo/investment-management-react';
import {
  formatInvestmentDecimal,
  formatInvestmentTime,
} from '@mogo/investment-management-core';
import { Action, Label, Loading, Page } from '../../components/Primitives';
import IconButton from '../../components/IconButton';
import useFeedback from '../../components/useFeedback';
import { usePreferences } from '../../platform/PreferencesProvider';
import InvestmentSummary from './InvestmentSummary';
import InvestmentEditor from './InvestmentEditor';
import InvestmentMarketPrice from './InvestmentMarketPrice';
import InvestmentProfitLoss from './InvestmentProfitLoss';
import useMarketPrices from './useMarketPrices';
export default function InvestmentTargetScreen({ api, targetId, marketClient, onBack }) {
  const { t, i18n } = useTranslation();
  const { colors } = usePreferences();
  const model = useInvestmentDetail({ api, targetId, marketClient });
  const [editor, setEditor] = useState(null);
  const addButton = useRef(null);
  const targetButton = useRef(null);
  useFeedback(model.feedback, model.clearFeedback);
  const data = model.data;
  const applicationMarket = useInvestmentMarket();
  const applicationPrices = useInvestmentMarketSnapshot(applicationMarket?.store);
  const localPrices = useMarketPrices(
    data ? [data.target] : [],
    marketClient,
    !applicationMarket,
  );
  const prices = applicationMarket ? applicationPrices : localPrices;
  const confirm = (key, action, afterDelete) =>
    Alert.alert(t(key), '', [
      { text: t('investmentCancel'), style: 'cancel' },
      {
        text: t('investmentConfirm'),
        onPress: async () => {
          if (await action()) {
            setEditor(null);
            afterDelete?.();
          }
        },
      },
    ]);
  const number = value => formatInvestmentDecimal(value, i18n.resolvedLanguage);
  const saveEditor = async draft => {
    const target = editor.kind === 'target';
    const saved = target
      ? await model.saveTarget(draft)
      : await model.saveTrade(draft, editor.value?.id);
    if (saved && target) await applicationMarket?.refreshTargets();
    return saved;
  };
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
        <View style={styles.content}>
          <View style={styles.marketSummary}>
            <View style={styles.marketQuote}>
              <View style={styles.marketPair}>
                <Pressable
                  ref={targetButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('investmentEditTarget')}
                  hitSlop={8}
                  onPress={() => setEditor({ kind: 'target', value: data.target })}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Label style={[styles.targetSymbol, { color: colors.accent }]}>
                    {data.target.symbol}
                  </Label>
                </Pressable>
              </View>
              <InvestmentMarketPrice
                target={data.target}
                price={prices[data.target.symbol]}
                prominent
              />
            </View>
            <InvestmentProfitLoss
              price={prices[data.target.symbol]}
              summary={data.summary}
              prominent
            />
          </View>
          <InvestmentSummary
            summary={data.summary}
            symbol={data.target.symbol}
            detail
          />
          {Boolean(data.target.note) && (
            <Label style={styles.hint}>{data.target.note}</Label>
          )}
          <View style={[styles.tradesHeader, { borderColor: colors.line }]}>
            <Label accessibilityRole="header" style={styles.title}>
              {t('investmentTrades')}
            </Label>
            <IconButton
              ref={addButton}
              icon="plus"
              label={t('investmentAddTrade')}
              color={colors.accent}
              onPress={() => setEditor({ kind: 'trade', openedAt: new Date() })}
            />
          </View>
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
        </View>
      )}
      {editor && (
        <InvestmentEditor
          key={`${editor.kind}-${editor.value?.id || 'new'}`}
          {...editor}
          symbolLocked={data?.symbolLocked}
          saving={model.saving}
          onClose={() => setEditor(null)}
          returnFocusRef={editor.kind === 'target' ? targetButton : addButton}
          onSave={saveEditor}
          onDelete={editor.value ? () => editor.kind === 'target'
            ? confirm('investmentDeleteTargetConfirm', async () => {
              const deleted = await model.deleteTarget();
              if (deleted) await applicationMarket?.refreshTargets();
              return deleted;
            }, onBack)
            : confirm('investmentDeleteConfirm', () => model.deleteTrade(editor.value.id))
            : undefined}
        />
      )}
    </Page>
  );
}
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  marketSummary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  marketQuote: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  marketPair: { flexDirection: 'row', alignItems: 'baseline' },
  targetSymbol: {
    fontSize: 18,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  title: { fontWeight: '600', fontSize: 16 },
  hint: { fontSize: 12, marginBottom: 12, textAlign: 'center' },
  tradesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pressed: { opacity: 0.65 },
  trade: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    gap: 8,
  },
  values: { flexDirection: 'row', gap: 12 },
  value: { width: '47%' },
  small: { fontSize: 12 },
});
