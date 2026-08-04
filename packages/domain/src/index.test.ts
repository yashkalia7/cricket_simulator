import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { DOMAIN_SCHEMA_VERSION } from './index';

/**
 * M0 smoke test. This proves the toolchain, not the domain — there is no domain
 * yet. It fails if TypeScript strict mode, zod or Vitest are wired up wrong,
 * which is exactly what M0's acceptance criteria are about.
 *
 * Real domain tests arrive with M1 (mirror involution, capsule containment at
 * the seam, nearest-position stability under jitter, worldToScreen round-trip).
 */
describe('domain toolchain', () => {
  it('pins the persisted schema version', () => {
    expect(DOMAIN_SCHEMA_VERSION).toBe(1);
  });

  it('validates with zod', () => {
    const versioned = z.object({ schemaVersion: z.literal(DOMAIN_SCHEMA_VERSION) });

    expect(versioned.parse({ schemaVersion: 1 })).toEqual({ schemaVersion: 1 });
    expect(versioned.safeParse({ schemaVersion: 2 }).success).toBe(false);
  });
});
