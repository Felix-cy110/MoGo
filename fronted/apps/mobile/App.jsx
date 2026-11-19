import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/platform/i18n';
import { PreferencesProvider } from './src/platform/PreferencesProvider';
import AppNavigator from './src/AppNavigator';
export default function App() {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <AppNavigator />
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
