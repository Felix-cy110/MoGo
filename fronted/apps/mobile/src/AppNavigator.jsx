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
import FinanceScreen from './screens/personal-finance/FinanceScreen';
import CategoriesScreen from './screens/personal-finance/CategoriesScreen';
import AnalyticsScreen from './screens/personal-finance/AnalyticsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import LeetCodeScreen from './screens/LeetCodeScreen';

const titles = {
  home: 'toolboxName',
  finance: 'financeFeatureName',
  categories: 'manageCategories',
  analytics: 'expenseAnalysis',
  profile: 'userProfile',
  settings: 'settings',
  leetcode: 'leetcodeInterviewTitle',
};
// Missing native linkage is shown as a retryable error, never silently replaced with HTTP or demo data.
const nativeApis = createNativeApis(TurboModuleRegistry.get('NativeMoGo'));
export default function AppNavigator({ apis = nativeApis }) {
  const [stack, setStack] = useState(['home']);
  const [features, setFeatures] = useState(null);
  const [failed, setFailed] = useState(false);
  const { colors, mode, ready } = usePreferences();
  const { t } = useTranslation();
  const date = useLocalDay();
  const screen = stack[stack.length - 1];
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
  const navigate = name => setStack(current => [...current, name]);
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
        content = <SettingsScreen />;
        break;
      case 'leetcode':
        content = <LeetCodeScreen />;
        break;
      default:
        content = <HomeScreen features={features} navigate={navigate} />;
    }
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <View style={[styles.header, { borderColor: colors.line }]}>
        {stack.length > 1 && (
          <IconButton icon="back" label={t('back')} onPress={back} />
        )}
        <Label accessibilityRole="header" style={styles.title}>
          {t(titles[screen])}
        </Label>
        {screen === 'home' && (
          <>
            {features?.includes('user-profile') && (
              <IconButton
                icon="user"
                label={t('userProfile')}
                onPress={() => navigate('profile')}
              />
            )}
            <IconButton
              icon="settings"
              label={t('settings')}
              onPress={() => navigate('settings')}
            />
          </>
        )}
      </View>
      {content}
    </SafeAreaView>
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
});
