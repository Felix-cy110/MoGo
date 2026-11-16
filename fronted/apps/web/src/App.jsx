import React, { useEffect, useState } from 'react';
import { FinanceScreen } from './features/personal-finance/FinanceScreen';
import { ToolboxHome } from './features/toolbox/ToolboxHome';

const HOME_PATH = '/';
const FINANCE_PATH = '/finance';

const resolveScreen = () => (globalThis.location?.pathname === FINANCE_PATH ? 'finance' : 'home');

function App() {
  const [screen, setScreen] = useState(resolveScreen);

  useEffect(() => {
    const handlePopState = () => setScreen(resolveScreen());
    globalThis.addEventListener?.('popstate', handlePopState);
    return () => globalThis.removeEventListener?.('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    globalThis.history?.pushState({}, '', path);
    setScreen(path === FINANCE_PATH ? 'finance' : 'home');
  };

  return screen === 'finance'
    ? <FinanceScreen onBack={() => navigate(HOME_PATH)} />
    : <ToolboxHome onOpenFinance={() => navigate(FINANCE_PATH)} />;
}

export default App;
