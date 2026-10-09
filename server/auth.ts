import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export interface AuthenticatedUser {
  name: string;
  email: string;
  role: string;
  username?: string;
  phone?: string;
  plan?: string;
}

interface SessionPayload extends AuthenticatedUser {
  sub: string;
  iat: number;
  exp: number;
}

const COOKIE_NAME = 'xorbit_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
let ephemeralSecret: string | null = null;

function getSessionSecret(): string {
  const configured = String(process.env.AUTH_SESSION_SECRET || process.env.SESSION_SECRET || '').trim();
  if (configured.length >= 32) return configured;

  if (!ephemeralSecret) {
    ephemeralSecret = crypto.randomBytes(48).toString('base64url');
    console.warn('[Auth] AUTH_SESSION_SECRET no configurado; las sesiones se invalidarán al reiniciar.');
  }
  return ephemeralSecret;
}

function parseCookies(req: Request): Record<string, string> {
  const header = String(req.headers.cookie || '');
  const cookies: Record<string, string> = {};
  for (const item of header.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 1) continue;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

function sign(encodedPayload: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(encodedPayload).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function safeCompareSecret(left: unknown, right: unknown): boolean {
  const leftValue = String(left ?? '');
  const rightValue = String(right ?? '');
  if (!leftValue || !rightValue) return false;
  return safeEqual(
    crypto.createHash('sha256').update(leftValue).digest('hex'),
    crypto.createHash('sha256').update(rightValue).digest('hex')
  );
}

export function createSessionToken(user: AuthenticatedUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...user,
    sub: String(user.email || user.username || '').trim().toLowerCase(),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function getSession(req: Request): SessionPayload | null {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const [encodedPayload, signature, extra] = token.split('.');
  if (!encodedPayload || !signature || extra || !safeEqual(sign(encodedPayload), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || !payload.exp || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, user: AuthenticatedUser): void {
  const secure = process.env.NODE_ENV === 'production';
  const attributes = [
    `${COOKIE_NAME}=${encodeURIComponent(createSessionToken(user))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (secure) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
}

export function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Sesión requerida' });
    return;
  }
  (req as Request & { authUser?: SessionPayload }).authUser = session;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ error: 'Sesión requerida' });
      return;
    }
    if (!roles.includes(session.role)) {
      res.status(403).json({ error: 'Permisos insuficientes' });
      return;
    }
    (req as Request & { authUser?: SessionPayload }).authUser = session;
    next();
  };
}

const PUBLIC_API_ROUTES = new Set([
  'GET /api/health',
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'GET /api/auth/session',
  'POST /api/auth/google-login',
  'GET /api/integrations/bold/webhook',
  'POST /api/integrations/bold/webhook',
  'GET /api/payments/bold/webhook',
  'POST /api/payments/bold/webhook',
  'POST /api/whatsapp/evolution-webhook',
  'GET /api/zernio/webhook',
  'POST /api/zernio/webhook',
  'GET /api/webhooks/meta',
  'POST /api/webhooks/meta',
  'GET /api/webhooks/tiktok',
  'POST /api/webhooks/tiktok',
]);

export function requireApiSession(req: Request, res: Response, next: NextFunction): void {
  const pathname = String(req.originalUrl || req.url || '').split('?')[0];
  if (PUBLIC_API_ROUTES.has(`${req.method.toUpperCase()} ${pathname}`)) {
    next();
    return;
  }
  requireSession(req, res, next);
}
