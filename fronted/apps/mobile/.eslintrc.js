module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['__tests__/**/*.{js,jsx}', 'jest.setup.js'],
      env: { jest: true },
    },
  ],
};
