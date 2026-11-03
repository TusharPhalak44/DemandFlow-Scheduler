import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { BookingEngine } from '../services/bookingEngine.js';
import { TimezoneService } from '../services/timezoneService.js';
import { IcsService } from '../services/icsService.js';
import { BOOKING_STATUS } from '../config/constants.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/auditLogger.js';

const publicBookingSchema = z.object({
  agentId: z.number().optional().nullable(),
  bookingLinkId: z.number().optional().nullable(),
  agentName: z.string().min(2, 'Agent name is required'),
  agentEmail: z.string().email('Valid agent email is required').optional().nullable(),
  prospectName: z.string().min(1).optional().nullable(),
  prospectEmail: z.string().email('Valid prospect email is required'),
  companyName: z.string().optional().nullable(),
  meetingPurpose: z.string().optional().nullable(),
  meetingNotes: z.string().optional().nullable(),
  slotStartUtc: z.string().datetime(),
  slotEndUtc: z.string().datetime(),
  bookedTimezone: z.string().min(1, 'Timezone is required'),
});

const rescheduleSchema = z.object({
  newSlotStartUtc: z.string().datetime(),
  newSlotEndUtc: z.string().datetime(),
  reason: z.string().optional(),
});

export class BookingController {
  /**
   * Public: Confirms a meeting booking with concurrency lock
   */
  static async bookMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = publicBookingSchema.parse(req.body);

      // Check if prospect email is required by calendar settings
      const settings = await prisma.calendarSettings.findUnique({ where: { id: 1 } });
      if (settings?.prospectEmailRequired && !parsed.prospectEmail) {
        res.status(400).json({ error: 'Prospect email is required.' });
        return;
      }

      const booking = await BookingEngine.createBooking({
        ...parsed,
        ipAddress: req.ip,
      });

      res.status(201).json({
        message: 'Meeting confirmed successfully!',
        bookingReference: booking.bookingReference,
        booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public: Retrieves confirmed booking details with 4 US Timezones formatted
   */
  static async getBookingByReference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reference } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { bookingReference: reference as string },
        include: {
          agent: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      if (!booking) {
        res.status(404).json({ error: 'Booking reference not found.' });
        return;
      }

      const slotSettings = await prisma.slotSettings.findUnique({ where: { id: 1 } });
      const duration = slotSettings?.meetingDurationMinutes || 20;

      // 4 US timezones formatting
      const multiTimezones = TimezoneService.formatAllFourUsTimezones(
        booking.slotStartUtc,
        duration
      );

      const targetFormatted = TimezoneService.formatSingleTimezone(
        booking.slotStartUtc,
        booking.bookedTimezone,
        duration
      );

      res.json({
        booking,
        formattedInBookedZone: targetFormatted,
        allFourTimezones: multiTimezones,
        durationMinutes: duration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public: Streams .ics calendar invite file
   */
  static async downloadIcs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reference } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { bookingReference: reference as string },
      });

      if (!booking) {
        res.status(404).json({ error: 'Booking reference not found.' });
        return;
      }

      const icsString = await IcsService.generateIcs({
        bookingReference: booking.bookingReference,
        agentName: booking.agentName,
        agentEmail: booking.agentEmail || 'agent@demandflow.com',
        prospectName: booking.prospectName || 'Valued Prospect',
        prospectEmail: booking.prospectEmail || 'contact@prospect.com',
        companyName: booking.companyName || 'DemandFlow Scheduler',
        meetingPurpose: booking.meetingPurpose || 'General Scheduling Discussion',
        meetingNotes: booking.meetingNotes || undefined,
        slotStartUtc: booking.slotStartUtc,
        slotEndUtc: booking.slotEndUtc,
        bookedTimezone: booking.bookedTimezone,
      });

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${booking.bookingReference}.ics"`);
      res.send(icsString);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: List bookings with filters & pagination
   */
  static async adminListBookings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 15;
      const skip = (page - 1) * limit;

      const search = (req.query.search as string)?.trim();
      const status = req.query.status as string;
      const agentId = req.query.agentId ? parseInt(req.query.agentId as string, 10) : undefined;
      const timezone = req.query.timezone as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const where: any = {};

      if (search) {
        where.OR = [
          { bookingReference: { contains: search } },
          { prospectName: { contains: search } },
          { prospectEmail: { contains: search } },
          { agentName: { contains: search } },
          { agentEmail: { contains: search } },
          { companyName: { contains: search } },
        ];
      }

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (agentId) {
        where.agentId = agentId;
      }

      if (timezone) {
        where.bookedTimezone = timezone;
      }

      if (startDate || endDate) {
        where.slotStartUtc = {};
        if (startDate) {
          where.slotStartUtc.gte = new Date(`${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
          where.slotStartUtc.lte = new Date(`${endDate}T23:59:59.999Z`);
        }
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          orderBy: { slotStartUtc: 'desc' },
          skip,
          take: limit,
          include: {
            agent: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.booking.count({ where }),
      ]);

      res.json({
        bookings,
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

  /**
   * Admin: Cancel a booking and release the slot
   */
  static async adminCancelBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = parseInt(req.params.id as string, 10);
      const { reason } = req.body;

      const cancelled = await BookingEngine.cancelBooking({
        bookingId,
        cancelledBy: 'ADMIN',
        adminId: req.admin?.id,
        reason,
        ipAddress: req.ip,
      });

      res.json({
        message: 'Booking cancelled and slot released successfully.',
        booking: cancelled,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Reschedule a booking
   */
  static async adminRescheduleBooking(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = parseInt(req.params.id as string, 10);
      const { newSlotStartUtc, newSlotEndUtc, reason } = rescheduleSchema.parse(req.body);

      const result = await BookingEngine.rescheduleBooking({
        bookingId,
        newSlotStartUtc,
        newSlotEndUtc,
        adminId: req.admin?.id,
        reason,
        ipAddress: req.ip,
      });

      res.json({
        message: 'Booking rescheduled successfully.',
        newBooking: result.newBooking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Update booking status directly (COMPLETED, NO_SHOW)
   */
  static async adminUpdateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = parseInt(req.params.id as string, 10);
      const { status } = req.body;

      if (!['COMPLETED', 'NO_SHOW', 'CONFIRMED'].includes(status)) {
        res.status(400).json({ error: 'Invalid status for direct status update. Use cancel endpoint to cancel.' });
        return;
      }

      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { status },
      });

      await logActivity({
        adminId: req.admin?.id,
        actionType: `BOOKING_STATUS_${status}`,
        entityType: 'BOOKING',
        entityId: updated.bookingReference,
        details: { status },
        ipAddress: req.ip,
      });

      res.json({ message: 'Booking status updated successfully.', booking: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Export bookings to CSV
   */
  static async adminExportCsv(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookings = await prisma.booking.findMany({
        orderBy: { slotStartUtc: 'desc' },
      });

      const headers = [
        'Reference',
        'Status',
        'Slot Start (UTC)',
        'Slot End (UTC)',
        'Timezone',
        'Prospect Name',
        'Prospect Email',
        'Company',
        'Agent Name',
        'Agent Email',
        'Purpose',
        'Created At',
      ];

      const rows = bookings.map((b) => [
        `"${b.bookingReference}"`,
        `"${b.status}"`,
        `"${b.slotStartUtc.toISOString()}"`,
        `"${b.slotEndUtc.toISOString()}"`,
        `"${b.bookedTimezone}"`,
        `"${(b.prospectName || '').replace(/"/g, '""')}"`,
        `"${(b.prospectEmail || '').replace(/"/g, '""')}"`,
        `"${(b.companyName || '').replace(/"/g, '""')}"`,
        `"${(b.agentName || '').replace(/"/g, '""')}"`,
        `"${(b.agentEmail || '').replace(/"/g, '""')}"`,
        `"${(b.meetingPurpose || '').replace(/"/g, '""')}"`,
        `"${b.createdAt.toISOString()}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="bookings_report.csv"');
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}
