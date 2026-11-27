import React, { useMemo, useState } from 'react';
import {
  createInvestmentMarketStore,
  InvestmentMarketProvider,
  useInvestmentMarketTargets,
} from '@mogo/investment-management-react';
import { investmentApi } from './investmentApi';
import { useMarketPriceFeed } from './useMarketPrices';

export function ApplicationInvestmentMarketProvider({
  children,
  api = investmentApi,
  marketClient,
}) {
  const { targets, refreshTargets } = useInvestmentMarketTargets({
    api,
    enabled: true,
  });
  const [store] = useState(createInvestmentMarketStore);
  useMarketPriceFeed(targets, store, marketClient);
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
