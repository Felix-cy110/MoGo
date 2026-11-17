import React, { useEffect, useState } from 'react';
import { FinanceScreen } from './features/personal-finance/FinanceScreen';
import { CategoryManagementScreen } from './features/personal-finance/CategoryManagementScreen';
import { AnalyticsScreen } from './features/personal-finance/AnalyticsScreen';
import { ToolboxHome } from './features/toolbox/ToolboxHome';

const HOME_PATH = '/';
const FINANCE_PATH = '/finance';
const CATEGORY_MANAGEMENT_PATH = '/finance/categories';
const ANALYTICS_PATH = '/finance/analytics';

const resolveScreen = () => {
  if (globalThis.location?.pathname === CATEGORY_MANAGEMENT_PATH) return 'categories';
  if (globalThis.location?.pathname === ANALYTICS_PATH) return 'analytics';
  if (globalThis.location?.pathname === FINANCE_PATH) return 'finance';
  return 'home';
};

function App() {
  const [screen, setScreen] = useState(resolveScreen);

  useEffect(() => {
    const handlePopState = () => setScreen(resolveScreen());
    globalThis.addEventListener?.('popstate', handlePopState);
    return () => globalThis.removeEventListener?.('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    globalThis.history?.pushState({}, '', path);
    if (path === CATEGORY_MANAGEMENT_PATH) setScreen('categories');
    else if (path === ANALYTICS_PATH) setScreen('analytics');
    else if (path === FINANCE_PATH) setScreen('finance');
    else setScreen('home');
  };

  if (screen === 'analytics') {
    return <AnalyticsScreen onBack={() => navigate(FINANCE_PATH)} />;
  }
  if (screen === 'categories') {
    return <CategoryManagementScreen onBack={() => navigate(FINANCE_PATH)} />;
  }
  if (screen === 'finance') {
    return (
      <FinanceScreen
        onBack={() => navigate(HOME_PATH)}
        onManageCategories={() => navigate(CATEGORY_MANAGEMENT_PATH)}
        onOpenAnalytics={() => navigate(ANALYTICS_PATH)}
      />
    );
  }
  return <ToolboxHome onOpenFinance={() => navigate(FINANCE_PATH)} />;
}

export default App;
