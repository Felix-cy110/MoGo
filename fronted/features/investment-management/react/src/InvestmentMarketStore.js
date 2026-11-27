import { useSyncExternalStore } from 'react';

const EMPTY_PRICES = Object.freeze({});
const emptySnapshot = () => EMPTY_PRICES;
const emptySubscribe = () => () => {};

const samePrices = (previous, next) => {
  const keys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  return keys.length === nextKeys.length &&
    keys.every(key => previous[key] === next[key]);
};

export const createInvestmentMarketStore = () => {
  let prices = EMPTY_PRICES;
  const listeners = new Set();

  return {
    getSnapshot: () => prices,
    setPrices(nextPrices) {
      const snapshot = Object.keys(nextPrices).length
        ? { ...nextPrices }
        : EMPTY_PRICES;
      if (samePrices(prices, snapshot)) return;
      prices = snapshot;
      listeners.forEach(listener => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const useInvestmentMarketSnapshot = store =>
  useSyncExternalStore(
    store?.subscribe ?? emptySubscribe,
    store?.getSnapshot ?? emptySnapshot,
    store?.getSnapshot ?? emptySnapshot,
  );
