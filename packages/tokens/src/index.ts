/**
 * Design tokens — plain TypeScript objects (BUILD.md §2).
 *
 * Not a Tailwind config, not a StyleSheet. Both apps derive their styling from
 * this file, so a colour changes in exactly one place.
 *
 * Consumers:
 *   - apps/mobile  → tailwind.config.js (NativeWind) reads `dist/`, components read source
 *   - apps/web     → tailwind.config.ts (later, M7)
 */

/* ------------------------------------------------------------------------- */
/* Colour — "a night match" (§5)                                             */
/* ------------------------------------------------------------------------- */

/**
 * The raw palette. Nine values, and that is the whole palette — if a screen
 * needs a tenth, the screen is wrong before the palette is.
 *
 * `leather` appears at most twice per screen: the ball, and the primary action.
 * Everything else is ink and chalk.
 */
export const color = {
  /** screen ground, near-black with a cold cast */
  ink900: '#07090B',
  /** raised surface */
  ink800: '#0E1216',
  /** card */
  ink700: '#161C22',
  /** hairline / divider */
  ink500: '#2A3440',
  /** primary text, sightscreen white — never pure #FFF */
  chalk100: '#F2F4F3',
  /** secondary text */
  chalk400: '#8D9AA5',
  /** primary accent. Cricket-ball red, oxidised not vermilion. */
  leather: '#A32B2B',
  /** restriction violations, warnings, floodlight amber */
  sodium: '#E0A34A',
  /** legal / confirmed states, muted pitch green */
  turf: '#3E7A5E',
} as const;

/**
 * Semantic aliases. Components should reach for these, not for `color.ink700`,
 * so that the *role* is visible at the call site.
 */
export const semantic = {
  screen: color.ink900,
  surface: color.ink800,
  card: color.ink700,
  hairline: color.ink500,
  textPrimary: color.chalk100,
  textSecondary: color.chalk400,
  accent: color.leather,
  /** restriction violated — see §7. Never blocks the user, only informs. */
  warning: color.sodium,
  /** restriction satisfied */
  legal: color.turf,
} as const;

/* ------------------------------------------------------------------------- */
/* Space, radius (§2)                                                        */
/* ------------------------------------------------------------------------- */

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

/* ------------------------------------------------------------------------- */
/* Type (§5)                                                                 */
/* ------------------------------------------------------------------------- */

/**
 * Font family keys map to the names registered with `useFonts` in the mobile
 * app. Display is Archivo, body Inter Tight, data IBM Plex Mono.
 *
 * SUBSTITUTION (docs/DECISIONS.md D-004, resolves OPEN_QUESTIONS OQ-001):
 * BUILD.md §3 specifies **Archivo Expanded** for display. It is not shippable:
 * `@expo-google-fonts/archivo` exposes 18 variants that are all weight and
 * italic — there is no width axis and no expanded instance — and
 * `@expo-google-fonts/archivo-expanded` does not exist. React Native cannot set
 * a variable `wdth` axis at runtime either.
 *
 * So display is static Archivo Bold at normal width. This is the fallback §3
 * itself prescribes. Reopening it means bundling a hand-built expanded static
 * as a local asset — see OQ-002.
 */
export const fontFamily = {
  display: 'Archivo_700Bold',
  body: 'InterTight_400Regular',
  bodyMedium: 'InterTight_500Medium',
  bodySemiBold: 'InterTight_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

/**
 * `147/4` at 56pt is the hero of the HUD. Scores are typographic events, not
 * labels. (§5 calls for Archivo Expanded here; see the note on `fontFamily`.)
 */
export const fontSize = {
  hero: 56,
  h1: 32,
  h2: 24,
  h3: 20,
  body: 16,
  small: 14,
  caption: 12,
  micro: 11,
} as const;

export const lineHeight = {
  hero: 56,
  h1: 36,
  h2: 30,
  h3: 26,
  body: 24,
  small: 20,
  caption: 16,
  micro: 14,
} as const;

/** Archivo Expanded is already wide; display type gets negative tracking. */
export const letterSpacing = {
  hero: -1.5,
  display: -0.5,
  body: 0,
  /** small-caps-ish labels: 'REQUIRED RATE' */
  label: 1.2,
} as const;

/* ------------------------------------------------------------------------- */
/* Motion (§5)                                                               */
/* ------------------------------------------------------------------------- */

/**
 * One orchestrated moment per screen.
 *
 * Every one of these must be checked against
 * `AccessibilityInfo.isReduceMotionEnabled` before it runs (§4, item 3).
 */
export const motion = {
  /** Card entry. */
  cardEntry: {
    durationMs: 240,
    /** Easing.bezier(.16, 1, .3, 1) */
    bezier: [0.16, 1, 0.3, 1],
  },
  /**
   * Fielder drag. Must run on the UI thread via a Reanimated worklet — a drag
   * crossing the bridge per frame is the single most likely place this app
   * feels cheap (§5).
   */
  fielderDrag: {
    damping: 18,
    stiffness: 220,
  },
  /** Restriction violation: sodium flash, no bounce. */
  restrictionViolation: {
    durationMs: 120,
  },
} as const;

/* ------------------------------------------------------------------------- */
/* Layout (§5 mobile rules)                                                  */
/* ------------------------------------------------------------------------- */

export const layout = {
  /**
   * Minimum touch target. Fielder markers get an invisible hit area of this
   * size regardless of their visual size.
   */
  minTouchTarget: 44,
  /** The Over Tape shows the last twelve deliveries. */
  overTapeCells: 12,
  /** Hairlines are 1pt, not `StyleSheet.hairlineWidth` — consistency across densities. */
  hairlineWidth: 1,
} as const;

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

export type ColorToken = keyof typeof color;
export type SemanticToken = keyof typeof semantic;
export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type FontFamilyToken = keyof typeof fontFamily;
export type FontSizeToken = keyof typeof fontSize;
