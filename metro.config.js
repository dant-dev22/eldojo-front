const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.resolve(__dirname, "./src"),
  path.resolve(__dirname, "./assets"),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "./node_modules"),
];

config.server = {
  ...(config.server || {}),
  enhanceMiddleware: (middleware) => middleware,
};

config.transformer = {
  ...(config.transformer || {}),
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

module.exports = config;
