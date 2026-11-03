
import { DateTime } from 'luxon';
import { US_TIMEZONES } from '../config/constants.js';

export class TimezoneService {
  /**
   * Validates if timezone identifier is one of the 4 supported US timezones
   */
  static isValidTimezone(zone: string): boolean {
    return US_TIMEZONES.some((tz) => tz.id === zone);
  }

  /**
   * Converts a given local date (YYYY-MM-DD) and local time (HH:mm) in a specific timezone into UTC DateTime
   */
  static localToUtc(dateStr: string, timeStr: string, zone: string): DateTime {
    const combinedIso = `${dateStr}T${timeStr}:00`;
    const dt = DateTime.fromISO(combinedIso, { zone });
    return dt.toUTC();
  }

  /**
   * Converts UTC Date/DateTime into target timezone formatted representation
   */
  static utcToTargetZone(utcDate: Date | string, targetZone: string): DateTime {
    const isoString = utcDate instanceof Date ? utcDate.toISOString() : utcDate;
    return DateTime.fromISO(isoString, { zone: 'utc' }).setZone(targetZone);
  }

  /**
   * Formats a meeting instant across all 4 US Timezones for the copy button
   */
  static formatAllFourUsTimezones(utcDate: Date | string, durationMinutes: number): {
    zoneId: string;
    label: string;
    formattedTime: string;
    formattedFull: string;
  }[] {
    const isoString = utcDate instanceof Date ? utcDate.toISOString() : utcDate;
    const baseUtc = DateTime.fromISO(isoString, { zone: 'utc' });

    return US_TIMEZONES.map((tz) => {
      const zonedStart = baseUtc.setZone(tz.id);
      const zonedEnd = zonedStart.plus({ minutes: durationMinutes });

      const dateStr = zonedStart.toFormat('EEEE, MMMM d, yyyy');
      const timeStr = `${zonedStart.toFormat('hh:mm a')} - ${zonedEnd.toFormat('hh:mm a')} ${zonedStart.offsetNameShort}`;

      return {
        zoneId: tz.id,
        label: tz.label,
        formattedTime: timeStr,
        formattedFull: `${dateStr} at ${timeStr}`,
      };
    });
  }

  /**
   * Formats single meeting details block in target timezone
   */
  static formatSingleTimezone(utcDate: Date | string, targetZone: string, durationMinutes: number) {
    const isoString = utcDate instanceof Date ? utcDate.toISOString() : utcDate;
    const zonedStart = DateTime.fromISO(isoString, { zone: 'utc' }).setZone(targetZone);
    const zonedEnd = zonedStart.plus({ minutes: durationMinutes });

    return {
      date: zonedStart.toFormat('EEEE, MMMM d, yyyy'),
      time: `${zonedStart.toFormat('hh:mm a')} - ${zonedEnd.toFormat('hh:mm a')}`,
      timeWithZone: `${zonedStart.toFormat('hh:mm a')} - ${zonedEnd.toFormat('hh:mm a')} ${zonedStart.offsetNameShort}`,
      shortDate: zonedStart.toFormat('yyyy-MM-dd'),
      shortStartTime: zonedStart.toFormat('HH:mm'),
      shortEndTime: zonedEnd.toFormat('HH:mm'),
      tzAbbr: zonedStart.offsetNameShort,
    };
  }
}
