import { type DecisionRecord, type ScenarioState } from '@cricket/domain';

import { postDecision } from './api';
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

export type DecisionSync = 'stored' | 'local-only';

/**
 * Write locally first, then to the server.
 *
 * Local always succeeds, so a commit is never lost to a flaky network; the
 * server write is what makes the log a *shared* dataset rather than something
 * trapped in one person's browser (§5). The caller is told which happened —
 * "Logged" should not claim more than actually occurred.
 */
export const recordDecision = async (
  record: DecisionRecord,
  scenario: ScenarioState,
): Promise<DecisionSync> => {
  const all = [...readDecisions(), record];
  storage().set(KEY, JSON.stringify(all));

  try {
    await postDecision({ ...record, scenario });
    return 'stored';
  } catch {
    return 'local-only';
  }
};

export const decisionCount = (): number => readDecisions().length;

export const clearDecisions = (): void => storage().delete(KEY);
