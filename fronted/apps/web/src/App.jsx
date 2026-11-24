import React, { useEffect, useState } from 'react';
import { FinanceScreen } from './features/personal-finance/FinanceScreen';
import { CategoryManagementScreen } from './features/personal-finance/CategoryManagementScreen';
import { AnalyticsScreen } from './features/personal-finance/AnalyticsScreen';
import { ToolboxHome } from './features/toolbox/ToolboxHome';
import { UserProfileScreen } from './features/user-profile/UserProfileScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { LeetCodeInterviewScreen } from './features/leetcode-interview/LeetCodeInterviewScreen';
import { InvestmentManagementScreen } from './features/investment-management/InvestmentManagementScreen';

const HOME_PATH = '/';
const FINANCE_PATH = '/finance';
const CATEGORY_MANAGEMENT_PATH = '/finance/categories';
const ANALYTICS_PATH = '/finance/analytics';
const PROFILE_PATH = '/profile';
const SETTINGS_PATH = '/settings';
const LEETCODE_INTERVIEW_PATH = '/leetcode-interview';
const INVESTMENT_MANAGEMENT_PATH = '/investment-management';

const resolveScreen = () => {
  if (globalThis.location?.pathname === INVESTMENT_MANAGEMENT_PATH) return 'investmentManagement';
  if (globalThis.location?.pathname === SETTINGS_PATH) return 'settings';
  if (globalThis.location?.pathname === LEETCODE_INTERVIEW_PATH) return 'leetcodeInterview';
  if (globalThis.location?.pathname === PROFILE_PATH) return 'profile';
  if (globalThis.location?.pathname === CATEGORY_MANAGEMENT_PATH) return 'categories';
  if (globalThis.location?.pathname === ANALYTICS_PATH) return 'analytics';
  if (globalThis.location?.pathname === FINANCE_PATH) return 'finance';
  return 'home';
};

function App() {
  const [screen, setScreen] = useState(resolveScreen);
  const [settingsReturnPath, setSettingsReturnPath] = useState(HOME_PATH);

  useEffect(() => {
    const handlePopState = () => setScreen(resolveScreen());
    globalThis.addEventListener?.('popstate', handlePopState);
    return () => globalThis.removeEventListener?.('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    globalThis.history?.pushState({}, '', path);
    if (path === SETTINGS_PATH) setScreen('settings');
    else if (path === INVESTMENT_MANAGEMENT_PATH) setScreen('investmentManagement');
    else if (path === LEETCODE_INTERVIEW_PATH) setScreen('leetcodeInterview');
    else if (path === PROFILE_PATH) setScreen('profile');
    else if (path === CATEGORY_MANAGEMENT_PATH) setScreen('categories');
    else if (path === ANALYTICS_PATH) setScreen('analytics');
    else if (path === FINANCE_PATH) setScreen('finance');
    else setScreen('home');
  };

  const openSettings = () => {
    setSettingsReturnPath(globalThis.location?.pathname || HOME_PATH);
    navigate(SETTINGS_PATH);
  };

  if (screen === 'settings') {
    return <SettingsScreen onBack={() => navigate(settingsReturnPath === SETTINGS_PATH ? HOME_PATH : settingsReturnPath)} />;
  }

  if (screen === 'profile') {
    return <UserProfileScreen onBack={() => navigate(HOME_PATH)} onOpenSettings={openSettings} />;
  }
  if (screen === 'investmentManagement') {
    return <InvestmentManagementScreen onBack={() => navigate(HOME_PATH)} onOpenSettings={openSettings} />;
  }
  if (screen === 'leetcodeInterview') {
    return <LeetCodeInterviewScreen onBack={() => navigate(HOME_PATH)} onOpenSettings={openSettings} />;
  }
  if (screen === 'analytics') {
    return <AnalyticsScreen onBack={() => navigate(FINANCE_PATH)} onOpenSettings={openSettings} />;
  }
  if (screen === 'categories') {
    return <CategoryManagementScreen onBack={() => navigate(FINANCE_PATH)} onOpenSettings={openSettings} />;
  }
  if (screen === 'finance') {
    return (
      <FinanceScreen
        onBack={() => navigate(HOME_PATH)}
        onManageCategories={() => navigate(CATEGORY_MANAGEMENT_PATH)}
        onOpenAnalytics={() => navigate(ANALYTICS_PATH)}
        onOpenSettings={openSettings}
      />
    );
  }
  return <ToolboxHome onOpenFinance={() => navigate(FINANCE_PATH)} onOpenLeetCodeInterview={() => navigate(LEETCODE_INTERVIEW_PATH)} onOpenInvestmentManagement={() => navigate(INVESTMENT_MANAGEMENT_PATH)} onOpenProfile={() => navigate(PROFILE_PATH)} onOpenSettings={openSettings} />;
}

export default App;
