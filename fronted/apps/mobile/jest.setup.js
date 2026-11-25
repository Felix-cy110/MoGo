jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('@react-native-community/netinfo', () => ({
  ...require('@react-native-community/netinfo/jest/netinfo-mock'),
  useNetInfoInstance: jest.fn(() => ({
    netInfo: { isConnected: false, isInternetReachable: false },
    refresh: jest.fn(),
  })),
}));
