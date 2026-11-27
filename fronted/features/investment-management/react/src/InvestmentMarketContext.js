import React, { createContext, useContext } from 'react';

const InvestmentMarketContext = createContext(null);

export const InvestmentMarketProvider = ({ children, value }) =>
  React.createElement(InvestmentMarketContext.Provider, { value }, children);

export const useInvestmentMarket = () => useContext(InvestmentMarketContext);
