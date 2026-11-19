const path = require('path');
const reactRoot = path.dirname(require.resolve('react/package.json'));
module.exports = {
  preset: '@react-native/jest-preset',
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      { presets: ['module:@react-native/babel-preset'] },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react$': path.join(reactRoot, 'index.js'),
    '^react/(.*)$': path.join(reactRoot, '$1'),
  },
  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|@react-native-async-storage|react-native-svg|@mogo)/)',
  ],
};
