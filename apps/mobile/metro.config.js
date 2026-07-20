const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo, not just apps/mobile, so changes in
// packages/shared trigger a reload.
config.watchFolders = [monorepoRoot];

// pnpm hoists less aggressively than npm/yarn — look in both node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// NOTE: expo/metro-config already enables symlink support and hierarchical
// node_modules lookup by default on this SDK — do not set
// resolver.unstable_enableSymlinks or resolver.disableHierarchicalLookup
// here. Forcing disableHierarchicalLookup: true broke resolution of
// transitive deps living inside pnpm's nested .pnpm/<pkg>/node_modules
// (e.g. @expo/metro-runtime's own dependency on whatwg-fetch) — confirmed
// via `npx expo-doctor` flagging both overrides, then via a failed
// `expo export` reproducing exactly that failure. Verified against
// https://docs.expo.dev/guides/monorepos/ at implementation time.

module.exports = config;
