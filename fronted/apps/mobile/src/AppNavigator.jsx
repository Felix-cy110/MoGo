import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  StatusBar,
  StyleSheet,
  TurboModuleRegistry,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { createNativeApis } from './services/nativeApi';
import { usePreferences } from './platform/PreferencesProvider';
import useLocalDay from './platform/useLocalDay';
import IconButton from './components/IconButton';
import { Action, Label, Loading, Page } from './components/Primitives';
import HomeScreen from './screens/HomeScreen';
import { getToolboxPalette } from './screens/toolboxTheme';
import FinanceScreen from './screens/personal-finance/FinanceScreen';
import CategoriesScreen from './screens/personal-finance/CategoriesScreen';
import AnalyticsScreen from './screens/personal-finance/AnalyticsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import DataManagementScreen from './screens/settings/DataManagementScreen';
import LeetCodeScreen from './screens/LeetCodeScreen';
import InvestmentManagementScreen from './screens/InvestmentManagementScreen';
import InvestmentTargetScreen from './screens/investment-management/InvestmentTargetScreen';
import ApplicationInvestmentMarketProvider from './platform/ApplicationInvestmentMarketProvider';

const titles = {
  home: 'toolboxName',
  finance: 'financeFeatureName',
  categories: 'manageCategories',
  analytics: 'expenseAnalysis',
  profile: 'userProfile',
  settings: 'settings',
  dataManagement: 'dataManagement',
  leetcode: 'leetcodeInterviewTitle',
  investmentManagement: 'investmentManagementTitle',
  investmentTarget: 'investmentTargetDetail',
};
// Missing native linkage is shown as a retryable error, never silently replaced with HTTP or demo data.
const nativeApis = createNativeApis(TurboModuleRegistry.get('NativeMoGo'));
export default function AppNavigator({ apis = nativeApis, marketClient }) {
  const [stack, setStack] = useState(['home']);
  const [investmentTargetId, setInvestmentTargetId] = useState(null);
  const [features, setFeatures] = useState(null);
  const [failed, setFailed] = useState(false);
  const { colors, mode, ready } = usePreferences();
  const { t } = useTranslation();
  const date = useLocalDay();
  const investmentEnabled = features?.includes('investment-management') === true;
  const screen = stack[stack.length - 1];
  const homeScreen = screen === 'home';
  const toolboxPalette = getToolboxPalette(mode);
  const financeScreen = ['finance', 'categories', 'analytics'].includes(screen);
  const initialize = useCallback(async () => {
    setFailed(false);
    try {
      setFeatures((await apis.capabilities()).features);
    } catch {
      setFailed(true);
    }
  }, [apis]);
  useEffect(() => {
    initialize();
  }, [initialize]);
  const back = useCallback(
    () =>
      setStack(current =>
        current.length > 1 ? current.slice(0, -1) : current,
      ),
    [],
  );
  const navigate = (name, id) => {
    if (name === 'investmentTarget') setInvestmentTargetId(id);
    setStack(current => [...current, name]);
  };
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length === 1) return false;
      back();
      return true;
    });
    return () => listener.remove();
  }, [back, stack.length]);
  let content;
  if (failed)
    content = (
      <Page>
        <Label>{t('storageError')}</Label>
        <Action title={t('retry')} onPress={initialize} />
      </Page>
    );
  else if (!features || !ready) content = <Loading />;
  else
    switch (screen) {
      case 'finance':
        content = (
          <FinanceScreen
            key={date}
            date={date}
            api={apis.finance}
            navigate={navigate}
          />
        );
        break;
      case 'categories':
        content = <CategoriesScreen api={apis.finance} />;
        break;
      case 'analytics':
        content = <AnalyticsScreen key={date} api={apis.finance} />;
        break;
      case 'profile':
        content = <ProfileScreen api={apis.profile} />;
        break;
      case 'settings':
        content = <SettingsScreen navigate={navigate} />;
        break;
      case 'dataManagement':
        content = <DataManagementScreen api={apis.backup} />;
        break;
      case 'investmentManagement':
        content = (
          <InvestmentManagementScreen
            api={apis.investment}
            navigate={navigate}
          />
        );
        break;
      case 'investmentTarget':
        content = (
          <InvestmentTargetScreen
            key={investmentTargetId}
            api={apis.investment}
            targetId={investmentTargetId}
            onBack={back}
          />
        );
        break;
      case 'leetcode':
        content = <LeetCodeScreen />;
        break;
      default:
        content = <HomeScreen features={features} navigate={navigate} />;
    }
  return (
    <ApplicationInvestmentMarketProvider
      api={apis.investment}
      enabled={investmentEnabled}
      marketClient={marketClient}
    >
      <SafeAreaView
      style={[
        styles.root,
        {
          backgroundColor: homeScreen
            ? toolboxPalette.background
            : financeScreen
            ? colors.surface
            : colors.background,
        },
      ]}
    >
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <View
        style={[
          styles.header,
          homeScreen && styles.homeHeader,
          {
            backgroundColor: homeScreen
              ? toolboxPalette.background
              : undefined,
            borderColor: homeScreen ? toolboxPalette.line : colors.line,
          },
        ]}
      >
        {stack.length > 1 && (
          <IconButton icon="back" label={t('back')} onPress={back} />
        )}
        <Label
          accessibilityRole="header"
          style={[
            styles.title,
            homeScreen && styles.homeTitle,
            homeScreen && { color: toolboxPalette.text },
          ]}
        >
          {t(titles[screen])}
        </Label>
        <View
          style={[styles.headerActions, homeScreen && styles.homeHeaderActions]}
        >
          {screen !== 'profile' && features?.includes('user-profile') && (
            <IconButton
              backgroundColor={
                homeScreen ? toolboxPalette.controlBackground : undefined
              }
              borderColor={
                homeScreen ? toolboxPalette.controlBorder : undefined
              }
              color={homeScreen ? toolboxPalette.controlText : undefined}
              icon="user"
              label={t('userProfile')}
              onPress={() => navigate('profile')}
              outlined={homeScreen}
            />
          )}
          {(homeScreen ||
            financeScreen ||
            screen === 'investmentManagement' ||
            screen === 'investmentTarget') && (
            <IconButton
              backgroundColor={
                homeScreen ? toolboxPalette.controlBackground : undefined
              }
              borderColor={
                homeScreen ? toolboxPalette.controlBorder : undefined
              }
              color={homeScreen ? toolboxPalette.controlText : undefined}
              icon="settings"
              label={t('settings')}
              onPress={() => navigate('settings')}
              outlined={homeScreen}
            />
          )}
        </View>
      </View>
      {content}
    </SafeAreaView>
    </ApplicationInvestmentMarketProvider>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 48,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  homeHeader: {
    minHeight: 68,
    maxWidth: 576,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  homeTitle: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 20,
    lineHeight: 28,
  },
  homeHeaderActions: { gap: 12 },
});
