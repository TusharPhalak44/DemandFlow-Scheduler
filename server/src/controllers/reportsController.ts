import { Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { BOOKING_STATUS } from '../config/constants.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { DateTime } from 'luxon';

export class ReportsController {
  static async getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const nowUtc = DateTime.utc();
      const startOfTodayUtc = nowUtc.startOf('day').toJSDate();
      const endOfTodayUtc = nowUtc.endOf('day').toJSDate();
      const startOfWeekUtc = nowUtc.minus({ days: 7 }).toJSDate();
      const startOfMonthUtc = nowUtc.minus({ days: 30 }).toJSDate();

      const [
        todayBookingsCount,
        upcomingBookingsCount,
        cancelledCount,
        weeklyCount,
        monthlyCount,
        totalBookingsCount,
        activeAgentsCount,
      ] = await Promise.all([
        // 1. Today's bookings
        prisma.booking.count({
          where: {
            slotStartUtc: { gte: startOfTodayUtc, lte: endOfTodayUtc },
            status: BOOKING_STATUS.CONFIRMED,
          },
        }),
        // 2. Upcoming meetings
        prisma.booking.count({
          where: {
            slotStartUtc: { gte: nowUtc.toJSDate() },
            status: BOOKING_STATUS.CONFIRMED,
          },
        }),
        // 3. Cancelled meetings
        prisma.booking.count({
          where: {
            status: {
              in: [BOOKING_STATUS.CANCELLED_BY_ADMIN, BOOKING_STATUS.CANCELLED_BY_AGENT],
            },
          },
        }),
        // 4. Past 7 days bookings
        prisma.booking.count({
          where: { createdAt: { gte: startOfWeekUtc } },
        }),
        // 5. Past 30 days bookings
        prisma.booking.count({
          where: { createdAt: { gte: startOfMonthUtc } },
        }),
        // 6. Total bookings
        prisma.booking.count(),
        // 7. Active agents
        prisma.agent.count({ where: { status: 'ACTIVE' } }),
      ]);

      // Agent-wise booking breakdown
      const agentStats = await prisma.agent.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: { bookings: true },
          },
        },
        orderBy: {
          bookings: { _count: 'desc' },
        },
        take: 5,
      });

      // Timezone-wise breakdown
      const timezoneGroups = await prisma.booking.groupBy({
        by: ['bookedTimezone'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      // Status breakdown
      const statusGroups = await prisma.booking.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      // Recent 5 bookings
      const recentBookings = await prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { agent: { select: { name: true } } },
      });

      res.json({
        metrics: {
          todayBookingsCount,
          upcomingBookingsCount,
          cancelledCount,
          weeklyCount,
          monthlyCount,
          totalBookingsCount,
          activeAgentsCount,
        },
        agentWiseStats: agentStats.map((a) => ({
          agentId: a.id,
          name: a.name,
          email: a.email,
          count: a._count.bookings,
        })),
        timezoneDistribution: timezoneGroups.map((tz) => ({
          timezone: tz.bookedTimezone,
          count: tz._count.id,
        })),
        statusDistribution: statusGroups.map((s) => ({
          status: s.status,
          count: s._count.id,
        })),
        recentBookings,
      });
    } catch (error) {
      next(error);
    }
  }
}
