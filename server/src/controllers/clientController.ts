import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { SlotEngine } from '../services/slotEngine.js';
import { DateTime } from 'luxon';

export class ClientController {
  /**
   * Public: List available active client codes and names
   */
  static async listPublicClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clients = await prisma.clientProfile.findMany({
        where: { isActive: true },
        select: {
          id: true,
          clientCode: true,
          name: true,
          description: true,
          defaultTimezone: true,
          meetingDurationMinutes: true,
        },
        orderBy: { clientCode: 'asc' },
      });

      res.json({ clients });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public: Get full settings for a specific client code
   */
  static async getPublicClientByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientCode = (req.params.clientCode as string)?.trim();
      if (!clientCode) {
        res.status(400).json({ error: 'Client code is required.' });
        return;
      }

      const client = await prisma.clientProfile.findUnique({
        where: { clientCode },
      });

      if (!client || !client.isActive) {
        res.status(404).json({ error: `Client with code '${clientCode}' not found or inactive.` });
        return;
      }

      res.json({ client });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: List all clients with their booking counts & slot metrics
   */
  static async listAdminClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clients = await prisma.clientProfile.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bookings: true },
          },
        },
      });

      // Calculate current month's booked vs open slots for each client
      const currentMonth = DateTime.now().toFormat('yyyy-MM');
      const [yearStr, monthStr] = currentMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const clientsWithMetrics = await Promise.all(
        clients.map(async (client) => {
          const confirmedBookingsCount = await prisma.booking.count({
            where: {
              clientCode: client.clientCode,
              status: 'CONFIRMED',
            },
          });

          const cancelledBookingsCount = await prisma.booking.count({
            where: {
              clientCode: client.clientCode,
              status: 'CANCELLED',
            },
          });

          // Availability overview for current month
          const monthData = await SlotEngine.getMonthAvailability(
            year,
            month,
            client.defaultTimezone || 'America/New_York',
            client.clientCode
          );

          const openSlotsCount = monthData.days.reduce(
            (sum, d) => sum + (d.isAvailable ? d.availableSlotsCount : 0),
            0
          );

          const totalSlotsMonth = openSlotsCount + confirmedBookingsCount;
          const occupancyRate =
            totalSlotsMonth > 0
              ? Math.round((confirmedBookingsCount / totalSlotsMonth) * 100)
              : 0;

          return {
            ...client,
            totalBookingsCount: client._count.bookings,
            confirmedBookingsCount,
            cancelledBookingsCount,
            openSlotsCount,
            occupancyRate,
          };
        })
      );

      res.json({ clients: clientsWithMetrics });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get client statistics and bookings
   */
  static async getClientStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientCode = (req.params.clientCode as string)?.trim();
      const client = await prisma.clientProfile.findUnique({
        where: { clientCode },
      });

      if (!client) {
        res.status(404).json({ error: `Client with code '${clientCode}' not found.` });
        return;
      }

      const totalBookings = await prisma.booking.count({
        where: { clientCode },
      });

      const confirmedBookings = await prisma.booking.count({
        where: { clientCode, status: 'CONFIRMED' },
      });

      const cancelledBookings = await prisma.booking.count({
        where: { clientCode, status: 'CANCELLED' },
      });

      // Calculate availability for this month
      const now = DateTime.now();
      const monthData = await SlotEngine.getMonthAvailability(
        now.year,
        now.month,
        client.defaultTimezone || 'America/New_York',
        clientCode
      );

      const openSlots = monthData.days.reduce(
        (sum, d) => sum + (d.isAvailable ? d.availableSlotsCount : 0),
        0
      );

      const bookings = await prisma.booking.findMany({
        where: { clientCode },
        orderBy: { slotStartUtc: 'desc' },
        take: 50,
      });

      const totalCapacity = openSlots + confirmedBookings;
      const occupancyRate =
        totalCapacity > 0 ? Math.round((confirmedBookings / totalCapacity) * 100) : 0;

      res.json({
        client,
        stats: {
          totalBookings,
          confirmedBookings,
          cancelledBookings,
          openSlots,
          totalCapacity,
          occupancyRate,
        },
        recentBookings: bookings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Create a new client profile
   */
  static async createAdminClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        clientCode,
        name,
        description,
        defaultTimezone,
        meetingDurationMinutes,
        bufferMinutes,
        slotsPerHour,
        workingDays,
        startTime,
        endTime,
        autoFederalHolidays,
      } = req.body;

      if (!clientCode || !clientCode.trim()) {
        res.status(400).json({ error: 'Client code is required (e.g. 1050, 4020).' });
        return;
      }

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Client name is required.' });
        return;
      }

      const cleanCode = clientCode.trim();
      const existing = await prisma.clientProfile.findUnique({
        where: { clientCode: cleanCode },
      });

      if (existing) {
        res.status(409).json({ error: `Client with code '${cleanCode}' already exists.` });
        return;
      }

      const created = await prisma.clientProfile.create({
        data: {
          clientCode: cleanCode,
          name: name.trim(),
          description: description?.trim() || null,
          defaultTimezone: defaultTimezone?.trim() || 'America/New_York',
          meetingDurationMinutes: Number(meetingDurationMinutes) || 20,
          bufferMinutes: Number(bufferMinutes) || 0,
          slotsPerHour: Number(slotsPerHour) || 3,
          workingDays: workingDays || '1,2,3,4,5',
          startTime: startTime || '09:00',
          endTime: endTime || '17:00',
          autoFederalHolidays: autoFederalHolidays ?? true,
          isActive: true,
        },
      });

      res.status(201).json({
        message: `Client ${cleanCode} created successfully!`,
        client: created,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Update client settings
   */
  static async updateAdminClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientCode = (req.params.clientCode as string)?.trim();
      const {
        name,
        description,
        defaultTimezone,
        meetingDurationMinutes,
        bufferMinutes,
        slotsPerHour,
        workingDays,
        startTime,
        endTime,
        autoFederalHolidays,
        isActive,
      } = req.body;

      const existing = await prisma.clientProfile.findUnique({
        where: { clientCode },
      });

      if (!existing) {
        res.status(404).json({ error: `Client with code '${clientCode}' not found.` });
        return;
      }

      const updated = await prisma.clientProfile.update({
        where: { clientCode },
        data: {
          name: name !== undefined ? name.trim() : existing.name,
          description: description !== undefined ? description?.trim() || null : existing.description,
          defaultTimezone: defaultTimezone || existing.defaultTimezone,
          meetingDurationMinutes:
            meetingDurationMinutes !== undefined ? Number(meetingDurationMinutes) : existing.meetingDurationMinutes,
          bufferMinutes: bufferMinutes !== undefined ? Number(bufferMinutes) : existing.bufferMinutes,
          slotsPerHour: slotsPerHour !== undefined ? Number(slotsPerHour) : existing.slotsPerHour,
          workingDays: workingDays || existing.workingDays,
          startTime: startTime || existing.startTime,
          endTime: endTime || existing.endTime,
          autoFederalHolidays:
            autoFederalHolidays !== undefined ? autoFederalHolidays : existing.autoFederalHolidays,
          isActive: isActive !== undefined ? isActive : existing.isActive,
        },
      });

      res.json({
        message: `Client ${clientCode} updated successfully.`,
        client: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Delete or toggle client
   */
  static async deleteAdminClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientCode = (req.params.clientCode as string)?.trim();
      const existing = await prisma.clientProfile.findUnique({
        where: { clientCode },
      });

      if (!existing) {
        res.status(404).json({ error: `Client with code '${clientCode}' not found.` });
        return;
      }

      // Check if bookings exist
      const bookingCount = await prisma.booking.count({
        where: { clientCode },
      });

      if (bookingCount > 0) {
        // Deactivate instead of hard delete to preserve historical booking data
        await prisma.clientProfile.update({
          where: { clientCode },
          data: { isActive: false },
        });
        res.json({
          message: `Client ${clientCode} deactivated (preserved ${bookingCount} historical bookings).`,
        });
        return;
      }

      await prisma.clientProfile.delete({
        where: { clientCode },
      });

      res.json({ message: `Client ${clientCode} deleted successfully.` });
    } catch (error) {
      next(error);
    }
  }
}
