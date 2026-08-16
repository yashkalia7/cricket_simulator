/**
 * NativeWind theme, derived entirely from `packages/tokens` (BUILD.md §2).
 *
 * Nothing in this file invents a value. If a colour or a step is missing from
 * the theme, add it to the token package — not here.
 *
 * This is Node, so it reads the *built* tokens (`dist/`), not the TypeScript
 * source. `pnpm start` in this workspace builds them first; see
 * docs/DECISIONS.md D-002.
 */

let tokens;
try {
  tokens = require('@cricket/tokens');
} catch (cause) {
  throw new Error(
    '@cricket/tokens has not been built. Tailwind runs in Node and cannot read ' +
      'TypeScript source. Run `pnpm --filter @cricket/tokens build` (or just ' +
      '`pnpm build` at the repo root) and start again.',
    { cause },
  );
}

const { color, semantic, space, radius, fontFamily, fontSize, lineHeight, letterSpacing, layout } =
  tokens;

/** Token numbers are points; Tailwind wants CSS lengths. */
const px = (n) => `${n}px`;
const mapPx = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, px(value)]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],

  /*
   * 'class', not the default 'media'.
   *
   * app.json pins `userInterfaceStyle: "dark"`, which makes Expo set the colour
   * scheme explicitly. NativeWind throws "Cannot manually set color scheme, as
   * dark mode is type 'media'" when that happens under the media strategy — a
   * full-screen error overlay, not a warning.
   *
   * This app is dark-first and uses no `dark:` variants at all (§5 — the palette
   * IS the dark palette), so the strategy only matters for silencing that clash.
   */
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...color,
        ...semantic,
      },
      spacing: mapPx(space),
      borderRadius: mapPx(radius),
      fontFamily: {
        display: [fontFamily.display],
        body: [fontFamily.body],
        'body-medium': [fontFamily.bodyMedium],
        'body-semibold': [fontFamily.bodySemiBold],
        mono: [fontFamily.mono],
        'mono-medium': [fontFamily.monoMedium],
      },
      fontSize: {
        hero: [px(fontSize.hero), { lineHeight: px(lineHeight.hero), letterSpacing: px(letterSpacing.hero) }],
        h1: [px(fontSize.h1), { lineHeight: px(lineHeight.h1), letterSpacing: px(letterSpacing.display) }],
        h2: [px(fontSize.h2), { lineHeight: px(lineHeight.h2), letterSpacing: px(letterSpacing.display) }],
        h3: [px(fontSize.h3), { lineHeight: px(lineHeight.h3) }],
        body: [px(fontSize.body), { lineHeight: px(lineHeight.body) }],
        small: [px(fontSize.small), { lineHeight: px(lineHeight.small) }],
        caption: [px(fontSize.caption), { lineHeight: px(lineHeight.caption) }],
        micro: [px(fontSize.micro), { lineHeight: px(lineHeight.micro) }],
      },
      letterSpacing: mapPx(letterSpacing),
      minWidth: { touch: px(layout.minTouchTarget) },
      minHeight: { touch: px(layout.minTouchTarget) },
      borderWidth: { hairline: px(layout.hairlineWidth) },
    },
  },
  plugins: [],
};
