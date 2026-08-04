module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    /*
     * The worklets Babel plugin is deliberately absent. `babel-preset-expo`
     * resolves and appends `react-native-worklets/plugin` itself when the
     * package is present — see babel-preset-expo/build/configs/expo.js, "//
     * Automatically add worklets or reanimated plugin when package is
     * installed." Listing it here as well applies it twice.
     *
     * Verified against babel-preset-expo 57.0.5 / react-native-worklets 0.10.3.
     * This matters more than it looks: without the plugin, `worklet` functions
     * silently run on the JS thread instead of the UI thread, and the fielder
     * drag in M4 is exactly the case §5 says will feel cheap if it crosses the
     * bridge per frame. If a future SDK stops auto-adding it, add it here and
     * record the change in docs/DECISIONS.md.
     */
  };
};
