const { getDefaultConfig } = require('expo/metro-config');

// Get the default Metro configuration from Expo
const config = getDefaultConfig(__dirname);

// Configure Metro for better performance and React Native compatibility
config.resolver.alias = {
  '@': './src',
};

// Add support for additional file extensions if needed
config.resolver.assetExts.push('db', 'sqlite', 'sqlite3');

// Transformer configuration for better performance
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

module.exports = config;