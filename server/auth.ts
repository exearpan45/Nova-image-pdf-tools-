import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db, UserRecord, SafeUser } from './db';

export const SESSION_COOKIE_NAME = 'nova_session';
export const BCRYPT_SALT_ROUNDS = 10;

// Rate limiting state per IP (in-memory sliding window)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitRecord>();

export function rateLimit(limit = 15, windowMs = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();

    const record = rateLimits.get(key);
    if (!record || now > record.resetAt) {
      rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      const waitSec = Math.ceil((record.resetAt - now) / 1000);
      return res.status(429).json({
        error: `Too many attempts. Please try again in ${waitSec} seconds.`,
      });
    }

    record.count++;
    next();
  };
}

// Password hashing & comparison
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Validation helpers
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  // RFC 5322 compliant regex simplified for practical standard use
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, reason: 'Password cannot exceed 128 characters.' };
  }
  // Require at least one letter and at least one digit or symbol
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  if (!hasLetter || !hasNumberOrSymbol) {
    return {
      valid: false,
      reason: 'Password must contain at least one letter and at least one number or special character.',
    };
  }
  return { valid: true };
}

export function validateName(name: string): { valid: boolean; reason?: string } {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { valid: false, reason: 'Name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, reason: 'Name must be at least 2 characters long.' };
  }
  if (trimmed.length > 70) {
    return { valid: false, reason: 'Name cannot exceed 70 characters.' };
  }
  return { valid: true };
}

// Request extension interface
export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
  safeUser?: SafeUser;
  sessionId?: string;
}

// Extract session token from cookie or Authorization header
export function extractSessionToken(req: Request): string | null {
  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }

  // 2. Check Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

// Authentication Middleware
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractSessionToken(req);
  if (!token) {
    return next();
  }

  const session = db.findSession(token);
  if (!session) {
    return next();
  }

  // Attach session & user
  req.sessionId = session.id;
  req.user = session.user;
  req.safeUser = db.toSafeUser(session.user);
  next();
}

// Enforce logged-in requirement
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.safeUser) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  if (req.user.status === 'disabled') {
    // Invalidate sessions immediately
    db.deleteSessionsByUserId(req.user.id);
    res.clearCookie(SESSION_COOKIE_NAME);
    return res.status(403).json({ error: 'This account is currently unavailable.' });
  }

  next();
}

// Enforce admin role requirement (Requirement 8, 14)
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.safeUser) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  if (req.user.status === 'disabled') {
    db.deleteSessionsByUserId(req.user.id);
    res.clearCookie(SESSION_COOKIE_NAME);
    return res.status(403).json({ error: 'This account is currently unavailable.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You are not authorized to access this area.' });
  }

  next();
}

// Set session cookie
export function setSessionCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// Clear session cookie
export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

// Seed initial admin if needed
export async function seedInitialAdminIfNeeded() {
  const stats = db.countUsers();
  if (stats.admin > 0) {
    return;
  }

  // Check if admin is configured via env
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admin@novatools.internal';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminNova2026!';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  try {
    const existing = db.findUserByEmail(adminEmail);
    if (!existing) {
      const hash = await hashPassword(adminPassword);
      db.createUser({
        name: adminName,
        email: adminEmail,
        password_hash: hash,
        role: 'admin',
        status: 'active',
      });
      db.addAuditLog({
        action: 'system_init_admin',
        details: `Initial administrator seeded (${adminEmail})`,
      });
      console.log(`[AUTH] Seeded initial admin account: ${adminEmail}`);
    }
  } catch (err) {
    console.error('Failed to seed initial admin account:', err);
  }
}
