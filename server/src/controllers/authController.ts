import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/auditLogger.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

const createAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const admin = await prisma.admin.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!admin || !admin.isActive) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, admin.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const secret = process.env.JWT_SECRET || 'meeting_calendar_secret_jwt_key_2026_super_secure';
      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role },
        secret,
        { expiresIn: '7d' }
      );

      await logActivity({
        adminId: admin.id,
        actionType: 'ADMIN_LOGIN',
        entityType: 'ADMIN',
        entityId: admin.id,
        details: { email: admin.email },
        ipAddress: req.ip,
      });

      res.json({
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.admin) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      res.json({ admin: req.admin });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.admin) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      const admin = await prisma.admin.findUnique({
        where: { id: req.admin.id },
      });

      if (!admin) {
        res.status(404).json({ error: 'Admin not found.' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isMatch) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.admin.update({
        where: { id: admin.id },
        data: { passwordHash: newHash },
      });

      await logActivity({
        adminId: admin.id,
        actionType: 'PASSWORD_CHANGED',
        entityType: 'ADMIN',
        entityId: admin.id,
        details: 'Admin changed their password',
        ipAddress: req.ip,
      });

      res.json({ message: 'Password changed successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // Admin User Management
  static async listAdmins(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const admins = await prisma.admin.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ admins });
    } catch (error) {
      next(error);
    }
  }

  static async createAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, role } = createAdminSchema.parse(req.body);

      const existing = await prisma.admin.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existing) {
        res.status(409).json({ error: 'An admin with this email address already exists.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newAdmin = await prisma.admin.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'ADMIN_USER_CREATED',
        entityType: 'ADMIN',
        entityId: newAdmin.id,
        details: { name: newAdmin.name, email: newAdmin.email, role: newAdmin.role },
        ipAddress: req.ip,
      });

      res.status(201).json({ message: 'Admin user created successfully.', admin: newAdmin });
    } catch (error) {
      next(error);
    }
  }

  static async resetAdminPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { newPassword } = resetPasswordSchema.parse(req.body);

      const targetAdmin = await prisma.admin.findUnique({ where: { id } });
      if (!targetAdmin) {
        res.status(404).json({ error: 'Admin not found.' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.admin.update({
        where: { id },
        data: { passwordHash },
      });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'ADMIN_PASSWORD_RESET',
        entityType: 'ADMIN',
        entityId: id,
        details: `Password reset for admin: ${targetAdmin.email}`,
        ipAddress: req.ip,
      });

      res.json({ message: `Password reset successfully for ${targetAdmin.name}.` });
    } catch (error) {
      next(error);
    }
  }

  static async toggleAdminStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);

      if (req.admin?.id === id) {
        res.status(400).json({ error: 'You cannot deactivate your own admin account.' });
        return;
      }

      const targetAdmin = await prisma.admin.findUnique({ where: { id } });
      if (!targetAdmin) {
        res.status(404).json({ error: 'Admin not found.' });
        return;
      }

      const updated = await prisma.admin.update({
        where: { id },
        data: { isActive: !targetAdmin.isActive },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'ADMIN_STATUS_TOGGLED',
        entityType: 'ADMIN',
        entityId: id,
        details: `Status set to ${updated.isActive ? 'ACTIVE' : 'INACTIVE'} for ${updated.email}`,
        ipAddress: req.ip,
      });

      res.json({ message: `Admin account ${updated.isActive ? 'activated' : 'deactivated'}.`, admin: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);

      if (req.admin?.id === id) {
        res.status(400).json({ error: 'You cannot delete your own admin account.' });
        return;
      }

      const targetAdmin = await prisma.admin.findUnique({ where: { id } });
      if (!targetAdmin) {
        res.status(404).json({ error: 'Admin not found.' });
        return;
      }

      await prisma.admin.delete({ where: { id } });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'ADMIN_DELETED',
        entityType: 'ADMIN',
        entityId: id,
        details: `Deleted admin: ${targetAdmin.email}`,
        ipAddress: req.ip,
      });

      res.json({ message: 'Admin deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
}
