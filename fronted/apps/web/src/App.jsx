import React, { useEffect, useState } from 'react';
import { FinanceScreen } from './features/personal-finance/FinanceScreen';
import { CategoryManagementScreen } from './features/personal-finance/CategoryManagementScreen';
import { AnalyticsScreen } from './features/personal-finance/AnalyticsScreen';
import { ToolboxHome } from './features/toolbox/ToolboxHome';
import { UserProfileScreen } from './features/user-profile/UserProfileScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { DataManagementScreen } from './features/settings/DataManagementScreen';
import { LeetCodeInterviewScreen } from './features/leetcode-interview/LeetCodeInterviewScreen';
import { InvestmentManagementScreen } from './features/investment-management/InvestmentManagementScreen';
import { InvestmentTargetScreen } from './features/investment-management/InvestmentTargetScreen';
import { useColorTheme } from './hooks/useColorTheme';

const HOME_PATH = '/';
const FINANCE_PATH = '/finance';
const CATEGORY_MANAGEMENT_PATH = '/finance/categories';
const ANALYTICS_PATH = '/finance/analytics';
const PROFILE_PATH = '/profile';
const SETTINGS_PATH = '/settings';
const DATA_MANAGEMENT_PATH = '/settings/data-management';
const LEETCODE_INTERVIEW_PATH = '/leetcode-interview';
const INVESTMENT_MANAGEMENT_PATH = '/investment-management';

const resolveScreen = path => {
  if (/^\/investment-management\/targets\/[1-9]\d*$/.test(path)) return 'investmentTarget';
  if (path === INVESTMENT_MANAGEMENT_PATH) return 'investmentManagement';
  if (path === DATA_MANAGEMENT_PATH) return 'dataManagement';
  if (path === SETTINGS_PATH) return 'settings';
  if (path === LEETCODE_INTERVIEW_PATH) return 'leetcodeInterview';
  if (path === PROFILE_PATH) return 'profile';
  if (path === CATEGORY_MANAGEMENT_PATH) return 'categories';
  if (path === ANALYTICS_PATH) return 'analytics';
  if (path === FINANCE_PATH) return 'finance';
  return 'home';
};

function App() {
  const { isDark, toggleTheme } = useColorTheme();
  const [path, setPath] = useState(() => globalThis.location?.pathname || HOME_PATH);
  const screen = resolveScreen(path);
  const [settingsReturnPath, setSettingsReturnPath] = useState(HOME_PATH);

  useEffect(() => {
    const handlePopState = () => setPath(globalThis.location?.pathname || HOME_PATH);
    globalThis.addEventListener?.('popstate', handlePopState);
    return () => globalThis.removeEventListener?.('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    globalThis.history?.pushState({}, '', path);
    setPath(path);
  };

  const openSettings = () => {
    setSettingsReturnPath(globalThis.location?.pathname || HOME_PATH);
    navigate(SETTINGS_PATH);
  };

  if (screen === 'dataManagement') {
    return <DataManagementScreen onBack={() => navigate(SETTINGS_PATH)} />;
  }

  if (screen === 'settings') {
    return <SettingsScreen isDark={isDark} onToggleTheme={toggleTheme} onOpenDataManagement={() => navigate(DATA_MANAGEMENT_PATH)} onBack={() => navigate(settingsReturnPath === SETTINGS_PATH ? HOME_PATH : settingsReturnPath)} />;
  }

  if (screen === 'profile') {
    return <UserProfileScreen onBack={() => navigate(HOME_PATH)} onOpenSettings={openSettings} />;
  }
  if (screen === 'investmentTarget') {
    const targetId = Number(path.split('/').at(-1));
    return <InvestmentTargetScreen key={targetId} targetId={targetId} onBack={() => navigate(INVESTMENT_MANAGEMENT_PATH)} onOpenSettings={openSettings} />;
  }
  if (screen === 'investmentManagement') {
    return <InvestmentManagementScreen onOpenTarget={id => navigate(`${INVESTMENT_MANAGEMENT_PATH}/targets/${id}`)} onBack={() => navigate(HOME_PATH)} onOpenSettings={openSettings} />;
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
