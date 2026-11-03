export interface TimezoneOption {
  id: string;
  label: string;
  abbrStandard: string;
  abbrDaylight: string;
  region: string;
}

export const US_TIMEZONES: TimezoneOption[] = [
  {
    id: 'America/New_York',
    label: 'Eastern Time (ET)',
    abbrStandard: 'EST',
    abbrDaylight: 'EDT',
    region: 'Eastern',
  },
  {
    id: 'America/Chicago',
    label: 'Central Time (CT)',
    abbrStandard: 'CST',
    abbrDaylight: 'CDT',
    region: 'Central',
  },
  {
    id: 'America/Denver',
    label: 'Mountain Time (MT)',
    abbrStandard: 'MST',
    abbrDaylight: 'MDT',
    region: 'Mountain',
  },
  {
    id: 'America/Los_Angeles',
    label: 'Pacific Time (PT)',
    abbrStandard: 'PST',
    abbrDaylight: 'PDT',
    region: 'Pacific',
  },
];

export const BOOKING_STATUS = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED_BY_ADMIN: 'CANCELLED_BY_ADMIN',
  CANCELLED_BY_AGENT: 'CANCELLED_BY_AGENT',
  RESCHEDULED: 'RESCHEDULED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type BookingStatusType = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
