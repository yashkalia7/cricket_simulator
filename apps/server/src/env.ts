import { createHash } from 'node:crypto';

/**
 * Configuration, read once at startup.
 *
 * **No secret has a default.** A fallback password or a dev-mode bypass is how
 * a gate ends up disabled in production without anyone noticing — the server
 * refuses to start instead.
 */

const required = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `${name} is not set. Set it in Render → Environment. It must never be committed — this repo is public.`,
    );
  }
  return value.trim();
};

export interface Config {
  port: number;
  /** The shared password for the landing gate. */
  appPassword: string;
  /** Derived from the password, so changing the password logs everyone out. */
  sessionSecret: string;
  /** Postgres connection string. Absent means in-memory, for local work only. */
  databaseUrl: string | null;
  openAiKey: string | null;
  openAiModel: string;
  /** Directory of the built web app, served at /. */
  staticDir: string;
  isProduction: boolean;
}

export const loadConfig = (): Config => {
  const appPassword = required('APP_PASSWORD');

  return {
    port: Number(process.env.PORT ?? 8787),
    appPassword,
    // Deriving rather than taking a second secret keeps the env surface small,
    // and means rotating the password invalidates every existing session —
    // which is the behaviour you want from a password change anyway.
    sessionSecret: createHash('sha256').update(`cricket-session:${appPassword}`).digest('hex'),
    databaseUrl: process.env.DATABASE_URL?.trim() || null,
    openAiKey: process.env.OPENAI_API_KEY?.trim() || null,
    openAiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    staticDir: process.env.STATIC_DIR?.trim() || '../mobile/dist',
    isProduction: process.env.NODE_ENV === 'production',
  };
};
