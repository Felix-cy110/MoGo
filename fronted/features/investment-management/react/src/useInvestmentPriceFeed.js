import { useEffect } from 'react';
import { investmentMarketSymbol } from '@mogo/investment-management-core';

export const useInvestmentPriceFeed = ({
  targets,
  enabled,
  client,
  store,
}) => {
  const pairs = targets.map(target => [target.symbol, investmentMarketSymbol(target)])
    .filter(([, marketSymbol]) => marketSymbol);
  const symbols = [...new Set(pairs.map(([, marketSymbol]) => marketSymbol))].sort().join(',');
  const signature = pairs.map(([targetSymbol, marketSymbol]) => `${targetSymbol}:${marketSymbol}`).sort().join(',');

  useEffect(() => {
    let active = true;
    store.setPrices({});
    if (!enabled || !symbols) return undefined;
    const unsubscribe = client.subscribe(symbols.split(','), prices => {
      if (!active) return;
      store.setPrices(Object.fromEntries(pairs
        .filter(([, marketSymbol]) => prices[marketSymbol])
        .map(([targetSymbol, marketSymbol]) => [targetSymbol, prices[marketSymbol]])));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [signature, symbols, enabled, client, store]);
};
