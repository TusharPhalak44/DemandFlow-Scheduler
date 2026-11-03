import { DateTime } from 'luxon';
import { prisma } from '../config/database.js';

export interface CalculatedHoliday {
  name: string;
  actualDate: string; // YYYY-MM-DD
  observedDate: string; // YYYY-MM-DD
}

export class HolidayEngine {
  /**
   * Helper to get nth occurrence of a weekday in a given month & year
   * weekday: 1 = Monday ... 7 = Sunday
   */
  private static getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): DateTime {
    let dt = DateTime.fromObject({ year, month, day: 1 });
    let count = 0;
    while (dt.month === month) {
      if (dt.weekday === weekday) {
        count++;
        if (count === n) return dt;
      }
      dt = dt.plus({ days: 1 });
    }
    throw new Error(`Could not find ${n}th weekday ${weekday} in month ${month}/${year}`);
  }

  /**
   * Helper to get last occurrence of a weekday in a given month & year
   */
  private static getLastWeekdayOfMonth(year: number, month: number, weekday: number): DateTime {
    let dt = DateTime.fromObject({ year, month, day: 1 }).endOf('month').startOf('day');
    while (dt.month === month) {
      if (dt.weekday === weekday) {
        return dt;
      }
      dt = dt.minus({ days: 1 });
    }
    throw new Error(`Could not find last weekday ${weekday} in month ${month}/${year}`);
  }

  /**
   * Applies US Federal observation rule:
   * If Saturday -> Friday before
   * If Sunday -> Monday after
   */
  private static getObservedDate(actualDt: DateTime): DateTime {
    if (actualDt.weekday === 6) {
      // Saturday -> Observed Friday
      return actualDt.minus({ days: 1 });
    }
    if (actualDt.weekday === 7) {
      // Sunday -> Observed Monday
      return actualDt.plus({ days: 1 });
    }
    return actualDt;
  }

  /**
   * Computes all US Federal Holidays and their observed dates for a given year
   */
  static getFederalHolidaysForYear(year: number): CalculatedHoliday[] {
    const list: { name: string; actual: DateTime }[] = [
      // 1. New Year's Day (Jan 1)
      { name: "New Year's Day", actual: DateTime.fromObject({ year, month: 1, day: 1 }) },
      // 2. Martin Luther King Jr. Day (3rd Monday of Jan)
      { name: 'Martin Luther King Jr. Day', actual: this.getNthWeekdayOfMonth(year, 1, 1, 3) },
      // 3. Washington's Birthday (3rd Monday of Feb)
      { name: "Washington's Birthday / Presidents' Day", actual: this.getNthWeekdayOfMonth(year, 2, 1, 3) },
      // 4. Memorial Day (Last Monday of May)
      { name: 'Memorial Day', actual: this.getLastWeekdayOfMonth(year, 5, 1) },
      // 5. Juneteenth National Independence Day (June 19)
      { name: 'Juneteenth National Independence Day', actual: DateTime.fromObject({ year, month: 6, day: 19 }) },
      // 6. Independence Day (July 4)
      { name: 'Independence Day', actual: DateTime.fromObject({ year, month: 7, day: 4 }) },
      // 7. Labor Day (1st Monday of Sept)
      { name: 'Labor Day', actual: this.getNthWeekdayOfMonth(year, 9, 1, 1) },
      // 8. Columbus Day (2nd Monday of Oct)
      { name: 'Columbus Day', actual: this.getNthWeekdayOfMonth(year, 10, 1, 2) },
      // 9. Veterans Day (Nov 11)
      { name: 'Veterans Day', actual: DateTime.fromObject({ year, month: 11, day: 11 }) },
      // 10. Thanksgiving Day (4th Thursday of Nov)
      { name: 'Thanksgiving Day', actual: this.getNthWeekdayOfMonth(year, 11, 4, 4) },
      // 11. Christmas Day (Dec 25)
      { name: 'Christmas Day', actual: DateTime.fromObject({ year, month: 12, day: 25 }) },
    ];

    return list.map((item) => {
      const observed = this.getObservedDate(item.actual);
      return {
        name: item.name,
        actualDate: item.actual.toFormat('yyyy-MM-dd'),
        observedDate: observed.toFormat('yyyy-MM-dd'),
      };
    });
  }

  /**
   * Checks if a specific date (YYYY-MM-DD) is a holiday (federal or custom company holiday)
   */
  static async checkHoliday(
    dateStr: string,
    autoFederal: boolean = true
  ): Promise<{
    isHoliday: boolean;
    holidayName?: string;
    isFederal?: boolean;
    isPartial?: boolean;
    startTime?: string | null;
    endTime?: string | null;
  }> {
    const targetDt = DateTime.fromISO(dateStr);
    const year = targetDt.year;

    // 1. Check US Federal Holidays if enabled
    if (autoFederal) {
      const fedHolidays = this.getFederalHolidaysForYear(year);
      // Check both actual and observed matches
      const matchedFed = fedHolidays.find(
        (h) => h.observedDate === dateStr || h.actualDate === dateStr
      );
      if (matchedFed) {
        return {
          isHoliday: true,
          holidayName: `${matchedFed.name} (US Federal Holiday)`,
          isFederal: true,
          isPartial: false,
        };
      }
    }

    // 2. Check Custom Company Holidays in DB
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const customHolidays = await prisma.holiday.findMany({
      where: {
        OR: [
          { holidayDate: startOfDay },
          { isRecurring: true },
        ],
      },
    });

    for (const h of customHolidays) {
      if (h.isRecurring) {
        const hDt = DateTime.fromJSDate(h.holidayDate);
        if (hDt.month === targetDt.month && hDt.day === targetDt.day) {
          return {
            isHoliday: true,
            holidayName: `${h.name} (Annual Company Holiday)`,
            isFederal: h.isFederal,
            isPartial: h.isPartial,
            startTime: h.startTime,
            endTime: h.endTime,
          };
        }
      } else {
        const hIso = DateTime.fromJSDate(h.holidayDate).toFormat('yyyy-MM-dd');
        if (hIso === dateStr) {
          return {
            isHoliday: true,
            holidayName: h.name,
            isFederal: h.isFederal,
            isPartial: h.isPartial,
            startTime: h.startTime,
            endTime: h.endTime,
          };
        }
      }
    }

    return { isHoliday: false };
  }
}
