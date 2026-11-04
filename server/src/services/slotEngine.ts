import { DateTime } from 'luxon';
import { prisma } from '../config/database.js';
import { HolidayEngine } from './holidayEngine.js';
import { TimezoneService } from './timezoneService.js';

export interface GeneratedSlot {
  slotStartUtc: string;
  slotEndUtc: string;
  displayTime: string;
  displayEndTime: string;
  displayRange: string;
  targetZone: string;
  durationMinutes: number;
}

export class SlotEngine {
  /**
   * Generates calendar month availability overview for the UI
   */
  static async getMonthAvailability(
    year: number,
    month: number,
    targetZone: string,
    clientCode?: string
  ): Promise<{
    year: number;
    month: number;
    targetZone: string;
    clientCode?: string;
    days: {
      date: string;
      dayOfWeek: number;
      isWorkingDay: boolean;
      isHoliday: boolean;
      holidayName?: string;
      isAvailable: boolean;
      availableSlotsCount: number;
    }[];
  }> {
    // 1. Check if client profile exists
    let clientProfile: any = null;
    if (clientCode) {
      clientProfile = await prisma.clientProfile.findUnique({
        where: { clientCode, isActive: true },
      });
    }

    const settings = await prisma.calendarSettings.findUnique({ where: { id: 1 } });
    const autoFederal = clientProfile?.autoFederalHolidays ?? (settings?.autoFederalHolidays ?? true);
    const minAdvanceHours = settings?.minAdvanceHours ?? 2;
    const maxAdvanceDays = settings?.maxAdvanceDays ?? 60;

    // Working days list (1 = Mon ... 7 = Sun)
    let workingDaysSet = new Set([1, 2, 3, 4, 5]);
    if (clientProfile?.workingDays) {
      workingDaysSet = new Set(
        clientProfile.workingDays.split(',').map((s: string) => parseInt(s.trim(), 10))
      );
    } else {
      const workingHours = await prisma.workingHours.findMany();
      workingDaysSet = new Set(workingHours.filter((wh) => wh.isWorkingDay).map((wh) => wh.dayOfWeek));
    }

    const nowUtc = DateTime.utc();
    const minAdvanceUtc = nowUtc.plus({ hours: minAdvanceHours });
    const maxDateUtc = nowUtc.plus({ days: maxAdvanceDays }).endOf('day');

    const startOfMonth = DateTime.fromObject({ year, month, day: 1 });
    const daysInMonth = startOfMonth.daysInMonth || 30;

    const resultDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDt = DateTime.fromObject({ year, month, day });
      const dateStr = currentDt.toFormat('yyyy-MM-dd');
      const dayOfWeek = currentDt.weekday; // 1 = Mon ... 7 = Sun

      const isWorkingDay = workingDaysSet.has(dayOfWeek);

      // Check min/max advance window
      const isTooEarly = currentDt.endOf('day').toUTC() < minAdvanceUtc;
      const isTooLate = currentDt.startOf('day').toUTC() > maxDateUtc;

      // Check holidays
      const holidayInfo = await HolidayEngine.checkHoliday(dateStr, autoFederal);

      // Check exceptions
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const exception = await prisma.calendarException.findUnique({
        where: { exceptionDate: startOfDay },
      });

      let isAvailable = false;
      let availableSlotsCount = 0;

      if (
        isWorkingDay &&
        !isTooEarly &&
        !isTooLate &&
        (!holidayInfo.isHoliday || holidayInfo.isPartial) &&
        (!exception || !exception.isBlocked)
      ) {
        // Slot count calculation for this date
        const slotsResult = await this.getAvailableSlotsForDate(dateStr, targetZone, clientCode);
        availableSlotsCount = slotsResult.slots.length;
        isAvailable = availableSlotsCount > 0;
      }

      resultDays.push({
        date: dateStr,
        dayOfWeek,
        isWorkingDay,
        isHoliday: holidayInfo.isHoliday,
        holidayName: holidayInfo.holidayName,
        isAvailable,
        availableSlotsCount,
      });
    }

    return {
      year,
      month,
      targetZone,
      clientCode,
      days: resultDays,
    };
  }

  /**
   * Generates all available slots for a specific date in the requested timezone
   */
  static async getAvailableSlotsForDate(
    dateStr: string,
    targetZone: string,
    clientCode?: string
  ): Promise<{
    date: string;
    targetZone: string;
    clientCode?: string;
    totalGenerated: number;
    availableCount: number;
    slots: GeneratedSlot[];
  }> {
    // 1. Check if client profile exists
    let clientProfile: any = null;
    if (clientCode) {
      clientProfile = await prisma.clientProfile.findUnique({
        where: { clientCode, isActive: true },
      });
    }

    const settings = await prisma.calendarSettings.findUnique({ where: { id: 1 } });
    const slotSettings = await prisma.slotSettings.findUnique({ where: { id: 1 } });

    const schedulingZone =
      clientProfile?.defaultTimezone || settings?.schedulingTimezone || 'America/New_York';
    const autoFederal = clientProfile?.autoFederalHolidays ?? (settings?.autoFederalHolidays ?? true);
    const minAdvanceHours = settings?.minAdvanceHours ?? 2;
    const maxAdvanceDays = settings?.maxAdvanceDays ?? 60;

    const durationMinutes =
      clientProfile?.meetingDurationMinutes || slotSettings?.meetingDurationMinutes || 20;
    const bufferMinutes =
      clientProfile?.bufferMinutes !== undefined
        ? clientProfile.bufferMinutes
        : (slotSettings?.bufferMinutes || 0);
    const slotInterval = durationMinutes + bufferMinutes;

    const targetDt = DateTime.fromISO(dateStr, { zone: schedulingZone });
    const dayOfWeek = targetDt.weekday; // 1 = Monday ... 7 = Sunday

    // 1. Working Hours check
    let isWorkingDay = false;
    let startTimeStr = '09:00';
    let endTimeStr = '17:00';

    if (clientProfile) {
      const clientDays = clientProfile.workingDays
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10));
      isWorkingDay = clientDays.includes(dayOfWeek);
      startTimeStr = clientProfile.startTime || '09:00';
      endTimeStr = clientProfile.endTime || '17:00';
    } else {
      const wh = await prisma.workingHours.findUnique({ where: { dayOfWeek } });
      if (wh && wh.isWorkingDay) {
        isWorkingDay = true;
        startTimeStr = wh.startTime;
        endTimeStr = wh.endTime;
      }
    }

    if (!isWorkingDay) {
      return { date: dateStr, targetZone, clientCode, totalGenerated: 0, availableCount: 0, slots: [] };
    }

    // 2. Holiday check
    const holidayInfo = await HolidayEngine.checkHoliday(dateStr, autoFederal);
    if (holidayInfo.isHoliday && !holidayInfo.isPartial) {
      return { date: dateStr, targetZone, clientCode, totalGenerated: 0, availableCount: 0, slots: [] };
    }

    // 3. Exception check
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const exception = await prisma.calendarException.findUnique({
      where: { exceptionDate: startOfDay },
    });
    if (exception?.isBlocked) {
      return { date: dateStr, targetZone, clientCode, totalGenerated: 0, availableCount: 0, slots: [] };
    }

    // Apply custom exception times if set
    if (exception?.customStartTime) startTimeStr = exception.customStartTime;
    if (exception?.customEndTime) endTimeStr = exception.customEndTime;

    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    let startLocal = targetDt.set({ hour: startH, minute: startM, second: 0, millisecond: 0 });
    const endLocal = targetDt.set({ hour: endH, minute: endM, second: 0, millisecond: 0 });

    const nowUtc = DateTime.utc();
    const minAdvanceUtc = nowUtc.plus({ hours: minAdvanceHours });
    const maxAdvanceUtc = nowUtc.plus({ days: maxAdvanceDays }).endOf('day');

    const generatedSlots: {
      startUtc: DateTime;
      endUtc: DateTime;
    }[] = [];

    while (startLocal.plus({ minutes: durationMinutes }) <= endLocal) {
      const slotEndLocal = startLocal.plus({ minutes: durationMinutes });
      const slotStartUtc = startLocal.toUTC();
      const slotEndUtc = slotEndLocal.toUTC();

      // Check min & max advance bounds
      if (slotStartUtc >= minAdvanceUtc && slotStartUtc <= maxAdvanceUtc) {
        let isInsidePartialHoliday = false;
        if (holidayInfo.isPartial && holidayInfo.startTime && holidayInfo.endTime) {
          const [pHStartH, pHStartM] = holidayInfo.startTime.split(':').map(Number);
          const [pHEndH, pHEndM] = holidayInfo.endTime.split(':').map(Number);
          const pStart = targetDt.set({ hour: pHStartH, minute: pHStartM });
          const pEnd = targetDt.set({ hour: pHEndH, minute: pHEndM });

          if (
            (startLocal >= pStart && startLocal < pEnd) ||
            (slotEndLocal > pStart && slotEndLocal <= pEnd)
          ) {
            isInsidePartialHoliday = true;
          }
        }

        if (!isInsidePartialHoliday) {
          generatedSlots.push({ startUtc: slotStartUtc, endUtc: slotEndUtc });
        }
      }

      startLocal = startLocal.plus({ minutes: slotInterval });
    }

    if (generatedSlots.length === 0) {
      return { date: dateStr, targetZone, clientCode, totalGenerated: 0, availableCount: 0, slots: [] };
    }

    // Query active bookings for this client (or global bookings)
    const utcDateRangeStart = generatedSlots[0].startUtc.toJSDate();
    const utcDateRangeEnd = generatedSlots[generatedSlots.length - 1].endUtc.toJSDate();

    const activeBookings = await prisma.booking.findMany({
      where: {
        ...(clientCode ? { clientCode } : {}),
        status: { in: ['CONFIRMED', 'PENDING'] },
        slotStartUtc: {
          gte: utcDateRangeStart,
          lte: utcDateRangeEnd,
        },
      },
      select: { slotStartUtc: true },
    });

    const bookedInstantsSet = new Set(
      activeBookings.map((b) => b.slotStartUtc.toISOString())
    );

    // Filter available slots and project into targetZone
    const availableSlots: GeneratedSlot[] = [];

    for (const slot of generatedSlots) {
      const isoStart = slot.startUtc.toJSDate().toISOString();
      if (!bookedInstantsSet.has(isoStart)) {
        const targetStart = slot.startUtc.setZone(targetZone);
        const targetEnd = slot.endUtc.setZone(targetZone);

        const displayTime = targetStart.toFormat('hh:mm a');
        const displayEndTime = targetEnd.toFormat('hh:mm a');

        availableSlots.push({
          slotStartUtc: isoStart,
          slotEndUtc: slot.endUtc.toJSDate().toISOString(),
          displayTime,
          displayEndTime,
          displayRange: `${displayTime} - ${displayEndTime}`,
          targetZone,
          durationMinutes,
        });
      }
    }

    return {
      date: dateStr,
      targetZone,
      clientCode,
      totalGenerated: generatedSlots.length,
      availableCount: availableSlots.length,
      slots: availableSlots,
    };
  }
}
