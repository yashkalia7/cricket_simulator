// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo so edits in packages/domain and packages/tokens
//    trigger a fast refresh instead of nothing at all.
config.watchFolders = [workspaceRoot];

// 2. Resolve from the app first, then the workspace root. With
//    `node-linker=hoisted` (see .npmrc) almost everything lands at the root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. `packages/*` ship TypeScript source rather than a build (see
//    docs/DECISIONS.md D-002). Metro transpiles it like any other source file,
//    so there is nothing else to configure — but the packages must not be
//    treated as opaque node_modules, which watchFolders above handles.

module.exports = withNativeWind(config, { input: './global.css' });
