/**
 * @cricket/domain — the ontology, geometry, rules engine, scenario model and
 * `getSuggestions` (BUILD.md §2).
 *
 * Pure TypeScript. Zero runtime dependencies beyond zod. No React, no DOM, no
 * React Native, no fetch, no side effects — enforced by the
 * `no-restricted-imports` rule in the root eslint.config.mjs and by this
 * package's tsconfig omitting the DOM and Node type libraries.
 *
 * This package is the whole reason two clients are affordable. Everything a
 * screen needs to *decide* something lives here; the apps only render.
 *
 * Populated by milestone:
 *   M1  src/ontology   positions, deliveries, phases, conditions, archetypes,
 *                      shots, relations
 *   M1  src/geometry   isInsideCircle (capsule), nearestCanonicalPosition,
 *                      worldToScreen, the LHB mirror
 *   M2  src/rules      Restriction[], evaluateField, legalActions
 *   M3  src/scenario   ScenarioState, encode/decode/hash/validate
 *   P1  src/suggest    getSuggestions(scenario) — the one interface that must
 *                      not leak (§1)
 */

/**
 * Every persisted shape in §9 carries this. Bump it only alongside a migration,
 * and never reuse a number — MMKV on a user's phone still holds the old one.
 */
export const DOMAIN_SCHEMA_VERSION = 1 as const;

export type DomainSchemaVersion = typeof DOMAIN_SCHEMA_VERSION;

export * from './ontology';
export * from './geometry';
export * from './rules';
export * from './scenario';
