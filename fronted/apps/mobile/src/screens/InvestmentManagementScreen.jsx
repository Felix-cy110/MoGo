import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useInvestmentTargets } from '@mogo/investment-management-react';
import { Action, Field, Label, Loading, Page } from '../components/Primitives';
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
      <View style={styles.actions}>
        {[false, true].map(archived => (
          <Action
            key={String(archived)}
            title={t(archived ? 'investmentArchived' : 'investmentActive')}
            disabled={model.saving}
            variant={model.archived === archived ? 'primary' : 'secondary'}
            onPress={() => model.setArchived(archived)}
          />
        ))}
        {!model.archived && (
          <Action
            ref={addButton}
            title={t('investmentAddTarget')}
            disabled={model.loading || Boolean(model.loadError)}
            onPress={() => setAdding(true)}
          />
        )}
      </View>
      <Field
        label={t('investmentSearch')}
        value={model.query}
        onChangeText={model.setQuery}
      />
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
                model.query || model.archived
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
                {target.name}{target.name !== target.symbol && <> <Label muted>{target.symbol}</Label></>}
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  name: { fontWeight: '600' },
  empty: { paddingVertical: 16 },
});
