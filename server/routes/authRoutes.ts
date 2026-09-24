import { Router, Response } from 'express';
import {
  db,
} from '../db';
import {
  hashPassword,
  comparePassword,
  validateEmail,
  validatePassword,
  validateName,
  rateLimit,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  AuthenticatedRequest,
} from '../auth';

export const authRouter = Router();

// POST /api/auth/register (Requirement 3)
authRouter.post('/register', rateLimit(10, 60 * 1000), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};

    // 1. Name validation
    const nameCheck = validateName(name);
    if (!nameCheck.valid) {
      return res.status(400).json({ error: nameCheck.reason });
    }

    // 2. Email format validation
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // 3. Password requirements validation
    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      return res.status(400).json({ error: passCheck.reason || 'Password does not meet the required security rules.' });
    }

    // 4. Password confirmation match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const normEmail = email.trim().toLowerCase();

    // 5. Check if email already exists
    if (db.findUserByEmail(normEmail)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // 6. Hash password securely
    const passwordHash = await hashPassword(password);

    // 7. Store user account (first user is regular user unless system initialization)
    const newUser = db.createUser({
      name: name.trim(),
      email: normEmail,
      password_hash: passwordHash,
      role: 'user',
      status: 'active',
    });

    // 8. Create authenticated session
    const session = db.createSession(newUser.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
      durationDays: 7,
    });

    // 9. Set HTTP-only cookie
    setSessionCookie(res, session.id);

    // 10. Audit log
    db.addAuditLog({
      action: 'user_registered',
      actor_id: newUser.id,
      actor_email: newUser.email,
      target_id: newUser.id,
      target_email: newUser.email,
      details: 'Self registration',
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      user: newUser,
      token: session.id,
    });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during registration. Please try again.' });
  }
});

// POST /api/auth/login (Requirement 4)
authRouter.post('/login', rateLimit(15, 60 * 1000), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const normEmail = email.trim().toLowerCase();
    const user = db.findUserByEmail(normEmail);

    // Constant-time compare or generic failure to avoid user enumeration
    if (!user) {
      // Fake compare to mitigate timing attack
      await comparePassword(password, '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr');
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check account status
    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'This account is currently unavailable.' });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last login
    const updated = db.updateUser(user.id, {
      last_login_at: new Date().toISOString(),
    });

    // Create session
    const session = db.createSession(user.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
      durationDays: 7,
    });

    setSessionCookie(res, session.id);

    // Audit log
    db.addAuditLog({
      action: 'user_login',
      actor_id: user.id,
      actor_email: user.email,
      target_id: user.id,
      target_email: user.email,
    });

    return res.json({
      message: 'Login successful.',
      user: updated,
      token: session.id,
    });
  } catch (err: unknown) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during login. Please try again.' });
  }
});

// POST /api/auth/logout (Requirement 6)
authRouter.post('/logout', (req: AuthenticatedRequest, res: Response) => {
  if (req.sessionId) {
    db.deleteSession(req.sessionId);
  }
  clearSessionCookie(res);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me (Requirement 7)
authRouter.get('/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.safeUser) {
    return res.json({ user: null });
  }
  if (req.safeUser.status === 'disabled') {
    if (req.sessionId) db.deleteSession(req.sessionId);
    clearSessionCookie(res);
    return res.status(403).json({ error: 'This account is currently unavailable.', user: null });
  }
  return res.json({ user: req.safeUser });
});

// POST /api/auth/change-password (Requirement 7)
authRouter.post('/change-password', requireAuth, rateLimit(8, 60 * 1000), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body || {};
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    const passCheck = validatePassword(newPassword);
    if (!passCheck.valid) {
      return res.status(400).json({ error: passCheck.reason });
    }

    // Verify current password
    const isCurrentValid = await comparePassword(currentPassword, req.user!.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: 'The current password you entered is incorrect.' });
    }

    // Hash and update
    const newHash = await hashPassword(newPassword);
    db.updateUser(userId, { password_hash: newHash });

    db.addAuditLog({
      action: 'password_changed',
      actor_id: userId,
      actor_email: req.user!.email,
      target_id: userId,
      target_email: req.user!.email,
    });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: unknown) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
});

// PUT /api/auth/profile
authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body || {};
    const nameCheck = validateName(name);
    if (!nameCheck.valid) {
      return res.status(400).json({ error: nameCheck.reason });
    }

    const updated = db.updateUser(req.user!.id, { name: name.trim() });
    return res.json({ user: updated, message: 'Profile updated successfully.' });
  } catch (err: unknown) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});
