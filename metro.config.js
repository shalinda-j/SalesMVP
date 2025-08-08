const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support
  isCSSEnabled: true,
});

// mengatasi masalah unstable_path di web
config.resolver.unstable_serverRoot = '';

module.exports = config;
