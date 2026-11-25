import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useNetInfoInstance } from '@react-native-community/netinfo';
import { createOkxMarketClient } from '@mogo/investment-management-core';
import { useInvestmentPrices } from '@mogo/investment-management-react';

const okxMarketClient = createOkxMarketClient({ createSocket: url => new WebSocket(url) });

// The OKX connection determines API availability; do not send separate probes to unrelated hosts.
const networkConfiguration = { reachabilityShouldRun: () => false };
export default function useMarketPrices(targets, client = okxMarketClient) {
  const [active, setActive] = useState(
    AppState.currentState == null || AppState.currentState === 'active',
  );
  const { netInfo } = useNetInfoInstance(!active, networkConfiguration);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  const enabled = active && netInfo.isConnected === true;
  return useInvestmentPrices({ targets, enabled, client });
}
