import postgres from 'postgres';

/**
 * The decision log, server side (BUILD.md §5).
 *
 * "Nothing reads this log yet. Build it anyway — it's the dataset for Phase 2
 * and the only way you'll learn where users disagree." Until now it only ever
 * reached the visitor's own localStorage, so there was no *it* to read.
 *
 * Falls back to memory when DATABASE_URL is absent so the server runs locally
 * without Postgres. The fallback is loud and never silent in production.
 */

export interface StoredDecision {
  id: string;
  scenarioHash: string;
  role: string;
  decision: unknown;
  scenario: unknown;
  suggestionsShown: unknown;
  msToDecide: number;
  createdAt: string;
  /** Who committed it, when sessions are per-person. */
  author: string | null;
}

export interface Store {
  readonly kind: 'postgres' | 'memory';
  init(): Promise<void>;
  save(decision: StoredDecision): Promise<void>;
  list(limit: number): Promise<StoredDecision[]>;
  count(): Promise<number>;
  /** Cached model response for a scenario, or null. §10 caches on scenarioHash. */
  readCache(scenarioHash: string, model: string): Promise<unknown | null>;
  writeCache(scenarioHash: string, model: string, payload: unknown): Promise<void>;
}

const SCHEMA = `
create table if not exists decisions (
  id             text primary key,
  scenario_hash  text not null,
  role           text not null,
  decision       jsonb not null,
  scenario       jsonb not null,
  suggestions    jsonb not null default '[]'::jsonb,
  ms_to_decide   integer not null,
  author         text,
  created_at     timestamptz not null default now()
);
create index if not exists decisions_hash_idx on decisions (scenario_hash);
create index if not exists decisions_created_idx on decisions (created_at desc);

create table if not exists suggestion_cache (
  scenario_hash  text not null,
  model          text not null,
  payload        jsonb not null,
  created_at     timestamptz not null default now(),
  primary key (scenario_hash, model)
);
`;

export const createPostgresStore = (url: string): Store => {
  // Supabase requires TLS; `prepare: false` is needed behind its pooler.
  const sql = postgres(url, { ssl: 'require', prepare: false, max: 4 });

  return {
    kind: 'postgres',

    async init() {
      await sql.unsafe(SCHEMA);
    },

    async save(d) {
      await sql`
        insert into decisions
          (id, scenario_hash, role, decision, scenario, suggestions, ms_to_decide, author, created_at)
        values
          (${d.id}, ${d.scenarioHash}, ${d.role}, ${sql.json(d.decision as never)},
           ${sql.json(d.scenario as never)}, ${sql.json(d.suggestionsShown as never)},
           ${d.msToDecide}, ${d.author}, ${d.createdAt})
        on conflict (id) do nothing
      `;
    },

    async list(limit) {
      const rows = await sql<
        {
          id: string;
          scenario_hash: string;
          role: string;
          decision: unknown;
          scenario: unknown;
          suggestions: unknown;
          ms_to_decide: number;
          author: string | null;
          created_at: Date;
        }[]
      >`
        select id, scenario_hash, role, decision, scenario, suggestions,
               ms_to_decide, author, created_at
        from decisions
        order by created_at desc
        limit ${limit}
      `;

      return rows.map((r) => ({
        id: r.id,
        scenarioHash: r.scenario_hash,
        role: r.role,
        decision: r.decision,
        scenario: r.scenario,
        suggestionsShown: r.suggestions,
        msToDecide: r.ms_to_decide,
        author: r.author,
        createdAt: r.created_at.toISOString(),
      }));
    },

    async count() {
      const [row] = await sql<{ n: string }[]>`select count(*)::text as n from decisions`;
      return Number(row?.n ?? 0);
    },

    async readCache(scenarioHash, model) {
      const [row] = await sql<{ payload: unknown }[]>`
        select payload from suggestion_cache
        where scenario_hash = ${scenarioHash} and model = ${model}
      `;
      return row?.payload ?? null;
    },

    async writeCache(scenarioHash, model, payload) {
      await sql`
        insert into suggestion_cache (scenario_hash, model, payload)
        values (${scenarioHash}, ${model}, ${sql.json(payload as never)})
        on conflict (scenario_hash, model) do update set payload = excluded.payload
      `;
    },
  };
};

export const createMemoryStore = (): Store => {
  const decisions: StoredDecision[] = [];
  const cache = new Map<string, unknown>();

  return {
    kind: 'memory',
    async init() {
      /* nothing to migrate */
    },
    async save(d) {
      if (!decisions.some((existing) => existing.id === d.id)) decisions.unshift(d);
    },
    async list(limit) {
      return decisions.slice(0, limit);
    },
    async count() {
      return decisions.length;
    },
    async readCache(hash, model) {
      return cache.get(`${hash}:${model}`) ?? null;
    },
    async writeCache(hash, model, payload) {
      cache.set(`${hash}:${model}`, payload);
    },
  };
};
