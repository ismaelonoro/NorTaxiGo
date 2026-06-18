import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export const AUTH_COOKIE = 'nora_auth';

function secret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'nortaxigo-secret';
}

/**
 * Deterministic, stateless auth token: HMAC of a fixed string with the
 * server secret. Same value on every worker and across redeploys (the secret
 * comes from a stable env var), so no shared storage is needed.
 */
export function authToken(): string {
  return crypto.createHmac('sha256', secret()).update('nortaxigo-auth-v1').digest('hex');
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function isAuthenticated(req: Request): boolean {
  const token = parseCookies(req.headers.cookie || '')[AUTH_COOKIE];
  if (!token) return false;
  const expected = authToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (isAuthenticated(req)) return next();
  res.status(401).json({ error: 'Not authenticated' });
}
