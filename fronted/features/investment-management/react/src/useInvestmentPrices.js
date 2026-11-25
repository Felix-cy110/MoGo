import { useEffect, useState } from 'react';
import {
  investmentMarketSymbol, okxMarketClient,
  INVESTMENT_PRICE_REFRESH_MS, INVESTMENT_PRICE_MAX_AGE_MS,
} from '@mogo/investment-management-core';

export const useInvestmentPrices = ({ targets, enabled, client = okxMarketClient }) => {
  const symbols = [...new Set(targets.map(investmentMarketSymbol).filter(Boolean))].sort().join(',');
  const [state, setState] = useState({ symbols: '', client, prices: {} });
  useEffect(() => {
    const controller = new AbortController();
    const expiryTimers = new Map();
    let refreshTimer;
    setState({ symbols, client, prices: {} });
    if (!enabled || !symbols) return;
    const update = (symbol, quote) => {
      if (controller.signal.aborted) return;
      clearTimeout(expiryTimers.get(symbol));
      const remaining = quote ? quote.timestamp + INVESTMENT_PRICE_MAX_AGE_MS - Date.now() : 0;
      setState(previous => {
        const prices = { ...previous.prices };
        if (remaining > 0) prices[symbol] = quote.price;
        else delete prices[symbol];
        return { symbols, client, prices };
      });
      if (remaining > 0) expiryTimers.set(symbol, setTimeout(() => update(symbol, null), remaining));
    };
    const refresh = async () => {
      await Promise.all(symbols.split(',').map(async symbol => {
        try { update(symbol, await client.getPrice(symbol, { signal: controller.signal })); }
        catch { update(symbol, null); }
      }));
      // Schedule after completion so slow requests never overlap with another refresh.
      if (!controller.signal.aborted) refreshTimer = setTimeout(refresh, INVESTMENT_PRICE_REFRESH_MS);
    };
    refresh();
    return () => {
      controller.abort();
      clearTimeout(refreshTimer);
      expiryTimers.forEach(clearTimeout);
    };
  }, [symbols, enabled, client]);
  return enabled && state.symbols === symbols && state.client === client ? state.prices : {};
};
