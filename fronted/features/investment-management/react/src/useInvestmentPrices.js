import { useState } from 'react';
import {
  createInvestmentMarketStore,
  useInvestmentMarketSnapshot,
} from './InvestmentMarketStore.js';
import { useInvestmentPriceFeed } from './useInvestmentPriceFeed.js';

export const useInvestmentPrices = ({ targets, enabled, client }) => {
  const [store] = useState(createInvestmentMarketStore);
  useInvestmentPriceFeed({ targets, enabled, client, store });
  return useInvestmentMarketSnapshot(store);
};
