import React, { useMemo } from 'react';
import {
  InvestmentMarketProvider,
  useInvestmentMarketTargets,
} from '@mogo/investment-management-react';
import { investmentApi } from './investmentApi';
import { useMarketPrices } from './useMarketPrices';

export function ApplicationInvestmentMarketProvider({
  children,
  api = investmentApi,
  marketClient,
}) {
  const { targets, refreshTargets } = useInvestmentMarketTargets({
    api,
    enabled: true,
  });
  const prices = useMarketPrices(targets, marketClient);
  const value = useMemo(
    () => ({ prices, refreshTargets }),
    [prices, refreshTargets],
  );

  return (
    <InvestmentMarketProvider value={value}>
      {children}
    </InvestmentMarketProvider>
  );
}
