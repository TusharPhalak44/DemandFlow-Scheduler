import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/auditLogger.js';
import crypto from 'crypto';

const agentCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  defaultTimezone: z.string().default('America/New_York'),
});

const agentUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  defaultTimezone: z.string().optional(),
});

export class AgentController {
  static async listAgents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const agents = await prisma.agent.findMany({
        orderBy: { name: 'asc' },
        include: {
          bookingLinks: {
            where: { isActive: true },
            select: { id: true, token: true, name: true, clicksCount: true },
          },
          _count: {
            select: { bookings: true },
          },
        },
      });

      res.json({ agents });
    } catch (error) {
      next(error);
    }
  }

  static async createAgent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = agentCreateSchema.parse(req.body);

      const existing = await prisma.agent.findUnique({
        where: { email: parsed.email.toLowerCase() },
      });

      if (existing) {
        res.status(409).json({ error: 'An agent with this email already exists.' });
        return;
      }

      // Generate unique secure token for agent's direct booking link
      const token = `${parsed.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${crypto.randomBytes(4).toString('hex')}`;

      const agent = await prisma.agent.create({
        data: {
          name: parsed.name,
          email: parsed.email.toLowerCase(),
          phone: parsed.phone || null,
          status: parsed.status,
          defaultTimezone: parsed.defaultTimezone,
          bookingLinks: {
            create: {
              token,
              name: `${parsed.name}'s Booking Link`,
              isActive: true,
            },
          },
        },
        include: {
          bookingLinks: true,
        },
      });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'AGENT_CREATED',
        entityType: 'AGENT',
        entityId: agent.id,
        details: { name: agent.name, email: agent.email, token },
        ipAddress: req.ip,
      });

      res.status(201).json({ message: 'Agent created successfully.', agent });
    } catch (error) {
      next(error);
    }
  }

  static async updateAgent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const parsed = agentUpdateSchema.parse(req.body);

      const updated = await prisma.agent.update({
        where: { id },
        data: parsed,
      });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'AGENT_UPDATED',
        entityType: 'AGENT',
        entityId: id,
        details: parsed,
        ipAddress: req.ip,
      });

      res.json({ message: 'Agent updated successfully.', agent: updated });
    } catch (error) {
      next(error);
    }
  }

  static async listBookingLinks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const links = await prisma.bookingLink.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          agent: { select: { id: true, name: true, email: true } },
          _count: { select: { bookings: true } },
        },
      });

      res.json({ links });
    } catch (error) {
      next(error);
    }
  }

  static async toggleLinkStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { isActive } = req.body;

      const link = await prisma.bookingLink.update({
        where: { id },
        data: { isActive },
      });

      res.json({ message: 'Booking link status updated.', link });
    } catch (error) {
      next(error);
    }
  }
}
