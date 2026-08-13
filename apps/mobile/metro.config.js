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

// Local .svg files import as React components (react-native-svg-transformer),
// backing NodeButtonBackground.tsx's bundled Kenney UI asset. SVG moves from
// Metro's default asset pipeline (assetExts, returns a source URI) to the
// source pipeline (sourceExts, runs through the babel transformer below) —
// standard react-native-svg-transformer wiring, see
// https://github.com/kristerkari/react-native-svg-transformer.
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

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
