import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { HolidayEngine } from '../services/holidayEngine.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/auditLogger.js';
import { DateTime } from 'luxon';

const holidayCreateSchema = z.object({
  name: z.string().min(2),
  holidayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isRecurring: z.boolean().default(false),
  isPartial: z.boolean().default(false),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

export class HolidayController {
  static async listHolidays(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await prisma.calendarSettings.findUnique({ where: { id: 1 } });
      const currentYear = DateTime.now().year;

      const federalHolidaysCurrent = HolidayEngine.getFederalHolidaysForYear(currentYear);
      const federalHolidaysNext = HolidayEngine.getFederalHolidaysForYear(currentYear + 1);

      const customHolidays = await prisma.holiday.findMany({
        orderBy: { holidayDate: 'asc' },
      });

      res.json({
        autoFederalHolidaysEnabled: settings?.autoFederalHolidays ?? true,
        federalHolidays: [...federalHolidaysCurrent, ...federalHolidaysNext],
        customHolidays,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createCustomHoliday(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = holidayCreateSchema.parse(req.body);

      const holiday = await prisma.holiday.create({
        data: {
          name: parsed.name,
          holidayDate: new Date(`${parsed.holidayDate}T00:00:00.000Z`),
          isFederal: false,
          isRecurring: parsed.isRecurring,
          isPartial: parsed.isPartial,
          startTime: parsed.isPartial ? parsed.startTime : null,
          endTime: parsed.isPartial ? parsed.endTime : null,
        },
      });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'CUSTOM_HOLIDAY_CREATED',
        entityType: 'HOLIDAY',
        entityId: holiday.id,
        details: parsed,
        ipAddress: req.ip,
      });

      res.status(201).json({ message: 'Custom holiday created successfully.', holiday });
    } catch (error) {
      next(error);
    }
  }

  static async deleteHoliday(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);

      const holiday = await prisma.holiday.findUnique({ where: { id } });
      if (!holiday) {
        res.status(404).json({ error: 'Holiday not found.' });
        return;
      }

      await prisma.holiday.delete({ where: { id } });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'CUSTOM_HOLIDAY_DELETED',
        entityType: 'HOLIDAY',
        entityId: id,
        details: { name: holiday.name },
        ipAddress: req.ip,
      });

      res.json({ message: 'Holiday deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  static async toggleFederalHolidays(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'Field "enabled" must be a boolean.' });
        return;
      }

      const updated = await prisma.calendarSettings.update({
        where: { id: 1 },
        data: { autoFederalHolidays: enabled },
      });

      await logActivity({
        adminId: req.admin?.id,
        actionType: 'FEDERAL_HOLIDAYS_TOGGLED',
        entityType: 'SETTINGS',
        details: { autoFederalHolidays: enabled },
        ipAddress: req.ip,
      });

      res.json({
        message: `Automatic US Federal Holidays ${enabled ? 'enabled' : 'disabled'}.`,
        autoFederalHolidays: updated.autoFederalHolidays,
      });
    } catch (error) {
      next(error);
    }
  }
}
