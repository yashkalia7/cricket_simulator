import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

import type { Config } from './env';

/**
 * The gate (and the only real one).
 *
 * The password screen in the web app is **not** security — the bundle ships to
 * the browser, and this repo is public, so anyone can read the API shape and
 * call it directly. What actually protects the OpenAI spend is this: every
 * `/api` route below the gate refuses to run without a valid session cookie.
 *
 * Shared password, one session cookie, HMAC-signed so it cannot be forged
 * without the secret. No user database — three people and one password is the
 * right amount of machinery for this.
 */

export const SESSION_COOKIE = 'cricket_session';

/** Constant-time compare, so a wrong password leaks nothing through timing. */
export const passwordMatches = (supplied: string, expected: string): boolean => {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, which would itself be a timing
  // signal — compare fixed-size digests instead of the raw strings.
  const ha = createHmac('sha256', 'cmp').update(a).digest();
  const hb = createHmac('sha256', 'cmp').update(b).digest();
  return timingSafeEqual(ha, hb);
};

interface SessionPayload {
  /** Who it is, when you move to one password each. 'team' for the shared one. */
  who: string;
  issuedAt: number;
}

const sign = (value: string, secret: string): string =>
  createHmac('sha256', secret).update(value).digest('base64url');

export const issueSession = (who: string, secret: string): string => {
  const payload: SessionPayload = { who, issuedAt: Date.now() };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
};

export const readSession = (token: string | undefined, secret: string): SessionPayload | null => {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = sign(body, secret);
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    // Thirty days. Long enough not to annoy three people, short enough that a
    // leaked cookie does not last forever.
    if (Date.now() - payload.issuedAt > 30 * 24 * 60 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
};

export const setSessionCookie = (c: Context, token: string, config: Config): void => {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    // Not readable from JavaScript, so an XSS bug cannot lift the session.
    secure: config.isProduction,
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
};

export const clearSessionCookie = (c: Context, config: Config): void => {
  setCookie(c, SESSION_COOKIE, '', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
  });
};

export const currentSession = (c: Context, config: Config): SessionPayload | null =>
  readSession(getCookie(c, SESSION_COOKIE), config.sessionSecret);

/** Guard for everything that costs money or stores data. */
export const requireSession = (config: Config) => async (c: Context, next: Next) => {
  if (!currentSession(c, config)) {
    return c.json({ error: 'not_authenticated' }, 401);
  }
  await next();
};
