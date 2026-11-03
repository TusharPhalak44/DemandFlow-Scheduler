import { Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export class ActivityLogController {
  static async listLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const skip = (page - 1) * limit;

      const actionType = req.query.actionType as string;
      const entityType = req.query.entityType as string;
      const search = (req.query.search as string)?.trim();

      const where: any = {};

      if (actionType) {
        where.actionType = actionType;
      }
      if (entityType) {
        where.entityType = entityType;
      }
      if (search) {
        where.OR = [
          { actionType: { contains: search } },
          { entityType: { contains: search } },
          { entityId: { contains: search } },
          { details: { contains: search } },
        ];
      }

      const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            admin: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.activityLog.count({ where }),
      ]);

      res.json({
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
