# Decisions

Choices that a future reader would otherwise have to reverse-engineer, and every
substitution made against BUILD.md. A deviation that is written down is a
decision; one that is not is drift.

Format: what was decided, what it replaced, and *why* — the why is the only part
that is hard to recover later.

---

## D-001 · Expo SDK version is whatever `expo install` says, not what BUILD.md guessed

**Date.** 2026-08-04 · **Milestone.** M0

BUILD.md §3 names libraries but not versions. Native module versions in the
React Native ecosystem are only correct relative to a specific Expo SDK, so
pinning them by hand is how a scaffold rots.

**Decided.** Every native dependency is installed with `npx expo install`, which
resolves against the SDK's `bundledNativeModules.json`. Pure-JS dependencies
(zod, zustand, vitest, turbo, eslint) use caret ranges. No native version is
written into a `package.json` by hand.

---

## D-002 · `packages/tokens` builds to CJS; `packages/domain` does not build at all

**Date.** 2026-08-04 · **Milestone.** M0

`apps/mobile/tailwind.config.js` is executed by Node, which cannot `require()`
TypeScript. It needs the tokens as JavaScript.

**Decided.** `@cricket/tokens` keeps `src/index.ts` as the source of truth and
emits `dist/` via `tsc`. Its `package.json` points:

- `types` → `src/index.ts` (TypeScript always reads source, always fresh)
- `react-native` → `src/index.ts` (Metro reads source; editing a token needs no
  rebuild for the app)
- `main` → `dist/index.js` (Node build tools — i.e. Tailwind — read the build)

`@cricket/domain` has no build step at all: only bundlers and Vitest consume it,
and both read TypeScript natively.

**Consequence.** Changing a colour needs `pnpm build` before *Tailwind utility
classes* reflect it. Changing a colour used through the token object directly
needs nothing.

---

## D-003 · No `packages/ui`, restated

**Date.** 2026-08-04 · **Milestone.** M0

BUILD.md §2 already says this; recording it here because it is the decision most
likely to be "helpfully" undone by a future session. Cross-platform component
sharing produces components full of `Platform.select` that are worse on both
targets. The UI is written twice. The logic is written once, in
`packages/domain`.

---

## D-004 · Display type is Archivo **Bold**, not Archivo **Expanded**

**Date.** 2026-08-04 · **Milestone.** M0 · **Substitutes** BUILD.md §3, §5

BUILD.md §3 names Archivo Expanded for display type, and §5 builds the hero of
the HUD on it: *"`147/4` at 56pt in Archivo Expanded"*. §3 flagged this itself
with a `// VERIFY:` and asked for it to be settled at M0.

**Settled: the expanded width is not available to this app.**

- `@expo-google-fonts/archivo` ships 18 variants. All of them are weight and
  italic (100–900, roman and italic). There is no width axis and no expanded
  instance.
- `@expo-google-fonts/archivo-expanded` does not exist on the registry.
  (`archivo-narrow` does, which is a different family, not a wider one.)
- Archivo upstream *is* a variable font with a `wdth` axis, but React Native has
  no API for setting a variable font axis at runtime, so bundling the variable
  TTF would not help either.

**Decided.** `fontFamily.display` is `Archivo_700Bold` at normal width. The
`displayExpanded` token and the `font-display-expanded` Tailwind alias are
removed rather than left pointing at a face that silently never resolves — a
missing font name in React Native falls back to the system face without an
error, which is exactly the silent drift §3 wanted avoided.

**Consequence.** The hero score is narrower than the design intends. Whether
that still carries the screen is a judgement to make on the debug screen. If it
does not, the way back is OQ-002.

---

## D-005 · `expo install --check` runs as part of `pnpm check`

**Date.** 2026-08-04 · **Milestone.** M0

D-001 said "let `expo install` be the authority on native versions". It did not
hold, and the way it failed is worth writing down because nothing in the build
caught it.

`expo install` resolved `react-native-gesture-handler` to **3.1.0** when SDK 57
pins **~2.32.0** in `bundledNativeModules.json`. Gesture-handler v3's JS calls
`RNGestureHandlerModule.installUIRuntimeBindings()`, a native method that only
exists in v3. Expo Go's native side is fixed at 2.32.x, so the lookup returned
`undefined` and the call threw inside a `queueMicrotask` during gesture-handler
startup — before any UI rendered.

**Everything static passed.** Typecheck, lint, unit tests and a full production
`expo export` were all green, because the mismatch lives at the JS↔native
boundary, which only exists at runtime on a device. The only signal was one line
in the dev-server banner: *"4 other packages may need updating. Run npx expo
install --check"*. It reads like routine drift; one of the four was a major
version mismatch against Expo Go.

**Decided.** `expo install --check` is a first-class task in `turbo.json` and
part of `pnpm check`. Version skew against the SDK is now a check failure rather
than a line of advisory output nobody reads.

**Note for the future.** `expo install --fix` does not work in this workspace —
its internal `pnpm add` exits non-zero against the monorepo layout. Set the
ranges in `apps/mobile/package.json` by hand and reinstall. If pnpm's hoisted
linker then throws `ERR_PNPM_ENOENT ... _tmp_` mid-install, `node_modules` is
half-written: delete it and install clean rather than retrying in place.

---

## Substitutions against BUILD.md

| BUILD.md says | Shipped | Why |
|---|---|---|
| §3 Display font **Archivo Expanded** | Archivo Bold, normal width | Not obtainable — D-004 |
| §3 **Reanimated 3** + Moti | Reanimated **4.5.1** + Moti 0.30 | Expo SDK 57 pins Reanimated 4; installing 3 against RN 0.86 would mean fighting the SDK. Worklets still run on the UI thread — the property §5 actually depends on — but the plugin moved to `react-native-worklets/plugin` and the API has breaking changes vs. the v3 examples in §5. |
| §3 react-native-gesture-handler | **2.32.0**, not 3.x | What SDK 57 pins, and what Expo Go's native side implements. v3 crashes on launch in Expo Go — D-005. v2.32 is fully adequate for the M4 fielder drag. |
| §3 Tests: Vitest + Maestro | unchanged | — |
| §2 pnpm workspaces + Turborepo | unchanged | — |
