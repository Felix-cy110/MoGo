import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useInvestmentTargets } from '@mogo/investment-management-react';
import { Action, Label, Loading, Page } from '../components/Primitives';
import useFeedback from '../components/useFeedback';
import { usePreferences } from '../platform/PreferencesProvider';
import InvestmentSummary from './investment-management/InvestmentSummary';
import InvestmentEditor from './investment-management/InvestmentEditor';
import InvestmentMarketPrice from './investment-management/InvestmentMarketPrice';
import useMarketPrices from './investment-management/useMarketPrices';
export default function InvestmentManagementScreen({ api, navigate, marketClient }) {
  const { t } = useTranslation();
  const { colors } = usePreferences();
  const model = useInvestmentTargets({ api });
  const prices = useMarketPrices(model.items.map(item => item.target), marketClient);
  const [adding, setAdding] = useState(false);
  const addButton = useRef(null);
  useFeedback(model.feedback, model.clearFeedback);
  return (
    <Page plain>
      <View style={styles.toolbar}>
        <TextInput
          accessibilityLabel={t('investmentSearch')}
          placeholder={t('investmentSearch')}
          placeholderTextColor={colors.muted}
          value={model.query}
          onChangeText={model.setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.search, { borderColor: colors.line, color: colors.text }]}
        />
        <Action
          ref={addButton}
          title={t('investmentAddTarget')}
          variant="secondary"
          style={[styles.addButton, { borderColor: colors.line }]}
          disabled={model.loading || Boolean(model.loadError)}
          onPress={() => setAdding(true)}
        />
      </View>
      {model.loading && <Loading />}
      {model.loadError && (
        <>
          <Label>{t(model.loadError)}</Label>
          <Action title={t('investmentRetry')} onPress={model.reload} />
        </>
      )}
      {!model.loading && !model.loadError && (
        <>
          {!model.items.length && (
            <Label muted style={styles.empty}>
              {t(
                model.query
                  ? 'investmentNoMatches'
                  : 'investmentEmpty',
              )}
            </Label>
          )}
          {model.items.map(({ target, summary }) => (
            <Pressable
              key={target.id}
              accessibilityRole="button"
              onPress={() => navigate('investmentTarget', target.id)}
              style={[styles.item, { borderColor: colors.line }]}
            >
              <Label style={styles.name}>
                {target.symbol}
                <InvestmentMarketPrice target={target} price={prices[target.symbol]} />
              </Label>
              <InvestmentSummary summary={summary} symbol={target.symbol} />
            </Pressable>
          ))}
        </>
      )}
      {adding && (
        <InvestmentEditor
          kind="target"
          saving={model.saving}
          onSave={model.save}
          onClose={() => setAdding(false)}
          returnFocusRef={addButton}
        />
      )}
    </Page>
  );
}
const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  search: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addButton: { flexShrink: 0, borderRadius: 4 },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  name: { fontWeight: '600' },
  empty: { paddingVertical: 16 },
});
