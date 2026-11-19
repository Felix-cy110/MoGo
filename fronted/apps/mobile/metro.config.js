const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../..');
const mobileReact = path.dirname(
  require.resolve('react/package.json', { paths: [projectRoot] }),
);
module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [workspaceRoot],
  resolver: {
    // Shared Hooks must use RN's React 19, never the Web workspace's React 18.
    resolveRequest(context, moduleName, platform) {
      if (moduleName === 'react' || moduleName.startsWith('react/')) {
        const suffix =
          moduleName === 'react' ? 'index.js' : moduleName.slice(6);
        return context.resolveRequest(
          context,
          path.join(mobileReact, suffix),
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
    nodeModulesPaths: [
      path.join(projectRoot, 'node_modules'),
      path.join(workspaceRoot, 'node_modules'),
    ],
  },
});
