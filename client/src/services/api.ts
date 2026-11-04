import {
  AdminUser,
  AdminAccount,
  Agent,
  Booking,
  BookingLink,
  CalendarSettings,
  FederalHoliday,
  Holiday,
  MonthAvailabilityResponse,
  MultiTimezoneFormat,
  SlotSettings,
  TimezoneOption,
  WorkingHours,
  ActivityLog,
  GeneratedSlot,
  ClientProfile,
  ClientStats,
} from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('meeting_calendar_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorData: any = {};
    try {
      errorData = await res.json();
    } catch {
      errorData = { error: res.statusText };
    }
    throw new ApiError(
      errorData.message || errorData.error || `Request failed with status ${res.status}`,
      res.status,
      errorData.details
    );
  }

  return res.json();
}

export const api = {
  // Public
  getPublicClients: () => request<{ clients: ClientProfile[] }>('/public/clients'),
  
  getPublicClientByCode: (code: string) =>
    request<{ client: ClientProfile }>(`/public/clients/${encodeURIComponent(code)}`),

  getTimezones: () => request<{ timezones: TimezoneOption[] }>('/public/calendar/timezones'),
  
  getAvailableDates: (month: string, tz: string, clientCode?: string) =>
    request<MonthAvailabilityResponse>(
      `/public/calendar/available-dates?month=${month}&tz=${encodeURIComponent(tz)}${
        clientCode ? '&clientCode=' + encodeURIComponent(clientCode) : ''
      }`
    ),
  
  getSlotsForDate: (date: string, tz: string, clientCode?: string) =>
    request<{
      date: string;
      targetZone: string;
      clientCode?: string;
      totalGenerated: number;
      availableCount: number;
      slots: GeneratedSlot[];
    }>(
      `/public/calendar/slots?date=${date}&tz=${encodeURIComponent(tz)}${
        clientCode ? '&clientCode=' + encodeURIComponent(clientCode) : ''
      }`
    ),
  
  resolveBookingLink: (token: string) =>
    request<{
      bookingLink: { id: number; token: string; name: string };
      agent: Agent | null;
      companyName: string;
      prospectEmailRequired: boolean;
      defaultTimezone: string;
    }>(`/public/booking-link/${token}`),
  
  bookMeeting: (data: any) =>
    request<{ message: string; bookingReference: string; booking: Booking }>('/public/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getBookingByReference: (reference: string) =>
    request<{
      booking: Booking;
      formattedInBookedZone: any;
      allFourTimezones: MultiTimezoneFormat[];
      durationMinutes: number;
    }>(`/public/bookings/${reference}`),
  
  getIcsDownloadUrl: (reference: string) => `${API_BASE}/public/bookings/${reference}/ics`,

  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; admin: AdminUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  
  getMe: () => request<{ admin: AdminUser }>('/auth/me'),

  // Admin Dashboard & Reports
  getDashboardStats: () =>
    request<{
      metrics: {
        todayBookingsCount: number;
        upcomingBookingsCount: number;
        cancelledCount: number;
        weeklyCount: number;
        monthlyCount: number;
        totalBookingsCount: number;
        activeAgentsCount: number;
      };
      agentWiseStats: { agentId: number; name: string; email: string; count: number }[];
      timezoneDistribution: { timezone: string; count: number }[];
      statusDistribution: { status: string; count: number }[];
      recentBookings: Booking[];
    }>('/admin/dashboard/stats'),

  // Admin Bookings
  adminListBookings: (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    agentId?: number;
    clientCode?: string;
    timezone?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    if (params.agentId) qs.set('agentId', String(params.agentId));
    if (params.clientCode && params.clientCode !== 'ALL') qs.set('clientCode', params.clientCode);
    if (params.timezone) qs.set('timezone', params.timezone);
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    return request<{
      bookings: Booking[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/bookings?${qs.toString()}`);
  },

  adminCancelBooking: (id: number, reason: string) =>
    request<{ message: string; booking: Booking }>(`/admin/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  adminRescheduleBooking: (id: number, data: { newSlotStartUtc: string; newSlotEndUtc: string; reason?: string }) =>
    request<{ message: string; newBooking: Booking }>(`/admin/bookings/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminUpdateBookingStatus: (id: number, status: string) =>
    request<{ message: string; booking: Booking }>(`/admin/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Admin Configuration
  getCalendarSettings: () => request<{ settings: CalendarSettings }>('/admin/settings'),
  updateCalendarSettings: (settings: Partial<CalendarSettings>) =>
    request<{ message: string; settings: CalendarSettings }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  getWorkingHours: () => request<{ workingHours: WorkingHours[] }>('/admin/working-hours'),
  updateWorkingHours: (workingHours: WorkingHours[]) =>
    request<{ message: string; workingHours: WorkingHours[] }>('/admin/working-hours', {
      method: 'PUT',
      body: JSON.stringify(workingHours),
    }),

  getSlotSettings: () => request<{ slotSettings: SlotSettings }>('/admin/slot-settings'),
  updateSlotSettings: (settings: Partial<SlotSettings>) =>
    request<{ message: string; slotSettings: SlotSettings }>('/admin/slot-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Admin Holidays
  getHolidays: () =>
    request<{
      autoFederalHolidaysEnabled: boolean;
      federalHolidays: FederalHoliday[];
      customHolidays: Holiday[];
    }>('/admin/holidays'),

  createCustomHoliday: (holiday: {
    name: string;
    holidayDate: string;
    isRecurring?: boolean;
    isPartial?: boolean;
    startTime?: string | null;
    endTime?: string | null;
  }) =>
    request<{ message: string; holiday: Holiday }>('/admin/holidays', {
      method: 'POST',
      body: JSON.stringify(holiday),
    }),

  deleteHoliday: (id: number) => request<{ message: string }>(`/admin/holidays/${id}`, { method: 'DELETE' }),

  toggleFederalHolidays: (enabled: boolean) =>
    request<{ message: string; autoFederalHolidays: boolean }>('/admin/holidays/federal/toggle', {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),

  // Admin Agents & Links
  getAgents: () => request<{ agents: Agent[] }>('/admin/agents'),
  createAgent: (data: { name: string; email: string; phone?: string; status?: string; defaultTimezone?: string }) =>
    request<{ message: string; agent: Agent }>('/admin/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAgent: (id: number, data: Partial<Agent>) =>
    request<{ message: string; agent: Agent }>(`/admin/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getBookingLinks: () => request<{ links: BookingLink[] }>('/admin/booking-links'),
  toggleBookingLink: (id: number, isActive: boolean) =>
    request<{ message: string; link: BookingLink }>(`/admin/booking-links/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  // Activity Logs
  getActivityLogs: (params: { page?: number; limit?: number; search?: string; actionType?: string }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    if (params.actionType) qs.set('actionType', params.actionType);
    return request<{
      logs: ActivityLog[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/activity-logs?${qs.toString()}`);
  },

  // Admin User & Password Management
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAdminUsers: () => request<{ admins: AdminAccount[] }>('/admin/admins'),

  createAdminUser: (data: { name: string; email: string; password: string; role?: string }) =>
    request<{ message: string; admin: AdminAccount }>('/admin/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resetAdminPassword: (id: number, newPassword: string) =>
    request<{ message: string }>(`/admin/admins/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    }),

  toggleAdminStatus: (id: number) =>
    request<{ message: string; admin: AdminAccount }>(`/admin/admins/${id}/status`, {
      method: 'PATCH',
    }),

  deleteAdminUser: (id: number) =>
    request<{ message: string }>(`/admin/admins/${id}`, {
      method: 'DELETE',
    }),

  // Admin Client Management & Analytics (Client Codes e.g. 1050, 4020)
  getAdminClients: () => request<{ clients: ClientProfile[] }>('/admin/clients'),

  createAdminClient: (data: Partial<ClientProfile>) =>
    request<{ message: string; client: ClientProfile }>('/admin/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAdminClient: (code: string, data: Partial<ClientProfile>) =>
    request<{ message: string; client: ClientProfile }>(`/admin/clients/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAdminClient: (code: string) =>
    request<{ message: string }>(`/admin/clients/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    }),

  getClientStats: (code: string) =>
    request<{ client: ClientProfile; stats: ClientStats; recentBookings: Booking[] }>(
      `/admin/clients/${encodeURIComponent(code)}/stats`
    ),
};
