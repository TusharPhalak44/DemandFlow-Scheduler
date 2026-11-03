import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { US_TIMEZONES } from '../config/constants.js';
import { SlotEngine } from '../services/slotEngine.js';
import { TimezoneService } from '../services/timezoneService.js';
import { DateTime } from 'luxon';

export class CalendarController {
  static async getTimezones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const nowUtc = DateTime.utc();
      const enrichedTimezones = US_TIMEZONES.map((tz) => {
        const localNow = nowUtc.setZone(tz.id);
        return {
          ...tz,
          currentLocalTime: localNow.toFormat('hh:mm a'),
          isDst: localNow.isInDST,
          currentAbbr: localNow.offsetNameShort,
          offsetMinutes: localNow.offset,
        };
      });

      res.json({ timezones: enrichedTimezones });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableDates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const monthQuery = (req.query.month as string) || DateTime.now().toFormat('yyyy-MM');
      const targetZone = (req.query.tz as string) || 'America/New_York';

      if (!TimezoneService.isValidTimezone(targetZone)) {
        res.status(400).json({ error: `Invalid timezone '${targetZone}'. Supported: ${US_TIMEZONES.map((t) => t.id).join(', ')}` });
        return;
      }

      const [yearStr, monthStr] = monthQuery.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM.' });
        return;
      }

      const availability = await SlotEngine.getMonthAvailability(year, month, targetZone);
      res.json(availability);
    } catch (error) {
      next(error);
    }
  }

  static async getSlotsForDate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateStr = req.query.date as string;
      const targetZone = (req.query.tz as string) || 'America/New_York';

      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        res.status(400).json({ error: 'Valid date query parameter required in YYYY-MM-DD format.' });
        return;
      }

      if (!TimezoneService.isValidTimezone(targetZone)) {
        res.status(400).json({ error: `Invalid timezone '${targetZone}'.` });
        return;
      }

      const slotsData = await SlotEngine.getAvailableSlotsForDate(dateStr, targetZone);
      res.json(slotsData);
    } catch (error) {
      next(error);
    }
  }

  static async resolveBookingLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;

      const link: any = await prisma.bookingLink.findUnique({
        where: { token: token as string },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
              defaultTimezone: true,
            },
          },
        },
      });

      if (!link || !link.isActive) {
        res.status(404).json({ error: 'Booking link not found or has been deactivated.' });
        return;
      }

      if (link.expiresAt && link.expiresAt < new Date()) {
        res.status(410).json({ error: 'This booking link has expired.' });
        return;
      }

      if (link.agent && link.agent.status !== 'ACTIVE') {
        res.status(400).json({ error: 'The agent associated with this booking link is currently inactive.' });
        return;
      }

      const settings = await prisma.calendarSettings.findUnique({ where: { id: 1 } });

      res.json({
        bookingLink: {
          id: link.id,
          token: link.token,
          name: link.name,
        },
        agent: link.agent || null,
        companyName: settings?.companyName || 'DemandFlow Scheduler',
        prospectEmailRequired: settings?.prospectEmailRequired ?? true,
        defaultTimezone: link.agent?.defaultTimezone || settings?.schedulingTimezone || 'America/New_York',
      });
    } catch (error) {
      next(error);
    }
  }
}
