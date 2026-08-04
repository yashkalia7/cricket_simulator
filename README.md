# Cricket Tactical Simulator

A decision gym for cricket. You are dropped into a precise match state — over,
score, wickets, conditions, who is on strike — you commit to a tactical
decision, and the app shows you the trade-offs you just accepted.

Not a scorer, not a stats browser, not a fantasy game. The unit of interaction
is a *decision under constraint*.

> **The build guide is the spec.** Read it before writing code in any session.
> It currently lives at [`ideation.txt`](ideation.txt) — the file identifies
> itself as `BUILD.md` and every reference in [`docs/`](docs/) uses that name.

## Layout

```
apps/
  mobile/       Expo (React Native) — PRIMARY, ships first
packages/
  domain/       Pure TypeScript. Zero runtime deps beyond zod. No platform. Ever.
  tokens/       Design tokens as plain TS objects.
docs/           OPEN_QUESTIONS · DECISIONS · CHANGELOG · WATCH_NOTES
tools/          registry-proxy.cjs — see Troubleshooting
```

There is deliberately **no `packages/ui`**. The UI is written twice; the logic
once. `packages/domain` is the whole reason two clients are affordable —
everything a screen needs in order to *decide* something lives there, and the
apps only render.

**Stack:** pnpm workspaces · Turborepo · TypeScript (strict) · Expo Router ·
NativeWind · Vitest · ESLint 9 flat config · Maestro (e2e).

## Running

Requires **Node ≥ 20.19.4** and **pnpm 11**.

```
pnpm install
pnpm check
pnpm mobile
```

`pnpm check` runs typecheck, test and lint across the workspace.

`pnpm mobile` builds `packages/tokens` before starting Metro — Tailwind runs in
Node and needs the compiled tokens. Don't call `expo start` directly unless
`packages/tokens/dist` already exists.

### Onto a phone

If you have no Android SDK, `adb` or JDK locally, there is no native build —
use **Expo Go**, which needs none of them:

1. Install *Expo Go* on an Android phone.
2. Put the phone on the same Wi-Fi as your machine.
3. `pnpm mobile`, then scan the QR code from the terminal.

Expo Go is version-locked to the SDK, and the Play Store only carries the client
for the newest SDK. If it says *"download the latest version of Expo Go"* and
the Play Store offers no update, sideload the matched client directly — for SDK
57 that is Expo Go **57.0.3**:

```
https://github.com/expo/expo-go-releases/releases/download/Expo-Go-57.0.3/Expo-Go-57.0.3.apk
```

The authoritative list of which client matches which SDK is
`https://api.expo.dev/v2/versions/latest` → `sdkVersions["57.0.0"].androidClientUrl`.
Do not trust the top-level `androidClientUrl` in that response; it is a stale
legacy field still pointing at Exponent 2.25.1.

Expo Go works for M0 because nothing here imports a module outside it —
`react-native-mmkv` is in `package.json` but not yet imported, so Metro never
bundles it.

**That stops being true at M4**, when presets persist to MMKV. From then on you
need a development build: either `npx expo run:android` (requires Android Studio
+ JDK 17) or `eas build --profile development --platform android` (cloud, needs
an Expo account). Neither is needed yet.

`pnpm e2e` (Maestro) also needs a real device or emulator plus a dev build.

## Where the rules are enforced

The constraints in BUILD.md are not honour-system — each one has a mechanical
owner:

| Rule (BUILD.md) | Enforced by |
|---|---|
| `packages/domain` imports nothing but relative paths and `zod` | `no-restricted-imports` in `eslint.config.mjs` |
| `packages/domain` touches no platform globals | `no-restricted-globals`, plus a tsconfig with no DOM and no Node types |
| `strict: true`, no `any`, no bare `@ts-expect-error` | `tsconfig.base.json` + ESLint |
| No domain vocabulary redeclared in components | `no-restricted-syntax` in `apps/mobile/eslint.config.js` |
| Every uncertain cricket fact is written down | `docs/OPEN_QUESTIONS.md` |

### Re-verifying the purity rule

The rule that keeps `packages/domain` portable is the one piece of config worth
distrusting — a `no-restricted-imports` pattern that matches nothing lints green
and protects nothing. To check it still bites, drop this in
`packages/domain/src/probe.ts`, run `pnpm --filter @cricket/domain lint`, then
delete it:

```ts
import { readFileSync } from 'node:fs';   // must error
import React from 'react';                 // must error
import { View } from 'react-native';       // must error
import { color } from '@cricket/tokens';   // must error — sibling packages too
import { z } from 'zod';                   // must be fine
import { DOMAIN_SCHEMA_VERSION } from './index';  // must be fine
export const x = [readFileSync, React, View, color, z, DOMAIN_SCHEMA_VERSION];
export const y = [typeof fetch, typeof window, typeof document];  // 3 more errors
```

Expect **exactly 7 errors**. Fewer means the rule has gone quiet.

## Milestones

`packages/domain` fills in by milestone:

| | Module | Contents |
|---|---|---|
| M1 | `src/ontology` | positions, deliveries, phases, conditions, archetypes, shots, relations |
| M1 | `src/geometry` | `isInsideCircle` (capsule), `nearestCanonicalPosition`, `worldToScreen`, the LHB mirror |
| M2 | `src/rules` | `Restriction[]`, `evaluateField`, `legalActions` |
| M3 | `src/scenario` | `ScenarioState`, encode/decode/hash/validate |
| P1 | `src/suggest` | `getSuggestions(scenario)` — the one interface that must not leak |

`DOMAIN_SCHEMA_VERSION` guards every persisted shape. Bump it only alongside a
migration, and never reuse a number — MMKV on a user's phone still holds the old
one.

## Status

**M0 — Monorepo scaffold.** `pnpm check` is green and a full Android production
bundle succeeds. Two things still need hardware before M1 starts:

1. Boot on a physical mid-range Android (Pixel 6a / Galaxy A54 class) — 60fps, no
   Reanimated or bridge-serialisation warnings.
2. `docs/OPEN_QUESTIONS.md` OQ-002 — Archivo **Expanded** turned out not to exist
   for React Native (OQ-001, resolved; substitution recorded as D-004), so judge
   on the device whether the hero score still carries the screen in Archivo Bold
   at normal width.

The debug screen at `/` exists to answer both. **Do not start M1 until they pass.**

## Troubleshooting

### `pnpm install` hangs or resets the connection

Some networks filter `registry.npmjs.org` by TLS SNI hostname rather than by IP
— plain HTTP to it returns 403 in ~18ms, while `registry.yarnpkg.com` resolves
into the *same* Cloudflare /16 and answers normally. Pointing pnpm straight at
the mirror is not enough: pnpm reads `dist.tarball` out of package metadata
verbatim, and that field is always an absolute `registry.npmjs.org` URL, so
metadata resolves but every tarball resets.

[`tools/registry-proxy.cjs`](tools/registry-proxy.cjs) fronts npm's own mirror
and rewrites those URLs. In one terminal:

```
node tools/registry-proxy.cjs
```

and install from a second. `.npmrc` already points pnpm at
`http://127.0.0.1:4873/`.

**On a normal network, delete the `registry=` line from `.npmrc`** and ignore
the proxy entirely — nothing else in the repo depends on it.

### `pnpm` treats your comment as a package name

On Windows `cmd.exe`, `#` is not a comment character. Write commands one per
line with no trailing `# note`, or pnpm will try to install the words.
