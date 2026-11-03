import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/auditLogger.js';

const calendarSettingsSchema = z.object({
  companyName: z.string().min(2),
  schedulingTimezone: z.string().min(2),
  autoFederalHolidays: z.boolean(),
  minAdvanceHours: z.number().int().min(0).max(168),
  maxAdvanceDays: z.number().int().min(1).max(365),
  prospectEmailRequired: z.boolean(),
});

const workingHoursArraySchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(1).max(7),
    dayName: z.string(),
    isWorkingDay: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
);

const slotSettingsSchema = z.object({
  meetingDurationMinutes: z.number().int().min(5).max(480),
  slotsPerHour: z.number().int().min(1).max(12),
  bufferMinutes: z.number().int().min(0).max(120),
});

export class SettingsController {
  static async getCalendarSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await prisma.calendarSettings.findUnique({ where: { id: 1 } });
      res.json({ settings });
    } catch (error) {
      next(error);
    }
  }

  static async updateCalendarSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = calendarSettingsSchema.partial().parse(req.body);
      const updated = await prisma.calendarSettings.update({
        where: { id: 1 },
        data: parsed,
      });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'CALENDAR_SETTINGS_UPDATED',
        entityType: 'SETTINGS',
        entityId: 1,
        details: parsed,
        ipAddress: req.ip,
      });

      res.json({ message: 'Calendar settings updated successfully.', settings: updated });
    } catch (error) {
      next(error);
    }
  }

  static async getWorkingHours(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workingHours = await prisma.workingHours.findMany({
        orderBy: { dayOfWeek: 'asc' },
      });
      res.json({ workingHours });
    } catch (error) {
      next(error);
    }
  }

  static async updateWorkingHours(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedList = workingHoursArraySchema.parse(req.body);

      await prisma.$transaction(
        parsedList.map((wh) =>
          prisma.workingHours.upsert({
            where: { dayOfWeek: wh.dayOfWeek },
            update: {
              dayName: wh.dayName,
              isWorkingDay: wh.isWorkingDay,
              startTime: wh.startTime,
              endTime: wh.endTime,
            },
            create: wh,
          })
        )
      );

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'WORKING_HOURS_UPDATED',
        entityType: 'WORKING_HOURS',
        details: parsedList,
        ipAddress: req.ip,
      });

      const updated = await prisma.workingHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
      res.json({ message: 'Working hours updated successfully.', workingHours: updated });
    } catch (error) {
      next(error);
    }
  }

  static async getSlotSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const slotSettings = await prisma.slotSettings.findUnique({ where: { id: 1 } });
      res.json({ slotSettings });
    } catch (error) {
      next(error);
    }
  }

  static async updateSlotSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = slotSettingsSchema.parse(req.body);
      const updated = await prisma.slotSettings.update({
        where: { id: 1 },
        data: parsed,
      });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'SLOT_SETTINGS_UPDATED',
        entityType: 'SLOT_SETTINGS',
        entityId: 1,
        details: parsed,
        ipAddress: req.ip,
      });

      res.json({ message: 'Slot configuration updated successfully.', slotSettings: updated });
    } catch (error) {
      next(error);
    }
  }
}
