import { useEffect, useState } from 'react';
import { investmentMarketSymbol } from '@mogo/investment-management-core';

export const useInvestmentPrices = ({ targets, enabled, client }) => {
  const pairs = targets.map(target => [target.symbol, investmentMarketSymbol(target)])
    .filter(([, marketSymbol]) => marketSymbol);
  const symbols = [...new Set(pairs.map(([, marketSymbol]) => marketSymbol))].sort().join(',');
  const signature = pairs.map(([targetSymbol, marketSymbol]) => `${targetSymbol}:${marketSymbol}`).sort().join(',');
  const [state, setState] = useState({ signature: '', client, prices: {} });
  useEffect(() => {
    let active = true;
    setState({ signature, client, prices: {} });
    if (!enabled || !symbols) return;
    const unsubscribe = client.subscribe(symbols.split(','), prices => {
      if (!active) return;
      const targetPrices = Object.fromEntries(pairs
        .filter(([, marketSymbol]) => prices[marketSymbol])
        .map(([targetSymbol, marketSymbol]) => [targetSymbol, prices[marketSymbol]]));
      setState({ signature, client, prices: targetPrices });
    });
    return () => { active = false; unsubscribe(); };
  }, [signature, symbols, enabled, client]);
  return enabled && state.signature === signature && state.client === client ? state.prices : {};
};
