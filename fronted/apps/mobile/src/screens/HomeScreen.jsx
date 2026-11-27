import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../platform/PreferencesProvider';
import ToolboxFeatureRow from './ToolboxFeatureRow';
import { getToolboxPalette } from './toolboxTheme';

export default function HomeScreen({ navigate, features }) {
  const { t } = useTranslation();
  const { mode } = usePreferences();
  const palette = getToolboxPalette(mode);
  const rows = [
    features.includes('personal-finance') && {
      key: 'finance',
      icon: 'finance',
      title: t('financeFeatureName'),
      description: t('financeFeatureDescription'),
      onPress: () => navigate('finance'),
    },
    {
      key: 'leetcode',
      icon: 'leetcode',
      title: t('leetcodeInterviewFeatureName'),
      description: t('leetcodeInterviewFeatureDescription'),
      onPress: () => navigate('leetcode'),
    },
    features.includes('investment-management') && {
      key: 'investment',
      icon: 'investment',
      title: t('investmentManagementFeatureName'),
      description: t('investmentManagementFeatureDescription'),
      onPress: () => navigate('investmentManagement'),
    },
  ].filter(Boolean);

  return (
    <ScrollView
      accessibilityLabel={t('toolboxFeatures')}
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
    >
      {rows.map(({ key, ...row }, index) => (
        <ToolboxFeatureRow key={key} {...row} first={index === 0} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 576,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
