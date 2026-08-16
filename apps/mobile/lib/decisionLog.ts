import { type DecisionRecord } from '@cricket/domain';

import { storage } from './storage';

/**
 * The decision log (BUILD.md §5, M5).
 *
 * **Nothing reads this yet. Build it anyway** — it is the dataset for Phase 2
 * and the only way you will learn where users disagree.
 *
 * Versioned key, so a schema change never silently reinterprets old records.
 */
const KEY = 'decisions.v1';

export const readDecisions = (): DecisionRecord[] => {
  const raw = storage().getString(KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DecisionRecord[]) : [];
  } catch {
    return [];
  }
};

export const recordDecision = (record: DecisionRecord): void => {
  const all = [...readDecisions(), record];
  storage().set(KEY, JSON.stringify(all));
};

export const decisionCount = (): number => readDecisions().length;

export const clearDecisions = (): void => storage().delete(KEY);
