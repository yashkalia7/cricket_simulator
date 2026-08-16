# Open questions

Every `// VERIFY:` in the codebase has an entry here. Nothing leaves this file by
being forgotten — it leaves by being checked against a source and moved to
`DECISIONS.md`.

**A wrong fielding restriction is a credibility-ending bug in this product.**
(BUILD.md §4)

| Status | Meaning |
|---|---|
| `OPEN` | Nobody has checked it |
| `CHECKING` | Someone is on it; name in the notes |
| `RESOLVED` | Checked against a named source; outcome recorded in `DECISIONS.md` |

---

## M0 — Toolchain

### OQ-001 · Archivo Expanded width axis on Android · `RESOLVED` 2026-08-04

**Question.** Does the expanded width axis of Archivo render on a mid-range
Android device?

**Answer: the question does not reach the device.** The expanded width is not
available to the app at all.

- `@expo-google-fonts/archivo` ships 18 variants, all weight and italic
  (100–900 roman + italic). No width axis, no expanded instance. Verified
  against the installed package's `index.js` and `metadata.json`.
- `@expo-google-fonts/archivo-expanded` is not a package on the registry.
- Archivo upstream is a variable font with a `wdth` axis, but React Native
  exposes no API for setting a variable axis at runtime.

**Resolution.** Took the fallback §3 prescribes: static Archivo Bold for
display, `displayExpanded` deleted rather than left dangling. Recorded as
`DECISIONS.md` D-004. Follow-on: OQ-002.

### OQ-002 · Does the hero score still work at normal width? · `OPEN`

**Question.** §5 builds the HUD's hero on `147/4` at 56pt in *expanded* type.
Shipped as Archivo Bold at normal width (D-004), does the score still read as a
typographic event rather than a label?

**Why it matters.** This is the element the product is meant to be recognisable
by, alongside the Over Tape. If normal-width Archivo makes it look like an
ordinary number, the design's centre of gravity has quietly moved.

**How to check.** The debug screen renders it at every step of the size scale.
Judge it on a physical device against the intent in §5, not in a simulator.

**If it does not hold.** The way back is bundling a hand-built static expanded
instance as a local asset: export a `wdth`-125 instance of the Archivo variable
font (fontTools `instancer`, or Google Fonts' own download UI), drop it in
`apps/mobile/assets/fonts/`, and register it in `lib/fonts.ts` alongside the
others. That is a real option, just not a free one — it adds a binary asset to
the repo and a licence file to track. Do not do it speculatively.

---

## M2 — Rules engine

Every restriction below ships with `verified: false` and must be checked against
the **current** ICC playing conditions before that flag is flipped. The values
are taken from BUILD.md §7, which explicitly says *do not assume these are
current*.

Playing conditions are re-issued; a value that was right in 2024 may not be
right now. Each entry needs a citation of the form
`ICC Men's T20I Playing Conditions, clause 28.x`, an `effectiveFrom` date, and
the date it was checked.

| ID | Rule as stated in §7 | Status | Citation to check |
|---|---|---|---|
| OQ-101 | All formats: max **2** fielders behind square on the leg side | `OPEN` | ICC playing conditions, fielding restrictions clause |
| OQ-102 | All formats: max **5** fielders on the leg side | `OPEN` | " |
| OQ-103 | T20: overs 1–6 max 2 outside the circle | `OPEN` | ICC Men's T20I PC |
| OQ-104 | T20: overs 7–20 max 5 outside the circle | `OPEN` | " |
| OQ-105 | ODI: overs 1–10 max 2 outside | `OPEN` | ICC Men's ODI PC |
| OQ-106 | ODI: overs 11–40 max 4 outside | `OPEN` | " |
| OQ-107 | ODI: overs 41–50 max 5 outside | `OPEN` | " |
| OQ-108 | Test / first-class: no circle restriction; both leg-side rules still apply | `OPEN` | ICC Test Match PC |
| OQ-109 | Free hit: field may not change unless the batters changed ends | `OPEN` | " |
| OQ-110 | Bowler and keeper excluded from all outside-circle counts | `OPEN` | " |

**Also open, and separate from the above:** whether the inner circle radius of
**27.43m** (30 yards) and the pitch length of **20.12m** (22 yards) are stated in
metres or yards in the current conditions, and which the app should round to.
The capsule construction — two semicircles centred on the *middle stump at each
end*, joined by lines parallel to the pitch, **not** a circle — is asserted in
§6 as "the most commonly wrong thing in cricket apps" and should be confirmed
against a diagram in the conditions rather than against another app.

---

## M1 — Ontology

### OQ-003 · §6's ring radii put ring positions outside the circle · `OPEN`

**Found by** the M3 preset test, which asserts every shipped scenario has a
legal field.

§6's anchor table places `point`, `backward_point`, `square_leg` and
`backward_square_leg` at **38m** from the striker's stumps. Squared off like
that, they sit **38m from the pitch axis** — well outside the 27.43m circle. So
a conventional "ring saving one" built from the §6 anchors is illegal in every
limited-overs phase.

`cover` (38m, 31.2m from axis) and `midwicket` (38m, 30.5m) are outside too.
`mid_off` and `mid_on` at 33m are *inside*, because at 25°/335° they lie close
to the pitch axis.

**Why it matters.** Either the radii describe deeper-than-ring placements and
the app needs separate in-ring anchors, or they are simply too deep. Until it is
settled, the preset fields use the `short_*` anchors for in-circle fielders,
which is defensible but is not what a coach would call a ring.

**How to check.** Put the M1 field diagram in front of a coach and ask where a
ring point saving one actually stands. Expect roughly 27–30m.

### OQ-111 · Super Over fielding restrictions · `OPEN`

Implemented as: a Super Over has **no powerplay**, and the limit is 5 outside
the circle. Without this, `over: 0` reads as a T20 powerplay and every
legitimate Super Over field is reported illegal.

**To check.** ICC playing conditions, Super Over appendix — confirm the limit is
the final-over allowance and that the leg-side rules apply unchanged.

---

## Product

### OQ-201 · Coach disagreement · `OPEN`

Five coaches, twenty scenarios, answered independently (§14). Determines whether
single-answer UI is ever defensible. Blocks any rating or Elo work.

### OQ-202 · Model vs. record · `OPEN`

Fifty held-out death-over deliveries, model suggestion vs. what elite bowlers
actually did (§14). Blocks the decision to build a data layer at all.
