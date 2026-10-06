import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

import {
  clearSessionCookie,
  currentSession,
  issueSession,
  passwordMatches,
  requireSession,
  setSessionCookie,
} from './auth';
import { validateScenario } from '@cricket/domain';
import { loadConfig } from './env';
import { createMemoryStore, createPostgresStore, type Store } from './store';
import { suggest } from './suggest';

/**
 * The API, and the web app it serves.
 *
 * One service rather than a static site plus a separate API: same origin, so
 * no CORS, and the session cookie works without any of the third-party-cookie
 * problems a split deployment would bring.
 */

const config = loadConfig();

const store: Store = config.databaseUrl
  ? createPostgresStore(config.databaseUrl)
  : createMemoryStore();

const app = new Hono();
app.use('*', logger());

/* ------------------------------------------------------------------------- */
/* Health                                                                    */
/* ------------------------------------------------------------------------- */

app.get('/api/health', async (c) =>
  c.json({
    ok: true,
    store: store.kind,
    decisions: await store.count(),
    model: config.openAiKey ? config.openAiModel : null,
  }),
);

/* ------------------------------------------------------------------------- */
/* Session                                                                   */
/* ------------------------------------------------------------------------- */

app.get('/api/session', (c) => {
  const session = currentSession(c, config);
  return c.json({ authenticated: session !== null, who: session?.who ?? null });
});

app.post('/api/session', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { password?: unknown; who?: unknown };
  const supplied = typeof body.password === 'string' ? body.password : '';

  if (!passwordMatches(supplied, config.appPassword)) {
    // Deliberately uninformative, and slow enough to make guessing tedious.
    await new Promise((r) => setTimeout(r, 400));
    return c.json({ error: 'wrong_password' }, 401);
  }

  const who = typeof body.who === 'string' && body.who.trim() ? body.who.trim().slice(0, 40) : 'team';
  setSessionCookie(c, issueSession(who, config.sessionSecret), config);
  return c.json({ authenticated: true, who });
});

app.delete('/api/session', (c) => {
  clearSessionCookie(c, config);
  return c.json({ authenticated: false });
});

/* ------------------------------------------------------------------------- */
/* Decisions — everything below here requires the gate                        */
/* ------------------------------------------------------------------------- */

const guarded = new Hono();
guarded.use('*', requireSession(config));

guarded.post('/decisions', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== 'string' || typeof body.scenarioHash !== 'string') {
    return c.json({ error: 'malformed_decision' }, 400);
  }

  const session = currentSession(c, config);

  await store.save({
    id: body.id,
    scenarioHash: body.scenarioHash,
    role: typeof body.role === 'string' ? body.role : 'UNKNOWN',
    decision: body.decision ?? null,
    scenario: body.scenario ?? null,
    suggestionsShown: body.suggestionsShown ?? [],
    msToDecide: typeof body.msToDecide === 'number' ? body.msToDecide : 0,
    createdAt:
      typeof body.createdAt === 'string' ? body.createdAt : new Date().toISOString(),
    author: session?.who ?? null,
  });

  return c.json({ stored: true, total: await store.count() });
});

guarded.get('/decisions', async (c) => {
  const limit = Math.min(200, Number(c.req.query('limit') ?? 50) || 50);
  return c.json({ decisions: await store.list(limit), total: await store.count() });
});

/* ------------------------------------------------------------------------- */
/* Suggestions — the only route that costs money                              */
/* ------------------------------------------------------------------------- */

/** Crude per-session throttle. Three people do not need a token bucket. */
const lastCall = new Map<string, number[]>();
const MAX_PER_MINUTE = 12;

guarded.post('/suggest', async (c) => {
  const session = currentSession(c, config);
  const who = session?.who ?? 'unknown';

  const now = Date.now();
  const recent = (lastCall.get(who) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= MAX_PER_MINUTE) {
    return c.json({ error: 'rate_limited', retryAfterSeconds: 60 }, 429);
  }
  lastCall.set(who, [...recent, now]);

  const body = (await c.req.json().catch(() => null)) as {
    scenario?: unknown;
    scenarioHash?: unknown;
  } | null;

  if (!body?.scenario || typeof body.scenarioHash !== 'string') {
    return c.json({ error: 'scenario_required' }, 400);
  }

  const validated = validateScenario(body.scenario);
  if (!validated.ok) {
    return c.json({ error: 'invalid_scenario', issues: validated.issues }, 400);
  }

  // §10: the quantised scenario space repeats heavily, so cached responses are
  // free, instant and reviewable.
  const cached = await store.readCache(body.scenarioHash, config.openAiModel);
  if (cached) return c.json({ ...(cached as object), cached: true });

  const result = await suggest(validated.scenario, config.openAiKey, config.openAiModel);
  if (result.source === 'model') {
    await store.writeCache(body.scenarioHash, config.openAiModel, result);
  }
  return c.json({ ...result, cached: false });
});

app.route('/api', guarded);

/* ------------------------------------------------------------------------- */
/* Static web app                                                            */
/* ------------------------------------------------------------------------- */

const STATIC_ROOT = resolve(process.cwd(), config.staticDir);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

const readIfFile = async (path: string): Promise<Buffer | null> => {
  try {
    if (!(await stat(path)).isFile()) return null;
    return await readFile(path);
  } catch {
    return null;
  }
};

app.get('*', async (c) => {
  const urlPath = decodeURIComponent(new URL(c.req.url).pathname);

  // Reject anything that climbs out of the static root.
  const candidate = resolve(join(STATIC_ROOT, urlPath));
  if (!candidate.startsWith(STATIC_ROOT)) return c.text('not found', 404);

  const direct = await readIfFile(candidate);
  if (direct) {
    const type = MIME[extname(candidate)] ?? 'application/octet-stream';
    const immutable = urlPath.startsWith('/_expo/') || urlPath.startsWith('/assets/');
    return c.body(direct as unknown as ArrayBuffer, 200, {
      'content-type': type,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
  }

  // expo-router is a single-page app: /analysis and /scenario/:id are client
  // routes, not files. Everything unmatched falls through to the shell.
  const shell = await readIfFile(join(STATIC_ROOT, 'index.html'));
  if (!shell) {
    return c.text(
      `Web app not built. Expected ${STATIC_ROOT}/index.html — run \`pnpm --filter @cricket/mobile exec expo export --platform web\`.`,
      500,
    );
  }
  return c.body(shell as unknown as ArrayBuffer, 200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
  });
});

/* ------------------------------------------------------------------------- */

await store.init();

serve({ fetch: app.fetch, port: config.port }, (info) => {
  process.stdout.write(
    `cricket server on :${info.port}  store=${store.kind}  model=${
      config.openAiKey ? config.openAiModel : 'none'
    }  static=${STATIC_ROOT}\n`,
  );
  if (store.kind === 'memory') {
    process.stdout.write(
      'WARNING: DATABASE_URL is not set — decisions are in memory and vanish on restart.\n',
    );
  }
});
