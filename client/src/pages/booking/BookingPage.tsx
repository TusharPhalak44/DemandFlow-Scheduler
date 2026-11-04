import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Globe,
  User,
  Mail,
  CheckCircle2,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Building2,
  Search,
  ExternalLink,
  Shield,
  KeyRound,
  Check,
  RefreshCw,
  X,
  Sun,
  Sunset,
  CalendarDays,
  Info,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import {
  TimezoneOption,
  MonthDayAvailability,
  GeneratedSlot,
  Booking,
  MultiTimezoneFormat,
  ClientProfile,
} from '../../types';

interface BookingPageProps {
  initialToken?: string;
}

const DEFAULT_TIMEZONES: TimezoneOption[] = [
  { id: 'America/New_York', label: 'Eastern Time (ET)', abbrStandard: 'EST', abbrDaylight: 'EDT', region: 'Eastern' },
  { id: 'America/Chicago', label: 'Central Time (CT)', abbrStandard: 'CST', abbrDaylight: 'CDT', region: 'Central' },
  { id: 'America/Denver', label: 'Mountain Time (MT)', abbrStandard: 'MST', abbrDaylight: 'MDT', region: 'Mountain' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PT)', abbrStandard: 'PST', abbrDaylight: 'PDT', region: 'Pacific' },
];

const BUILTIN_CLIENTS: Record<string, any> = {
  '1050': {
    id: 1,
    clientCode: '1050',
    name: 'Alpha Corporate Services',
    description: 'Enterprise B2B scheduling portal for Alpha division',
    defaultTimezone: 'America/New_York',
    meetingDurationMinutes: 20,
    bufferMinutes: 0,
    slotsPerHour: 3,
    workingDays: '1,2,3,4,5',
    startTime: '09:00',
    endTime: '17:00',
    autoFederalHolidays: true,
    isActive: true,
  },
  '4020': {
    id: 2,
    clientCode: '4020',
    name: 'Apex Global Solutions',
    description: 'Priority client direct meeting scheduler (30-min sessions)',
    defaultTimezone: 'America/Chicago',
    meetingDurationMinutes: 30,
    bufferMinutes: 5,
    slotsPerHour: 2,
    workingDays: '1,2,3,4,5,6',
    startTime: '08:30',
    endTime: '17:30',
    autoFederalHolidays: true,
    isActive: true,
  },
};

export const BookingPage: React.FC<BookingPageProps> = ({ initialToken }) => {
  const { showToast } = useToast();

  // Client Code & Profile Context
  const [clientCode, setClientCode] = useState<string>('');
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [publicClients, setPublicClients] = useState<ClientProfile[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientCodeInput, setClientCodeInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // General Settings
  const [companyName, setCompanyName] = useState('DemandFlow Scheduler');
  const [agentToken, setAgentToken] = useState(initialToken || '');
  const [agentInfo, setAgentInfo] = useState<{ id?: number; name: string; email: string } | null>(null);

  // Timezone state (default Eastern with fallback)
  const [timezones, setTimezones] = useState<TimezoneOption[]>(DEFAULT_TIMEZONES);
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York');

  // Real-time ticker for live timezone clocks (updates every 10s)
  const [nowTime, setNowTime] = useState(DateTime.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(DateTime.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Calendar Month State
  const [currentMonthDt, setCurrentMonthDt] = useState<any>(DateTime.now().startOf('month'));
  const [monthAvailability, setMonthAvailability] = useState<MonthDayAvailability[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  // Date & Slot Selection
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<GeneratedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);

  // Time-of-day segmentation filter (ALL / MORNING / AFTERNOON)
  const [timeOfDayFilter, setTimeOfDayFilter] = useState<'ALL' | 'MORNING' | 'AFTERNOON'>('ALL');

  // Booking Form State: Agent Name and Prospect Email
  const [formData, setFormData] = useState({
    agentName: '',
    prospectEmail: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Confirmation State
  const [confirmedBooking, setConfirmedBooking] = useState<{
    booking: Booking;
    allFourTimezones: MultiTimezoneFormat[];
    durationMinutes: number;
    formattedInBookedZone: any;
  } | null>(null);

  // Parse Client Code / Token from URL
  const parseUrlContext = () => {
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    const urlParams = new URLSearchParams(window.location.search);
    const queryClient = urlParams.get('client') || urlParams.get('clientCode');

    let detectedCode = '';

    if (queryClient) {
      detectedCode = queryClient;
    } else if (rawHash.startsWith('book/')) {
      const parts = rawHash.split('/');
      detectedCode = parts[1] || '';
    } else if (rawHash.startsWith('client/')) {
      const parts = rawHash.split('/');
      detectedCode = parts[1] || '';
    } else if (rawHash && !rawHash.startsWith('admin') && rawHash !== 'booking') {
      // Direct client code in hash e.g. #/1050 or #/4020
      detectedCode = rawHash;
    }

    return detectedCode || initialToken || '';
  };

  // Load Timezones, Public Clients, and detect Client Code on mount
  useEffect(() => {
    // 1. Immediately apply client code if in URL
    const detected = parseUrlContext();
    if (detected) {
      applyClientCode(detected);
    }

    // 2. Fetch live timezones asynchronously
    api.getTimezones()
      .then((tzRes) => {
        if (tzRes.timezones && tzRes.timezones.length > 0) {
          setTimezones(tzRes.timezones);
        }
      })
      .catch((e) => console.warn('Using default timezones fallback', e));

    // 3. Fetch active public clients list
    api.getPublicClients()
      .then((clientsRes) => {
        if (clientsRes.clients && clientsRes.clients.length > 0) {
          setPublicClients(clientsRes.clients);
        } else {
          setPublicClients(Object.values(BUILTIN_CLIENTS));
        }
      })
      .catch(() => {
        setPublicClients(Object.values(BUILTIN_CLIENTS));
      });

    // Listen to hash changes in browser
    const onHashChange = () => {
      const code = parseUrlContext();
      if (code && code !== clientCode) {
        applyClientCode(code);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Apply a specific Client Code (e.g. 1050, 4020)
  const applyClientCode = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    // Check built-in fallback first for instant responsive UI
    if (BUILTIN_CLIENTS[clean]) {
      const fallback = BUILTIN_CLIENTS[clean];
      setClientCode(fallback.clientCode);
      setClientProfile(fallback as ClientProfile);
      setCompanyName(fallback.name);
      if (fallback.defaultTimezone) {
        setSelectedTimezone(fallback.defaultTimezone);
      }
    }

    try {
      const res = await api.getPublicClientByCode(clean);
      if (res.client) {
        setClientCode(res.client.clientCode);
        setClientProfile(res.client);
        setCompanyName(res.client.name);
        if (res.client.defaultTimezone) {
          setSelectedTimezone(res.client.defaultTimezone);
        }
        return;
      }
    } catch {
      // Check if it's an agent booking link token instead
      try {
        const linkRes = await api.resolveBookingLink(clean);
        if (linkRes.agent) {
          setAgentToken(clean);
          setAgentInfo(linkRes.agent);
          setFormData((prev) => ({
            ...prev,
            agentName: linkRes.agent?.name || '',
          }));
          if (linkRes.defaultTimezone) {
            setSelectedTimezone(linkRes.defaultTimezone);
          }
          if (linkRes.companyName) setCompanyName(linkRes.companyName);
        }
      } catch {
        console.warn(`Code '${clean}' was neither a client profile nor booking link.`);
      }
    }
  };

  // Load Month Availability whenever month, timezone, or clientCode changes
  useEffect(() => {
    async function fetchMonth() {
      setLoadingMonth(true);
      try {
        const monthQuery = currentMonthDt.toFormat('yyyy-MM');
        const res = await api.getAvailableDates(monthQuery, selectedTimezone, clientCode || undefined);
        setMonthAvailability(res.days || []);

        if (selectedDate) {
          const dayObj = res.days?.find((d) => d.date === selectedDate);
          if (!dayObj || !dayObj.isAvailable) {
            setSelectedDate(null);
            setSelectedSlot(null);
            setAvailableSlots([]);
          }
        }
      } catch (err: any) {
        console.error('Failed to load month availability:', err);
      } finally {
        setLoadingMonth(false);
      }
    }
    fetchMonth();
  }, [currentMonthDt, selectedTimezone, clientCode]);

  // Helper to generate slots locally for zero-latency instant rendering
  const generateLocalSlots = (dateStr: string, tz: string, profile: ClientProfile | null): GeneratedSlot[] => {
    const duration = profile?.meetingDurationMinutes || 20;
    const startParts = (profile?.startTime || '09:00').split(':').map(Number);
    const endParts = (profile?.endTime || '17:00').split(':').map(Number);

    const [year, month, day] = dateStr.split('-').map(Number);
    let currentDt = DateTime.fromObject(
      { year, month, day, hour: startParts[0], minute: startParts[1] },
      { zone: tz }
    );
    const endDt = DateTime.fromObject(
      { year, month, day, hour: endParts[0], minute: endParts[1] },
      { zone: tz }
    );

    const slots: GeneratedSlot[] = [];
    while (currentDt.plus({ minutes: duration }) <= endDt) {
      const slotEnd = currentDt.plus({ minutes: duration });
      slots.push({
        slotStartUtc: currentDt.toUTC().toISO() || currentDt.toISO() || '',
        slotEndUtc: slotEnd.toUTC().toISO() || slotEnd.toISO() || '',
        displayTime: currentDt.toFormat('hh:mm a'),
        displayEndTime: slotEnd.toFormat('hh:mm a'),
        displayRange: `${currentDt.toFormat('hh:mm a')} - ${slotEnd.toFormat('hh:mm a')}`,
        targetZone: tz,
        durationMinutes: duration,
      });
      currentDt = slotEnd;
    }
    return slots;
  };

  // Load Slots whenever selectedDate, selectedTimezone, or clientCode changes
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const res = await api.getSlotsForDate(selectedDate!, selectedTimezone, clientCode || undefined);
        if (res.slots && res.slots.length > 0) {
          setAvailableSlots(res.slots);
        } else {
          setAvailableSlots(generateLocalSlots(selectedDate!, selectedTimezone, clientProfile));
        }
      } catch {
        setAvailableSlots(generateLocalSlots(selectedDate!, selectedTimezone, clientProfile));
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate, selectedTimezone, clientCode]);

  // Month navigation
  const prevMonth = () => setCurrentMonthDt((prev: DateTime) => prev.minus({ months: 1 }));
  const nextMonth = () => setCurrentMonthDt((prev: DateTime) => prev.plus({ months: 1 }));

  // Quick Jump to Today
  const handleJumpToToday = () => {
    const today = DateTime.now().setZone(selectedTimezone);
    setCurrentMonthDt(today.startOf('month'));
    setSelectedDate(today.toFormat('yyyy-MM-dd'));
    showToast(`Jumped to today: ${today.toFormat('MMMM d, yyyy')}`, 'info');
  };

  // Handle Form Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Booking with Agent Name and Prospect Email
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      showToast('Please select a meeting time slot.', 'error');
      return;
    }

    if (!formData.agentName.trim() || !formData.prospectEmail.trim()) {
      showToast('Please enter Agent Name and Prospect Email.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const emailUsername = formData.prospectEmail.split('@')[0];
      const emailDomain = formData.prospectEmail.split('@')[1] || clientProfile?.name || 'General';

      const payload = {
        clientCode: clientCode || null,
        agentId: agentInfo?.id || null,
        agentName: formData.agentName.trim(),
        agentEmail: agentInfo?.email || `${formData.agentName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@demandflow.com`,
        prospectName: emailUsername,
        prospectEmail: formData.prospectEmail.trim(),
        companyName: clientProfile?.name || emailDomain,
        meetingPurpose: clientProfile?.description || 'Meeting Consultation',
        meetingNotes: null,
        slotStartUtc: selectedSlot.slotStartUtc,
        slotEndUtc: selectedSlot.slotEndUtc,
        bookedTimezone: selectedTimezone,
      };

      const res = await api.bookMeeting(payload);

      // Fetch confirmed full multi-timezone details
      const confirmedDetails = await api.getBookingByReference(res.bookingReference);
      setConfirmedBooking(confirmedDetails);
      showToast('Meeting booked and confirmed successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to book slot', 'error');
      if (selectedDate) {
        const refreshed = await api.getSlotsForDate(selectedDate, selectedTimezone, clientCode || undefined);
        setAvailableSlots(refreshed.slots || []);
        setSelectedSlot(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Copy Meeting Details to Clipboard
  const handleCopySingle = () => {
    if (!confirmedBooking) return;
    const b = confirmedBooking.booking;
    const z = confirmedBooking.formattedInBookedZone;

    const text = [
      `DemandFlow Scheduler - Meeting Details`,
      `----------------------------------------`,
      `Client Code: ${b.clientCode ? '#' + b.clientCode : 'Standard'}`,
      `Selected Meeting Time: ${z.date} at ${z.timeWithZone}`,
      `Timezone: ${b.bookedTimezone}`,
      `Agent Name: ${b.agentName}`,
      `Prospect Email: ${b.prospectEmail || 'N/A'}`,
      `Booking Reference: ${b.bookingReference}`,
      `Duration: ${confirmedBooking.durationMinutes} minutes`,
      `Status: Confirmed`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    showToast('Meeting details copied to clipboard!', 'success');
  };

  // Copy in All 4 US Timezones
  const handleCopyAllTimezones = () => {
    if (!confirmedBooking) return;
    const b = confirmedBooking.booking;
    const z = confirmedBooking.formattedInBookedZone;

    const tzLines = confirmedBooking.allFourTimezones
      .map((tz) => `• ${tz.label}: ${tz.formattedTime}`)
      .join('\n');

    const text = [
      `DemandFlow Scheduler - Meeting Across 4 US Timezones`,
      `----------------------------------------`,
      `Client Code: ${b.clientCode ? '#' + b.clientCode : 'Standard'}`,
      `Selected Time: ${z.date} at ${z.timeWithZone}`,
      `Timezone: ${b.bookedTimezone}`,
      `Booking Reference: ${b.bookingReference}`,
      `Agent Name: ${b.agentName}`,
      `Prospect Email: ${b.prospectEmail || 'N/A'}`,
      `Duration: ${confirmedBooking.durationMinutes} minutes`,
      `\nTimes Across All 4 US Regions:`,
      tzLines,
      `\nStatus: Confirmed`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    showToast('Meeting times across all 4 US timezones copied!', 'success');
  };

  // Download ICS File
  const handleDownloadIcs = () => {
    if (!confirmedBooking) return;
    const url = api.getIcsDownloadUrl(confirmedBooking.booking.bookingReference);
    window.open(url, '_blank');
    showToast('Downloading calendar .ics file...', 'info');
  };

  // Copy Direct Link for current client
  const handleCopyClientLink = () => {
    const origin = window.location.origin;
    const link = clientCode ? `${origin}/#/${clientCode}` : `${origin}/#/booking`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showToast(`Direct booking link copied: ${link}`, 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Time-of-day slots filtering
  const morningSlots = availableSlots.filter((slot) => {
    const slotDt = DateTime.fromISO(slot.slotStartUtc).setZone(selectedTimezone);
    return slotDt.hour < 12;
  });
  const afternoonSlots = availableSlots.filter((slot) => {
    const slotDt = DateTime.fromISO(slot.slotStartUtc).setZone(selectedTimezone);
    return slotDt.hour >= 12;
  });
  const displayedSlots =
    timeOfDayFilter === 'MORNING'
      ? morningSlots
      : timeOfDayFilter === 'AFTERNOON'
      ? afternoonSlots
      : availableSlots;

  // Calendar Day Calculation (Locally generated so it is NEVER blank!)
  const firstDayOfMonth = currentMonthDt.startOf('month');
  const leadingBlankDays = firstDayOfMonth.weekday % 7; // 0 = Sun ... 6 = Sat
  const daysInMonth = currentMonthDt.daysInMonth || 30;

  const nowInSelectedTz = nowTime.setZone(selectedTimezone);
  const todayDateStr = nowInSelectedTz.toFormat('yyyy-MM-dd');

  // Build the complete list of calendar days
  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const dayDt = currentMonthDt.set({ day: dayNumber });
    const dateStr = dayDt.toFormat('yyyy-MM-dd');
    const dayOfWeek = dayDt.weekday; // 1 = Mon ... 7 = Sun

    const isToday = dateStr === todayDateStr;
    const isPast = dayDt.startOf('day') < nowInSelectedTz.startOf('day');

    // Look for matching server availability entry
    const serverDay = monthAvailability.find((d) => d.date === dateStr);

    // Client working days check if client loaded
    let isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
    if (clientProfile?.workingDays) {
      const allowedDays = clientProfile.workingDays.split(',').map((s) => parseInt(s.trim(), 10));
      isWorkingDay = allowedDays.includes(dayOfWeek);
    } else if (serverDay) {
      isWorkingDay = serverDay.isWorkingDay;
    }

    const isHoliday = serverDay?.isHoliday ?? false;
    const holidayName = serverDay?.holidayName;
    const isAvailable = serverDay?.isAvailable ?? (isWorkingDay && !isHoliday && !isPast);
    const availableSlotsCount = serverDay?.availableSlotsCount ?? (isAvailable ? 32 : 0);

    return {
      dateStr,
      dayNumber,
      dayOfWeek,
      isWorkingDay,
      isHoliday,
      holidayName,
      isAvailable,
      availableSlotsCount,
      isToday,
      isPast,
      hasServerData: !!serverDay,
    };
  });

  // Calculate high-level month stats for top bar
  const totalAvailableDays = calendarDays.filter((d) => d.isAvailable).length;
  const totalOpenSlotsInMonth = calendarDays.reduce(
    (acc, d) => acc + (d.isAvailable ? d.availableSlotsCount : 0),
    0
  );

  // If Confirmed, render Confirmation View
  if (confirmedBooking) {
    const b = confirmedBooking.booking;
    const z = confirmedBooking.formattedInBookedZone;

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/25 to-slate-100 py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 px-8 py-10 text-white text-center relative overflow-hidden">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-md mb-4 ring-8 ring-white/10 shadow-lg">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">Meeting Confirmed!</h2>
              <p className="text-emerald-100 text-sm mt-1 max-w-md mx-auto">
                Your session is secured in DemandFlow Scheduler and synced across all US timezones.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider">
                  REF: {b.bookingReference}
                </span>
                {b.clientCode && (
                  <span className="bg-white/25 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Client #{b.clientCode}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="p-8 sm:p-10 space-y-6">
              {/* Primary Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">
                    Selected Meeting Time & Timezone
                  </span>
                  <p className="text-lg font-bold text-slate-900 mt-1">{z.date}</p>
                  <p className="text-indigo-600 font-black text-2xl mt-0.5">{z.timeWithZone}</p>
                  <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                    {b.bookedTimezone}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Attendees & Session Details
                  </span>
                  <div className="mt-2 space-y-1.5 text-sm">
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900">Agent:</span> {b.agentName}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900">Prospect:</span> {b.prospectEmail}
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900">Duration:</span>{' '}
                      <span className="font-bold text-slate-900">{confirmedBooking.durationMinutes} Minutes</span>
                    </p>
                    {b.clientCode && (
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-900">Client Code:</span> #{b.clientCode}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* All 4 US Timezones Breakdown */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Corresponding Times Across All 4 US Regions
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Automatic DST Sync
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {confirmedBooking.allFourTimezones.map((tz) => (
                    <div
                      key={tz.zoneId}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        tz.zoneId === b.bookedTimezone
                          ? 'bg-indigo-50/80 border-indigo-400 font-bold text-indigo-950 shadow-xs'
                          : 'bg-slate-50/80 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {tz.zoneId === b.bookedTimezone && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                        )}
                        <span>{tz.label}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold">{tz.formattedTime}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  onClick={handleCopySingle}
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Time</span>
                </button>
                <button
                  onClick={handleCopyAllTimezones}
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-wider border border-indigo-200 transition-all cursor-pointer shadow-xs"
                >
                  <Copy className="w-4 h-4 text-indigo-600" />
                  <span>Copy 4 Zones</span>
                </button>
                <button
                  onClick={handleDownloadIcs}
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .ICS</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setConfirmedBooking(null);
                    setSelectedSlot(null);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  ← Schedule Another Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100 text-slate-900 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Ambient Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-br from-indigo-200/25 via-cyan-200/20 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Redesigned Hero Header Above Calendar */}
        <div className="text-center max-w-3xl mx-auto">
          {/* Prominent, Big Brand Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 rounded-3xl blur-md opacity-30 group-hover:opacity-60 transition-opacity" />
              <div className="relative bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-xl shadow-indigo-100/60 border border-slate-200/80 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="DemandFlow Scheduler"
                  className="h-20 sm:h-24 md:h-28 w-auto object-contain transition-transform transform group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Live System Badge with status pulse */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-indigo-200/80 text-indigo-700 text-xs font-bold mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Real-time Dynamic Scheduler • Multi-Timezone</span>
          </div>

          {/* Dynamic Company / Client Portal Title */}
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {companyName}
          </h1>

          <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-xl mx-auto font-normal">
            {clientProfile?.description ||
              (agentInfo
                ? `Book your direct session with ${agentInfo.name}. Select your timezone and pick an available time slot.`
                : 'Select your timezone, pick an available slot, and confirm your meeting instantly.')}
          </p>

          {/* Client Code Portal Bar / Switcher Pill */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {clientCode ? (
              <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-sm border border-indigo-200 text-xs font-semibold text-indigo-950 shadow-sm">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span>
                  Client Portal: <strong className="font-mono text-indigo-600 font-bold">#{clientCode}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-600">
                  {clientProfile?.meetingDurationMinutes || 20}m Meeting Session
                </span>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                >
                  Switch Code
                </button>
                <button
                  type="button"
                  onClick={handleCopyClientLink}
                  title="Copy client booking link"
                  className="p-1 hover:bg-indigo-50 rounded-lg text-indigo-700 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-xs font-semibold text-slate-700 shadow-sm transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Enter Client Code (e.g. 1050, 4020)</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
              </button>
            )}
          </div>
        </div>

        {/* Main Grid: Left Calendar & Timezone, Right Slot & Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Span 7): Timezone & Monthly Calendar */}
          <div className="lg:col-span-7 space-y-6">
            {/* Timezone Selection Card */}
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-slate-200/90 transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <span>1. Select Your US Region Timezone</span>
                </label>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto DST Conversion</span>
                </span>
              </div>

              {/* 4 US Regions with Live Ticking Clocks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {timezones.map((tz) => {
                  const isSelected = selectedTimezone === tz.id;
                  const liveTime = nowTime.setZone(tz.id).toFormat('hh:mm a');
                  const abbr = tz.currentAbbr || tz.abbrStandard;

                  return (
                    <button
                      key={tz.id}
                      type="button"
                      onClick={() => setSelectedTimezone(tz.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-100'
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-extrabold ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                            {tz.region}
                          </p>
                          {isSelected ? (
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-slate-400">{abbr}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{tz.id.split('/')[1]?.replace('_', ' ')}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">Local:</span>
                        <span className={`text-xs font-mono font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-700'}`}>
                          {liveTime}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monthly Calendar Card - THE CORE ELEMENT */}
            <div className="bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200/90 relative">
              {/* Month Nav Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <CalendarDays className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {currentMonthDt.toFormat('MMMM yyyy')}
                    </h3>
                    {clientCode && (
                      <span className="text-xs font-mono font-black px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 shadow-2xs">
                        #{clientCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
                    <span>Select an available working day to view time slots</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-emerald-600">{totalAvailableDays} working days open</span>
                  </p>
                </div>

                {/* Quick Toolbar: Jump to Today + Nav Buttons */}
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/60 text-xs font-bold text-slate-700 hover:text-indigo-700 transition-all cursor-pointer shadow-2xs"
                  >
                    Today
                  </button>
                  <div className="flex items-center bg-slate-100/80 rounded-xl p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={prevMonth}
                      title="Previous Month"
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextMonth}
                      title="Next Month"
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 gap-2 mb-3 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                  <div
                    key={d}
                    className={`text-[11px] font-black uppercase tracking-wider py-1.5 rounded-lg ${
                      idx === 0 || idx === 6 ? 'text-slate-400 bg-slate-50/60' : 'text-slate-600 bg-slate-100/60'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Robust Calendar Grid: ALWAYS Rendered */}
              <div className="grid grid-cols-7 gap-2">
                {/* Leading blanks for start of month alignment */}
                {Array.from({ length: leadingBlankDays }).map((_, i) => (
                  <div key={`blank-${i}`} className="min-h-[72px] sm:min-h-[82px] rounded-2xl bg-slate-50/40 border border-dashed border-slate-100" />
                ))}

                {/* Month Days */}
                {calendarDays.map((day) => {
                  const isSelected = selectedDate === day.dateStr;

                  let cellClasses = '';
                  let badge = null;

                  if (!day.isWorkingDay || day.isPast) {
                    // Non-working / Past
                    cellClasses = 'bg-slate-50/60 text-slate-300 border border-slate-100/80 cursor-not-allowed opacity-45 select-none';
                    badge = <span className="text-[9px] text-slate-400 mt-1 block">Off</span>;
                  } else if (day.isHoliday) {
                    // Holiday
                    cellClasses = 'bg-rose-50/70 border border-rose-200 text-rose-500 cursor-not-allowed';
                    badge = (
                      <span className="text-[9px] font-bold text-rose-600 truncate max-w-full px-1.5 py-0.5 rounded-full bg-rose-100/80 block mt-1">
                        Holiday
                      </span>
                    );
                  } else if (day.isAvailable) {
                    // Available Day
                    if (isSelected) {
                      cellClasses =
                        'bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white font-bold ring-4 ring-indigo-500/25 shadow-xl shadow-indigo-600/30 scale-[1.02] -translate-y-1 z-10';
                      badge = (
                        <span className="text-[10px] font-bold block mt-1 px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-2xs">
                          Selected
                        </span>
                      );
                    } else {
                      cellClasses =
                        'bg-white hover:bg-indigo-50/50 border border-slate-200 text-slate-800 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-200';
                      badge = (
                        <span className="text-[10px] font-bold block mt-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {day.availableSlotsCount} slots
                        </span>
                      );
                    }
                  } else {
                    // Fully booked
                    cellClasses = 'bg-slate-50 text-slate-400 border border-slate-200/80 cursor-not-allowed';
                    badge = <span className="text-[9px] font-medium text-slate-400 block mt-1">Full</span>;
                  }

                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      disabled={!day.isAvailable}
                      onClick={() => setSelectedDate(day.dateStr)}
                      title={
                        day.holidayName ||
                        (day.isAvailable
                          ? `${day.availableSlotsCount} open slots available on ${day.dateStr}`
                          : 'Unavailable')
                      }
                      className={`min-h-[72px] sm:min-h-[82px] rounded-2xl flex flex-col items-center justify-between p-2 relative ${cellClasses}`}
                    >
                      {/* Day Number and Today Indicator */}
                      <div className="w-full flex items-center justify-between">
                        <span className={`text-xs sm:text-sm font-extrabold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {day.dayNumber}
                        </span>
                        {day.isToday && (
                          <span
                            className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
                            }`}
                          >
                            Today
                          </span>
                        )}
                      </div>

                      {/* Capacity / Status Badge */}
                      <div className="w-full text-center">{badge}</div>
                    </button>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 pt-5 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                  <span className="font-medium">Available Day</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200" />
                  <span className="font-medium">Selected Date</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 ring-2 ring-rose-200" />
                  <span className="font-medium">Holiday Excluded</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="font-medium">Weekend / Off</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Span 5): Slots & Simplified Booking Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* Slots Picker Card */}
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-slate-200/90">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>2. Available Timeslots</span>
                </label>
                {selectedDate && (
                  <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                    {DateTime.fromISO(selectedDate).toFormat('EEE, MMM d')}
                  </span>
                )}
              </div>

              {!selectedDate ? (
                <div className="py-12 px-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3 shadow-2xs">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Select a date from the calendar</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Time slots will calculate in{' '}
                    <strong className="text-slate-800">{selectedTimezone.split('/')[1]?.replace('_', ' ')}</strong> with instant conflict checks.
                  </p>
                </div>
              ) : loadingSlots ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-600">Calculating real-time slots...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="py-12 px-6 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">No open slots on this date</p>
                  <p className="text-xs text-slate-500 mt-1">Please pick another highlighted day in the calendar.</p>
                </div>
              ) : (
                <div>
                  {/* Time of Day Filter Segment (All / Morning / Afternoon) */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl mb-3 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setTimeOfDayFilter('ALL')}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                        timeOfDayFilter === 'ALL'
                          ? 'bg-white text-indigo-950 font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All ({availableSlots.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeOfDayFilter('MORNING')}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                        timeOfDayFilter === 'MORNING'
                          ? 'bg-white text-indigo-950 font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Morning ({morningSlots.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeOfDayFilter('AFTERNOON')}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                        timeOfDayFilter === 'AFTERNOON'
                          ? 'bg-white text-indigo-950 font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sunset className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Afternoon ({afternoonSlots.length})</span>
                    </button>
                  </div>

                  {/* Slots Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {displayedSlots.map((slot) => {
                      const isSelected = selectedSlot?.slotStartUtc === slot.slotStartUtc;
                      return (
                        <button
                          key={slot.slotStartUtc}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-extrabold border-indigo-600 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20 scale-[1.02]'
                              : 'bg-white hover:bg-indigo-50/60 border-slate-200 text-slate-700 hover:border-indigo-400'
                          }`}
                        >
                          <p className="text-xs sm:text-sm font-bold">{slot.displayTime}</p>
                          <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {slot.durationMinutes} min
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Simplified Booking Form: ONLY Agent Name and Prospect Email */}
            <div
              className={`p-6 sm:p-7 rounded-3xl shadow-sm border transition-all ${
                selectedSlot
                  ? 'bg-white/95 border-indigo-400 ring-4 ring-indigo-500/10 shadow-lg shadow-indigo-100'
                  : 'bg-white/90 border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>3. Confirm Meeting Details</span>
                </h3>
                {selectedSlot && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Slot Locked
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmitBooking} className="space-y-4">
                {/* Agent Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Agent Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      name="agentName"
                      value={formData.agentName}
                      onChange={handleChange}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Prospect Email */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Prospect Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      name="prospectEmail"
                      value={formData.prospectEmail}
                      onChange={handleChange}
                      placeholder="prospect@company.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Selected Slot Summary Card */}
                {selectedSlot && (
                  <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold block text-indigo-900">Selected Appointment:</span>
                      <span className="font-medium">
                        {DateTime.fromISO(selectedDate!).toFormat('EEEE, MMM d')} at{' '}
                        <strong className="text-indigo-600 font-bold">{selectedSlot.displayTime}</strong>
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-white rounded-lg font-bold text-[10px] text-indigo-700 border border-indigo-200 shadow-2xs">
                      {selectedTimezone.split('/')[1]?.replace('_', ' ')}
                    </span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !selectedSlot}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <span>{submitting ? 'Confirming Appointment...' : 'Confirm Meeting Booking'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Modal: Client Code Selector / Input */}
        {isClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-7">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Switch Client Portal</h3>
                    <p className="text-[11px] text-slate-400">Enter client code or pick from active portals</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsClientModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <p className="text-xs text-slate-600">
                  Enter your client code (e.g. <strong>1050</strong> or <strong>4020</strong>) to open your dedicated scheduling calendar:
                </p>

                {/* Input field */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={clientCodeInput}
                    onChange={(e) => setClientCodeInput(e.target.value)}
                    placeholder="e.g. 1050"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && clientCodeInput.trim()) {
                        window.location.hash = `#/${clientCodeInput.trim()}`;
                        applyClientCode(clientCodeInput.trim());
                        setIsClientModalOpen(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (clientCodeInput.trim()) {
                        window.location.hash = `#/${clientCodeInput.trim()}`;
                        applyClientCode(clientCodeInput.trim());
                        setIsClientModalOpen(false);
                      }
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>

                {/* Quick Select from Active Client Codes */}
                {publicClients.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Active Client Portals
                    </p>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {publicClients.map((c) => (
                        <button
                          key={c.clientCode}
                          type="button"
                          onClick={() => {
                            window.location.hash = `#/${c.clientCode}`;
                            applyClientCode(c.clientCode);
                            setIsClientModalOpen(false);
                          }}
                          className={`w-full text-left p-3 rounded-2xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                            clientCode === c.clientCode
                              ? 'bg-indigo-50 border-indigo-400 font-bold text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-extrabold text-indigo-600 text-xs">#{c.clientCode}</span>
                              <span className="font-bold text-slate-800">{c.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{c.description || 'Enterprise scheduler'}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                            {c.meetingDurationMinutes}m
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Clean, Disruption-Free Footer with Discreet Admin Link */}
        <footer className="pt-8 border-t border-slate-200/80 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 DemandFlow Scheduler • High-Performance Multi-Client Meeting Calendar</p>
          <a
            href="/#/admin-login"
            className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-indigo-600 transition-colors font-medium"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </a>
        </footer>
      </div>
    </div>
  );
};
