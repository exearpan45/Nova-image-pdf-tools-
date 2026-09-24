import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  name: string;
  email: string; // stored lowercase
  password_hash: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export type SafeUser = Omit<UserRecord, 'password_hash'>;

export interface SessionRecord {
  id: string; // secure token
  user_id: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
  user_agent?: string;
  ip_address?: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  target_id: string | null;
  target_email: string | null;
  details?: Record<string, unknown> | string;
  created_at: string;
}

interface DatabaseSchema {
  version: number;
  users: UserRecord[];
  sessions: SessionRecord[];
  audit_logs: AuditLogRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'auth_database.json');

class DatabaseStore {
  private data: DatabaseSchema = {
    version: 1,
    users: [],
    sessions: [],
    audit_logs: [],
  };

  private isInitialized = false;
  private lastMtime = 0;

  constructor() {
    this.init();
  }

  public syncFromDisk() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const stats = fs.statSync(DB_FILE);
        if (stats.mtimeMs > this.lastMtime) {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.users)) {
            this.data = parsed;
            if (!this.data.users) this.data.users = [];
            if (!this.data.sessions) this.data.sessions = [];
            if (!this.data.audit_logs) this.data.audit_logs = [];
            this.lastMtime = stats.mtimeMs;
          }
        }
      }
    } catch (err) {
      console.error('Error syncing auth database from disk:', err);
    }
  }

  private init() {
    if (this.isInitialized) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const stats = fs.statSync(DB_FILE);
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = [];
        if (!this.data.sessions) this.data.sessions = [];
        if (!this.data.audit_logs) this.data.audit_logs = [];
        this.lastMtime = stats.mtimeMs;
      } else {
        this.persistSync();
      }
      this.isInitialized = true;
    } catch (err) {
      console.error('Error initializing auth database:', err);
      // Fallback in-memory
      this.data = { version: 1, users: [], sessions: [], audit_logs: [] };
      this.isInitialized = true;
    }
  }

  private persistSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to write database atomically:', err);
    }
  }

  // --- Safe Sanitizer ---
  public toSafeUser(user: UserRecord): SafeUser {
    // Explicitly exclude password_hash
    const { password_hash: _, ...safe } = user;
    return safe;
  }

  // --- Users Operations ---
  public getAllUsers(): SafeUser[] {
    this.syncFromDisk();
    return this.data.users.map((u) => this.toSafeUser(u));
  }

  public findUserById(id: string): UserRecord | undefined {
    this.syncFromDisk();
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByEmail(email: string): UserRecord | undefined {
    this.syncFromDisk();
    const normEmail = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email.toLowerCase() === normEmail);
  }

  public createUser(userData: {
    name: string;
    email: string;
    password_hash: string;
    role?: 'user' | 'admin';
    status?: 'active' | 'disabled';
  }): SafeUser {
    const normEmail = userData.email.trim().toLowerCase();
    if (this.findUserByEmail(normEmail)) {
      throw new Error('An account with this email already exists.');
    }

    const now = new Date().toISOString();
    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      name: userData.name.trim(),
      email: normEmail,
      password_hash: userData.password_hash,
      role: userData.role || 'user',
      status: userData.status || 'active',
      created_at: now,
      updated_at: now,
      last_login_at: null,
    };

    this.data.users.push(newUser);
    this.persistSync();
    return this.toSafeUser(newUser);
  }

  public updateUser(
    id: string,
    updates: Partial<Pick<UserRecord, 'name' | 'role' | 'status' | 'password_hash' | 'last_login_at'>>,
  ): SafeUser {
    const user = this.findUserById(id);
    if (!user) {
      throw new Error('User not found.');
    }

    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.status !== undefined) user.status = updates.status;
    if (updates.password_hash !== undefined) user.password_hash = updates.password_hash;
    if (updates.last_login_at !== undefined) user.last_login_at = updates.last_login_at;
    user.updated_at = new Date().toISOString();

    this.persistSync();
    return this.toSafeUser(user);
  }

  public deleteUser(id: string): boolean {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;

    this.data.users.splice(idx, 1);
    // Invalidate any sessions belonging to this user
    this.deleteSessionsByUserId(id);
    this.persistSync();
    return true;
  }

  public countUsers(): { total: number; active: number; disabled: number; admin: number } {
    let active = 0;
    let disabled = 0;
    let admin = 0;
    for (const u of this.data.users) {
      if (u.status === 'active') active++;
      else if (u.status === 'disabled') disabled++;
      if (u.role === 'admin') admin++;
    }
    return {
      total: this.data.users.length,
      active,
      disabled,
      admin,
    };
  }

  // --- Session Operations ---
  public createSession(
    userId: string,
    metadata?: { userAgent?: string; ipAddress?: string; durationDays?: number },
  ): SessionRecord {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const days = metadata?.durationDays || 7;
    const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const session: SessionRecord = {
      id: token,
      user_id: userId,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
      last_active_at: now.toISOString(),
      user_agent: metadata?.userAgent,
      ip_address: metadata?.ipAddress,
    };

    // Clean up expired sessions periodically
    this.cleanExpiredSessions();

    this.data.sessions.push(session);
    this.persistSync();
    return session;
  }

  public findSession(token: string): (SessionRecord & { user: UserRecord }) | undefined {
    const session = this.data.sessions.find((s) => s.id === token);
    if (!session) return undefined;

    // Check expiration
    if (new Date(session.expires_at).getTime() < Date.now()) {
      this.deleteSession(token);
      return undefined;
    }

    const user = this.findUserById(session.user_id);
    if (!user) {
      this.deleteSession(token);
      return undefined;
    }

    // Refresh last active
    session.last_active_at = new Date().toISOString();
    return { ...session, user };
  }

  public deleteSession(token: string): boolean {
    const idx = this.data.sessions.findIndex((s) => s.id === token);
    if (idx === -1) return false;
    this.data.sessions.splice(idx, 1);
    this.persistSync();
    return true;
  }

  public deleteSessionsByUserId(userId: string): number {
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.user_id !== userId);
    const removed = initialLen - this.data.sessions.length;
    if (removed > 0) {
      this.persistSync();
    }
    return removed;
  }

  private cleanExpiredSessions() {
    const now = Date.now();
    this.data.sessions = this.data.sessions.filter(
      (s) => new Date(s.expires_at).getTime() > now,
    );
  }

  // --- Audit Logs ---
  public addAuditLog(entry: {
    action: string;
    actor_id?: string | null;
    actor_email?: string | null;
    target_id?: string | null;
    target_email?: string | null;
    details?: Record<string, unknown> | string;
  }): AuditLogRecord {
    const record: AuditLogRecord = {
      id: crypto.randomUUID(),
      action: entry.action,
      actor_id: entry.actor_id ?? null,
      actor_email: entry.actor_email ?? null,
      target_id: entry.target_id ?? null,
      target_email: entry.target_email ?? null,
      details: entry.details,
      created_at: new Date().toISOString(),
    };

    // Keep up to 1000 latest audit records
    this.data.audit_logs.unshift(record);
    if (this.data.audit_logs.length > 1000) {
      this.data.audit_logs.length = 1000;
    }
    this.persistSync();
    return record;
  }

  public getAuditLogs(limit = 100): AuditLogRecord[] {
    return this.data.audit_logs.slice(0, limit);
  }
}

export const db = new DatabaseStore();
