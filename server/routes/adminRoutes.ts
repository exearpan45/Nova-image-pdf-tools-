import { Router, Response } from 'express';
import { db } from '../db';
import { requireAdmin, AuthenticatedRequest } from '../auth';

export const adminRouter = Router();

// Apply requireAdmin to ALL admin routes
adminRouter.use(requireAdmin);

// GET /api/admin/stats (Requirement 9)
adminRouter.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  try {
    const counts = db.countUsers();
    const allUsers = db.getAllUsers();

    // 7 days ago timestamp
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const recentRegistrations = allUsers.filter((u) => u.created_at >= sevenDaysAgo).length;
    const recentLogins = allUsers.filter((u) => u.last_login_at && u.last_login_at >= sevenDaysAgo).length;

    return res.json({
      totalUsers: counts.total,
      activeUsers: counts.active,
      disabledUsers: counts.disabled,
      adminUsers: counts.admin,
      recentRegistrations,
      recentLogins,
    });
  } catch (err: unknown) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin stats.' });
  }
});

// GET /api/admin/users (Requirement 10, 11)
adminRouter.get('/users', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status, role, sortBy = 'created_at', order = 'desc' } = req.query as Record<string, string>;

    let users = db.getAllUsers();

    // Filter by search query
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      users = users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }

    // Filter by status
    if (status && status !== 'all') {
      users = users.filter((u) => u.status === status);
    }

    // Filter by role
    if (role && role !== 'all') {
      users = users.filter((u) => u.role === role);
    }

    // Sort users
    users.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === 'email') {
        valA = a.email.toLowerCase();
        valB = b.email.toLowerCase();
      } else if (sortBy === 'last_login_at') {
        valA = a.last_login_at || '';
        valB = b.last_login_at || '';
      } else {
        // created_at default
        valA = a.created_at;
        valB = b.created_at;
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return res.json({ users });
  } catch (err: unknown) {
    console.error('Admin get users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/admin/users/:id (Requirement 11)
adminRouter.get('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = db.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const safeUser = db.toSafeUser(user);
    return res.json({ user: safeUser });
  } catch (err: unknown) {
    console.error('Admin get user error:', err);
    return res.status(500).json({ error: 'Failed to fetch user details.' });
  }
});

// PATCH /api/admin/users/:id/status (Requirement 10, 12)
adminRouter.patch('/users/:id/status', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (status !== 'active' && status !== 'disabled') {
      return res.status(400).json({ error: "Status must be either 'active' or 'disabled'." });
    }

    const targetUser = db.findUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Protection: Prevent admin from disabling their own account
    if (id === req.user!.id && status === 'disabled') {
      return res.status(400).json({ error: 'You cannot disable your own administrator account.' });
    }

    const updated = db.updateUser(id, { status });

    // Invalidate sessions if user is disabled (Requirement 12)
    if (status === 'disabled') {
      db.deleteSessionsByUserId(id);
    }

    // Audit log
    db.addAuditLog({
      action: status === 'disabled' ? 'admin_user_disabled' : 'admin_user_enabled',
      actor_id: req.user!.id,
      actor_email: req.user!.email,
      target_id: targetUser.id,
      target_email: targetUser.email,
      details: { previousStatus: targetUser.status, newStatus: status },
    });

    return res.json({
      message: `User account has been ${status === 'active' ? 'enabled' : 'disabled'}.`,
      user: updated,
    });
  } catch (err: unknown) {
    console.error('Admin update status error:', err);
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// PATCH /api/admin/users/:id/role
adminRouter.patch('/users/:id/role', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: "Role must be either 'user' or 'admin'." });
    }

    const targetUser = db.findUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Protection: Cannot demote yourself
    if (id === req.user!.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot remove admin privileges from your own account.' });
    }

    const updated = db.updateUser(id, { role });

    db.addAuditLog({
      action: 'admin_user_role_changed',
      actor_id: req.user!.id,
      actor_email: req.user!.email,
      target_id: targetUser.id,
      target_email: targetUser.email,
      details: { previousRole: targetUser.role, newRole: role },
    });

    return res.json({
      message: `User role updated to ${role}.`,
      user: updated,
    });
  } catch (err: unknown) {
    console.error('Admin update role error:', err);
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// DELETE /api/admin/users/:id (Requirement 10)
adminRouter.delete('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const targetUser = db.findUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Protection: Cannot delete your own account
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
    }

    db.deleteUser(id);

    db.addAuditLog({
      action: 'admin_user_deleted',
      actor_id: req.user!.id,
      actor_email: req.user!.email,
      target_id: targetUser.id,
      target_email: targetUser.email,
      details: { name: targetUser.name, email: targetUser.email },
    });

    return res.json({
      success: true,
      message: `User ${targetUser.email} has been permanently deleted.`,
    });
  } catch (err: unknown) {
    console.error('Admin delete user error:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// GET /api/admin/audit-logs (Requirement 25)
adminRouter.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = db.getAuditLogs(100);
    return res.json({ logs });
  } catch (err: unknown) {
    console.error('Admin get audit logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});
