import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { issueSession, passwordMatches, readSession } from './auth';

const SECRET = 'a-test-secret';

describe('passwordMatches', () => {
  it('accepts the right password', () => {
    expect(passwordMatches('correct horse', 'correct horse')).toBe(true);
  });

  it('rejects the wrong one', () => {
    expect(passwordMatches('wrong', 'correct horse')).toBe(false);
  });

  it('rejects a prefix — no early-exit comparison', () => {
    expect(passwordMatches('correct', 'correct horse')).toBe(false);
    expect(passwordMatches('correct horse battery', 'correct horse')).toBe(false);
  });

  it('handles a length mismatch without throwing', () => {
    // timingSafeEqual throws on unequal lengths, which is itself a timing
    // signal; the implementation compares fixed-size digests instead.
    expect(() => passwordMatches('', 'correct horse')).not.toThrow();
    expect(passwordMatches('', 'correct horse')).toBe(false);
  });

  it('is not fooled by unicode that looks similar', () => {
    expect(passwordMatches('pаssword', 'password')).toBe(false); // Cyrillic а
  });
});

describe('session tokens', () => {
  it('round-trips the holder', () => {
    const session = readSession(issueSession('yash', SECRET), SECRET);
    expect(session?.who).toBe('yash');
  });

  it('rejects a token signed with a different secret', () => {
    // This is what rotating APP_PASSWORD does: every existing session dies.
    const token = issueSession('yash', SECRET);
    expect(readSession(token, 'a-different-secret')).toBeNull();
  });

  it('rejects a forged signature', () => {
    const token = issueSession('yash', SECRET);
    const [body] = token.split('.');
    expect(readSession(`${body}.deadbeef`, SECRET)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const token = issueSession('yash', SECRET);
    const signature = token.split('.')[1]!;
    const forgedBody = Buffer.from(
      JSON.stringify({ who: 'intruder', issuedAt: Date.now() }),
    ).toString('base64url');
    expect(readSession(`${forgedBody}.${signature}`, SECRET)).toBeNull();
  });

  it('rejects junk and absence', () => {
    expect(readSession(undefined, SECRET)).toBeNull();
    expect(readSession('', SECRET)).toBeNull();
    expect(readSession('no-dot', SECRET)).toBeNull();
    expect(readSession('...', SECRET)).toBeNull();
  });

  it('expires after thirty days', () => {
    const stale = Buffer.from(
      JSON.stringify({ who: 'yash', issuedAt: Date.now() - 31 * 24 * 60 * 60 * 1000 }),
    ).toString('base64url');
    // Re-sign it properly, so the only reason to reject is the age.
    const token = issueSession('yash', SECRET);
    const freshBody = token.split('.')[0]!;
    expect(readSession(token, SECRET)).not.toBeNull();
    expect(freshBody).not.toBe(stale);

    // A correctly signed but old token must still be refused.
    const signature = createHmac('sha256', SECRET).update(stale).digest('base64url');
    expect(readSession(`${stale}.${signature}`, SECRET)).toBeNull();
  });
});
