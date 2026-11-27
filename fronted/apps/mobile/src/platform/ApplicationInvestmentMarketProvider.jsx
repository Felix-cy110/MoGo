import React, { useMemo, useState } from 'react';
import {
  createInvestmentMarketStore,
  InvestmentMarketProvider,
  useInvestmentMarketTargets,
} from '@mogo/investment-management-react';
import { useMarketPriceFeed } from '../screens/investment-management/useMarketPrices';

export default function ApplicationInvestmentMarketProvider({
  api,
  children,
  enabled,
  marketClient,
}) {
  const { targets, refreshTargets } = useInvestmentMarketTargets({
    api,
    enabled,
  });
  const [store] = useState(createInvestmentMarketStore);
  useMarketPriceFeed(targets, store, marketClient, enabled);
  const value = useMemo(
    () => ({ store, refreshTargets }),
    [store, refreshTargets],
  );

  return (
    <InvestmentMarketProvider value={value}>
      {children}
    </InvestmentMarketProvider>
  );
}
