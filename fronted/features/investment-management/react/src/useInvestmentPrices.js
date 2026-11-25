import { useEffect, useState } from 'react';
import { investmentMarketSymbol } from '@mogo/investment-management-core';

export const useInvestmentPrices = ({ targets, enabled, client }) => {
  const symbols = [...new Set(targets.map(investmentMarketSymbol).filter(Boolean))].sort().join(',');
  const [state, setState] = useState({ symbols: '', client, prices: {} });
  useEffect(() => {
    let active = true;
    setState({ symbols, client, prices: {} });
    if (!enabled || !symbols) return;
    const unsubscribe = client.subscribe(symbols.split(','), prices => {
      if (active) setState({ symbols, client, prices });
    });
    return () => { active = false; unsubscribe(); };
  }, [symbols, enabled, client]);
  return enabled && state.symbols === symbols && state.client === client ? state.prices : {};
};
