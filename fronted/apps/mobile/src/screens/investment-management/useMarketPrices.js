import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useNetInfoInstance } from '@react-native-community/netinfo';
import { createOkxMarketClient } from '@mogo/investment-management-core';
import {
  useInvestmentPriceFeed,
  useInvestmentPrices,
} from '@mogo/investment-management-react';

const okxMarketClient = createOkxMarketClient({ createSocket: url => new WebSocket(url) });

// The OKX connection determines API availability; do not send separate probes to unrelated hosts.
const networkConfiguration = { reachabilityShouldRun: () => false };
const useMarketAvailability = subscriptionEnabled => {
  const [active, setActive] = useState(
    AppState.currentState == null || AppState.currentState === 'active',
  );
  const { netInfo } = useNetInfoInstance(!active, networkConfiguration);
  useEffect(() => {
    if (!subscriptionEnabled) return undefined;
    const subscription = AppState.addEventListener('change', state => {
      setActive(state === 'active');
    });
    return () => subscription.remove();
  }, [subscriptionEnabled]);
  return subscriptionEnabled && active && netInfo.isConnected === true;
};

export function useMarketPriceFeed(
  targets,
  store,
  client = okxMarketClient,
  subscriptionEnabled = true,
) {
  const enabled = useMarketAvailability(subscriptionEnabled);
  useInvestmentPriceFeed({ targets, enabled, client, store });
}

export default function useMarketPrices(targets, client = okxMarketClient, subscriptionEnabled = true) {
  const enabled = useMarketAvailability(subscriptionEnabled);
  return useInvestmentPrices({ targets, enabled, client });
}
