import { useEffect, useState } from 'react';
import { createOkxMarketClient } from '@mogo/investment-management-core';
import { useInvestmentPrices } from '@mogo/investment-management-react';

const okxMarketClient = createOkxMarketClient({ createSocket: url => new WebSocket(url) });
const isAvailable = () => navigator.onLine && document.visibilityState !== 'hidden';
export const useMarketPrices = (targets, client = okxMarketClient) => {
  const [enabled, setEnabled] = useState(isAvailable);
  useEffect(() => {
    const update = () => setEnabled(isAvailable());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return useInvestmentPrices({ targets, enabled, client });
};
