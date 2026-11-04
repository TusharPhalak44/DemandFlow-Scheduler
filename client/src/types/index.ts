export interface TimezoneOption {
  id: string;
  label: string;
  abbrStandard: string;
  abbrDaylight: string;
  region: string;
  currentLocalTime?: string;
  isDst?: boolean;
  currentAbbr?: string;
  offsetMinutes?: number;
}

export interface GeneratedSlot {
  slotStartUtc: string;
  slotEndUtc: string;
  displayTime: string;
  displayEndTime: string;
  displayRange: string;
  targetZone: string;
  durationMinutes: number;
}

export interface MonthDayAvailability {
  date: string;
  dayOfWeek: number;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isAvailable: boolean;
  availableSlotsCount: number;
}

export interface MonthAvailabilityResponse {
  year: number;
  month: number;
  targetZone: string;
  days: MonthDayAvailability[];
}

export interface Booking {
  id: number;
  bookingReference: string;
  clientCode?: string | null;
  clientId?: number | null;
  agentId?: number | null;
  bookingLinkId?: number | null;
  agentName: string;
  agentEmail?: string | null;
  prospectName?: string | null;
  prospectEmail?: string | null;
  companyName?: string | null;
  meetingPurpose?: string | null;
  meetingNotes?: string | null;
  slotStartUtc: string;
  slotEndUtc: string;
  bookedTimezone: string;
  status: 'CONFIRMED' | 'CANCELLED_BY_ADMIN' | 'CANCELLED_BY_AGENT' | 'RESCHEDULED' | 'COMPLETED' | 'NO_SHOW';
  cancellationReason?: string | null;
  rescheduledFromId?: number | null;
  createdAt: string;
  updatedAt: string;
  agent?: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
  };
}

export interface MultiTimezoneFormat {
  zoneId: string;
  label: string;
  formattedTime: string;
  formattedFull: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AdminAccount {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface CalendarSettings {
  id: number;
  companyName: string;
  schedulingTimezone: string;
  autoFederalHolidays: boolean;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  prospectEmailRequired: boolean;
}

export interface WorkingHours {
  id: number;
  dayOfWeek: number;
  dayName: string;
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
}

export interface SlotSettings {
  id: number;
  meetingDurationMinutes: number;
  slotsPerHour: number;
  bufferMinutes: number;
}

export interface Holiday {
  id: number;
  name: string;
  holidayDate: string;
  isFederal: boolean;
  isRecurring: boolean;
  isPartial: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface FederalHoliday {
  name: string;
  actualDate: string;
  observedDate: string;
}

export interface Agent {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  defaultTimezone: string;
  createdAt: string;
  bookingLinks?: {
    id: number;
    token: string;
    name: string;
    clicksCount: number;
  }[];
  _count?: {
    bookings: number;
  };
}

export interface BookingLink {
  id: number;
  token: string;
  name: string;
  agentId?: number | null;
  isActive: boolean;
  clicksCount: number;
  createdAt: string;
  agent?: {
    id: number;
    name: string;
    email: string;
  } | null;
  _count?: {
    bookings: number;
  };
}

export interface ActivityLog {
  id: number;
  adminId?: number | null;
  actionType: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  admin?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface ClientProfile {
  id: number;
  clientCode: string;
  name: string;
  description?: string | null;
  defaultTimezone: string;
  meetingDurationMinutes: number;
  bufferMinutes: number;
  slotsPerHour: number;
  workingDays: string;
  startTime: string;
  endTime: string;
  autoFederalHolidays: boolean;
  customHolidays?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  totalBookingsCount?: number;
  confirmedBookingsCount?: number;
  cancelledBookingsCount?: number;
  openSlotsCount?: number;
  occupancyRate?: number;
}

export interface ClientStats {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  openSlots: number;
  totalCapacity: number;
  occupancyRate: number;
}

