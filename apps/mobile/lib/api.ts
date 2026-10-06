import { Platform } from 'react-native';

/**
 * Talking to our own server.
 *
 * On web the app is served by that same server, so a relative URL keeps the
 * session cookie first-party. On native there is no origin, so the deployed
 * URL has to be named — set EXPO_PUBLIC_API_BASE at build time to point a
 * device build at something other than production.
 *
 * `EXPO_PUBLIC_*` is inlined into the bundle, so it must never hold a secret.
 * The only thing here is a public URL.
 */
const NATIVE_BASE =
  process.env.EXPO_PUBLIC_API_BASE?.trim() || 'https://cricket-tactical-simulator.onrender.com';

export const apiBase = (): string => (Platform.OS === 'web' ? '' : NATIVE_BASE);

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    // Without this the session cookie is neither sent nor stored.
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `request failed (${response.status})`, response.status);
  }
  return (await response.json()) as T;
};

export interface SessionState {
  authenticated: boolean;
  who: string | null;
}

export const getSession = (): Promise<SessionState> => request<SessionState>('/api/session');

export const signIn = (password: string, who: string): Promise<SessionState> =>
  request<SessionState>('/api/session', {
    method: 'POST',
    body: JSON.stringify({ password, who }),
  });

export const signOut = (): Promise<SessionState> =>
  request<SessionState>('/api/session', { method: 'DELETE' });

export interface StoredDecisionRow {
  id: string;
  scenarioHash: string;
  role: string;
  msToDecide: number;
  createdAt: string;
  author: string | null;
}

export const postDecision = (payload: unknown): Promise<{ stored: boolean; total: number }> =>
  request('/api/decisions', { method: 'POST', body: JSON.stringify(payload) });

export const listDecisions = (): Promise<{ decisions: StoredDecisionRow[]; total: number }> =>
  request('/api/decisions?limit=100');

export const health = (): Promise<{ store: string; decisions: number; model: string | null }> =>
  request('/api/health');
