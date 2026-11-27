import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './locales/i18n';
import App from './App';
import { ApplicationInvestmentMarketProvider } from './features/investment-management/ApplicationInvestmentMarketProvider';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ApplicationInvestmentMarketProvider>
        <App />
      </ApplicationInvestmentMarketProvider>
    </I18nextProvider>
  </React.StrictMode>
);
