import React, { useMemo } from 'react';
import {
  InvestmentMarketProvider,
  useInvestmentMarketTargets,
} from '@mogo/investment-management-react';
import useMarketPrices from '../screens/investment-management/useMarketPrices';

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
  const prices = useMarketPrices(targets, marketClient, enabled);
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
