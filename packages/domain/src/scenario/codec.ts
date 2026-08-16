/**
 * Scenario validate / encode / decode / hash (BUILD.md §9, M3).
 *
 * Everything here is pure. No `btoa`, no `Buffer`, no `crypto` — those are
 * platform APIs and this package may not touch them (§2). The base64 and hash
 * implementations below exist for exactly that reason.
 */

import { z } from 'zod';

import { BALL_CONDITIONS, ARCHETYPES, FORMATS, HANDEDNESS, PITCH_TYPES } from '../ontology/match';
import { BOWLER_TYPES, LENGTHS, LINES, VARIATIONS } from '../ontology/deliveries';
import { type ScenarioState } from './types';

const vec2 = z.object({ x: z.number(), y: z.number() });

const fielder = z.object({
  id: z.string().min(1),
  positionId: z.string().min(1),
  at: vec2,
  role: z.enum(['keeper', 'bowler', 'fielder']),
});

const deliveryRecord = z.object({
  over: z.number().int().min(0),
  ball: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  length: z.enum([...LENGTHS]),
  line: z.enum([...LINES]),
  variation: z.enum([...VARIATIONS]),
  runs: z.number().int().min(0),
  wicket: z.boolean(),
  extra: z.enum(['wide', 'no_ball', 'bye', 'leg_bye']).optional(),
});

const pct = z.number().min(0).max(100);

export const scenarioSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),

  format: z.enum([...FORMATS]),
  innings: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  over: z.number().int().min(0),
  ball: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  score: z.number().int().min(0),
  wicketsLost: z.number().int().min(0).max(9),
  target: z.number().int().min(1).nullable(),
  ballsRemaining: z.number().int().min(0).nullable(),

  pitch: z.enum([...PITCH_TYPES]),
  pitchWear: pct,
  cloudCover: pct,
  dew: pct,
  ballAgeOvers: z.number().min(0),
  ballCondition: z.enum([...BALL_CONDITIONS]),
  ground: z.object({
    straightM: z.number().min(45).max(95),
    squareM: z.number().min(45).max(95),
  }),
  lights: z.boolean(),

  bowler: z.object({
    type: z.enum([...BOWLER_TYPES]),
    avgSpeedKph: z.number().min(60).max(165),
    swingDeg: z.number().min(0).max(10),
    seamDeg: z.number().min(0).max(10),
    spinDeg: z.number().min(0).max(15),
    executionReliability: pct,
    oversBowled: z.number().min(0),
    oversRemaining: z.number().min(0),
  }),

  striker: z.object({
    handedness: z.enum([...HANDEDNESS]),
    archetype: z.enum([...ARCHETYPES]),
    ballsFaced: z.number().int().min(0),
    runs: z.number().int().min(0),
    aggression: pct,
  }),

  nonStriker: z.object({
    handedness: z.enum([...HANDEDNESS]),
    archetype: z.enum([...ARCHETYPES]),
  }),

  field: z.object({ fielders: z.array(fielder) }),
  lastDeliveries: z.array(deliveryRecord).max(12),
  freeHit: z.boolean().optional(),
  superOver: z.boolean().optional(),
});

export type ScenarioParseResult =
  | { ok: true; scenario: ScenarioState }
  | { ok: false; issues: string[] };

export const validateScenario = (value: unknown): ScenarioParseResult => {
  const parsed = scenarioSchema.safeParse(value);
  if (parsed.success) return { ok: true, scenario: parsed.data as ScenarioState };
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
};

/* ------------------------------------------------------------------------- */
/* Canonical JSON                                                            */
/* ------------------------------------------------------------------------- */

/**
 * Key-sorted JSON, so two structurally identical scenarios always produce the
 * same string — and therefore the same hash — regardless of construction order.
 */
export const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
};

/* ------------------------------------------------------------------------- */
/* Hash                                                                      */
/* ------------------------------------------------------------------------- */

/**
 * FNV-1a, 32-bit, hex. Not cryptographic — it identifies a scenario for cache
 * keys and DecisionRecord grouping (§9, §10), where collisions cost a mislabelled
 * log line rather than anything security-relevant.
 */
export const hashScenario = (s: ScenarioState): string => {
  const input = canonicalJson({ ...s, id: undefined, title: undefined });
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // hash *= 16777619, in 32-bit arithmetic
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

/* ------------------------------------------------------------------------- */
/* Deep-link encoding                                                        */
/* ------------------------------------------------------------------------- */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** UTF-8 bytes of a string, without TextEncoder (a platform API). */
const utf8Bytes = (str: string): number[] => {
  const out: number[] = [];
  for (const char of str) {
    let code = char.codePointAt(0)!;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000)
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    }
    code = 0;
  }
  return out;
};

const utf8String = (bytes: number[]): string => {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i]!;
    let code: number;
    if (b < 0x80) {
      code = b;
      i += 1;
    } else if (b < 0xe0) {
      code = ((b & 31) << 6) | (bytes[i + 1]! & 63);
      i += 2;
    } else if (b < 0xf0) {
      code = ((b & 15) << 12) | ((bytes[i + 1]! & 63) << 6) | (bytes[i + 2]! & 63);
      i += 3;
    } else {
      code =
        ((b & 7) << 18) |
        ((bytes[i + 1]! & 63) << 12) |
        ((bytes[i + 2]! & 63) << 6) |
        (bytes[i + 3]! & 63);
      i += 4;
    }
    out += String.fromCodePoint(code);
  }
  return out;
};

/** base64url, no padding. */
const toBase64Url = (bytes: number[]): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b === undefined) break;
    out += B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c === undefined) break;
    out += B64[c & 63];
  }
  return out;
};

const fromBase64Url = (text: string): number[] => {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = B64.indexOf(char);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
};

/** A URL-safe token restoring complete builder state (§3 M3). */
export const encodeScenario = (s: ScenarioState): string =>
  toBase64Url(utf8Bytes(canonicalJson(s)));

export const decodeScenario = (token: string): ScenarioParseResult => {
  try {
    const json = utf8String(fromBase64Url(token));
    return validateScenario(JSON.parse(json));
  } catch (error) {
    return { ok: false, issues: [`not a decodable scenario token: ${String(error)}`] };
  }
};
