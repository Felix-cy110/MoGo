import { useEffect, useState } from 'react';
import { createOkxMarketClient } from '@mogo/investment-management-core';
import {
  useInvestmentPriceFeed,
  useInvestmentPrices,
} from '@mogo/investment-management-react';

const okxMarketClient = createOkxMarketClient({ createSocket: url => new WebSocket(url) });
const isAvailable = () => navigator.onLine && document.visibilityState !== 'hidden';
const useMarketAvailability = subscriptionEnabled => {
  const [enabled, setEnabled] = useState(isAvailable);
  useEffect(() => {
    if (!subscriptionEnabled) {
      setEnabled(false);
      return undefined;
    }
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
  }, [subscriptionEnabled]);
  return subscriptionEnabled && enabled;
};

export const useMarketPriceFeed = (
  targets,
  store,
  client = okxMarketClient,
  subscriptionEnabled = true,
) => {
  const enabled = useMarketAvailability(subscriptionEnabled);
  useInvestmentPriceFeed({ targets, enabled, client, store });
};

export const useMarketPrices = (targets, client = okxMarketClient, subscriptionEnabled = true) => {
  const enabled = useMarketAvailability(subscriptionEnabled);
  return useInvestmentPrices({ targets, enabled, client });
};
