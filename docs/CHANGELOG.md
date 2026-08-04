# Changelog

Milestone-level. Not a git log.

## M0 — Monorepo scaffold · 2026-08-04

Complete except the two checks that need hardware.

**Workspace.** pnpm 11 + Turborepo. `apps/mobile`, `packages/domain`,
`packages/tokens`. `pnpm check` runs typecheck, test and lint across all three.

**`packages/tokens`.** The full §5 palette, plus space, radius, type scale,
motion constants and layout rules as plain TS objects. Builds to CJS for
Tailwind; Metro and tsc read the source (D-002).

**`packages/domain`.** Pure TS, zod only, Vitest wired. Deliberately empty of
domain logic — that is M1. Purity is enforced two ways: an ESLint rule, and a
tsconfig with no DOM and no Node type libraries.

**Purity rule, verified rather than assumed.** A `no-restricted-imports` pattern
that matches nothing lints green and protects nothing, so it was checked against
a probe file: `node:fs`, `react`, `react-native` and the sibling
`@cricket/tokens` are all rejected; `zod` and relative imports pass; `fetch`,
`window`, `document` and `globalThis` are rejected as globals. The glob form the
rule was first written with (`['**', '!zod', '!./**']`) turned out to reject
`./index` as well — it now uses an explicit deny-regex. Re-verification recipe is
in the README.

**`apps/mobile`.** Expo SDK 57 / RN 0.86.2, expo-router, NativeWind 4.2.6 with
Tailwind 3.4.19 deriving its theme from `packages/tokens`, Reanimated 4.5.1,
Moti, gesture-handler, svg, MMKV, Zustand. Debug screen renders every raw and
semantic swatch, all three families at display/body/mono sizes, the size scale,
space, radius, the 44pt touch target and the motion constants.

**Bundle verified.** A full Android production export succeeds, and the compiled
bundle contains both the NativeWind-generated utility colours and the token
literals — so the Tailwind→tokens path and the direct-import path both work.

**Substitutions.** Archivo **Bold** for Archivo **Expanded** (D-004, resolves
OQ-001 — the expanded width is not obtainable through @expo-google-fonts and RN
cannot set a variable width axis). Reanimated **4** for Reanimated 3, because
that is what SDK 57 pins.

**Environment.** `registry.npmjs.org` is blocked on this machine by TLS SNI
hostname. `tools/registry-proxy.cjs` fronts npm's own mirror; `.npmrc` points at
it. Not a project decision — delete both on a normal network.

**Not done — needs hardware.**

1. Boot on a physical mid-range Android (Pixel 6a / Galaxy A54 class) and
   confirm 60fps and no Reanimated or bridge-serialisation warnings.
2. OQ-002: judge whether the hero score still carries the screen in Archivo Bold
   at normal width now that Expanded is off the table.

Do not start M1 until both pass.
