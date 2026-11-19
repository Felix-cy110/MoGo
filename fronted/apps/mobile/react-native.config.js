const path = require('path');
module.exports = {
  // Resolve the workspace package before native tools calculate relative backend paths.
  dependencies: {
    '@mogo/native-core': { root: path.join(__dirname, 'native') },
  },
};
