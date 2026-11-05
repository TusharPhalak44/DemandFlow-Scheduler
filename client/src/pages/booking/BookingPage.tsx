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

    // 3. Fetch active public clients list from server/admin database
    api.getPublicClients()
      .then((clientsRes) => {
        if (clientsRes.clients && clientsRes.clients.length > 0) {
          setPublicClients(clientsRes.clients);
        }
      })
      .catch((e) => console.warn('Could not fetch public clients', e));

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

  const totalAvailableDays = calendarDays.filter((d) => d.isAvailable).length;

  // If Confirmed, render Confirmation View
  if (confirmedBooking) {
    const b = confirmedBooking.booking;
    const z = confirmedBooking.formattedInBookedZone;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-8 text-white text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mb-3 shadow-md">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black">Meeting Confirmed!</h2>
            <p className="text-emerald-100 text-xs mt-1">
              Your meeting is locked and calendar notifications have been scheduled.
            </p>
            <div className="mt-3 flex items-center justify-center space-x-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-mono font-bold">
                REF: {b.bookingReference}
              </span>
              {b.clientCode && (
                <span className="bg-white/25 px-3 py-1 rounded-full text-xs font-bold">
                  Client #{b.clientCode}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-[11px] font-bold uppercase text-indigo-900 block">Date & Time</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{z.date}</p>
                <p className="text-indigo-600 font-extrabold text-base">{z.timeWithZone}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Session Info</span>
                <p className="font-semibold text-slate-800 mt-0.5">Agent: {b.agentName}</p>
                <p className="text-slate-600">Prospect: {b.prospectEmail}</p>
                <p className="text-slate-600 font-bold">{confirmedBooking.durationMinutes} Minutes</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={handleCopySingle}
                className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 cursor-pointer shadow-2xs"
              >
                Copy Details
              </button>
              <button
                onClick={handleCopyAllTimezones}
                className="py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 cursor-pointer shadow-2xs"
              >
                Copy 4 Zones
              </button>
              <button
                onClick={handleDownloadIcs}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-md shadow-indigo-600/20"
              >
                Download .ICS
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setConfirmedBooking(null);
                  setSelectedSlot(null);
                }}
                className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
              >
                Schedule Another Meeting
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-[#f3f6fa] text-slate-900 p-2.5 sm:p-3.5 lg:p-4 flex flex-col justify-between">
      {/* Container - Sized to fit comfortably on 1 screen */}
      <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col justify-between">
        {/* Top Header Row (Logo on Left, Title & Client Code on Right - Exact match with user mockup image) */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-3 pb-2.5 border-b border-slate-200/80 shrink-0">
          {/* Left: Brand Logo in card with glowing cyan/indigo border + dynamic scheduler badge */}
          <div className="flex flex-col items-center md:items-start space-y-1 shrink-0">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-2xl blur-[3px] opacity-40 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white px-5 py-1.5 rounded-xl shadow-xs border border-cyan-200/60 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="DemandFlow Scheduler"
                  className="h-10 sm:h-11 w-auto object-contain"
                  onError={(e) => {
                    // Fallback to text logo if image not available
                    (e.target as HTMLElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent && !parent.querySelector('.fallback-logo')) {
                      const textLogo = document.createElement('div');
                      textLogo.className = 'fallback-logo text-center py-0.5';
                      textLogo.innerHTML = '<span class="font-black text-slate-900 tracking-wider text-base">DEMANDFLOW</span><br/><span class="text-cyan-600 font-bold text-xs">Scheduler</span>';
                      parent.appendChild(textLogo);
                    }
                  }}
                />
              </div>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white border border-indigo-200/80 text-indigo-700 text-[10px] font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Real-time Dynamic Scheduler • Multi-Timezone</span>
            </div>
          </div>

          {/* Center / Right: Title, Subtitle, and Admin Client Code Display */}
          <div className="text-center md:text-right flex-1 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-slate-900 tracking-tight leading-tight">
              {clientProfile ? clientProfile.name : 'DemandFlow Scheduler'}
            </h1>
            <p className="text-slate-500 text-xs sm:text-[13px] mt-0.5">
              {clientProfile?.description ||
                (agentInfo
                  ? `Book your direct session with ${agentInfo.name}. Select your timezone and pick an available slot.`
                  : 'Select your timezone, pick an available slot, and confirm your meeting instantly.')}
            </p>

            {/* Saved Admin Client Codes & Code Switcher Row */}
            <div className="mt-2 flex flex-wrap items-center justify-center md:justify-end gap-1.5">
              {/* If Client Active: Show Client Code Pill with Duration, Working Hours, Copy Link & Switch */}
              {clientCode ? (
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-indigo-300 text-xs font-semibold text-slate-800 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-indigo-700">Client Code: <strong className="font-mono text-indigo-900 font-extrabold">#{clientCode}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 font-medium">{clientProfile?.meetingDurationMinutes || 20}m Slots</span>
                  {clientProfile?.startTime && clientProfile?.endTime && (
                    <>
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="text-slate-500 text-[11px] hidden sm:inline">{clientProfile.startTime} - {clientProfile.endTime}</span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsClientModalOpen(true)}
                    className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer ml-1"
                  >
                    Switch
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyClientLink}
                    title="Copy direct booking link for this client"
                    className="p-1 hover:bg-indigo-50 rounded-md text-indigo-700 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                /* Pill button matching user attached mockup */
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Enter Client Code (e.g. 1050, 4020)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                </button>
              )}

              {/* Quick Saved Admin Client Chips */}
              {publicClients.length > 0 && (
                <div className="flex items-center space-x-1 pl-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">Portals:</span>
                  {publicClients.map((c) => (
                    <button
                      key={c.clientCode}
                      type="button"
                      onClick={() => {
                        window.location.hash = `#/${c.clientCode}`;
                        applyClientCode(c.clientCode);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        clientCode === c.clientCode
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                      title={`${c.name} (${c.meetingDurationMinutes}m slots)`}
                    >
                      #{c.clientCode}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3-COLUMN MAIN LAYOUT: EXACT MATCH WITH USER'S ATTACHED SCREENSHOT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-stretch my-2.5 flex-1 min-h-0">
          {/* COLUMN 1 (Left): Vertical Timezone Strip (Span 2) */}
          <div className="lg:col-span-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              {/* Auto DST conversion badge at top */}
              <div className="text-center mb-2.5">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto DST Conversion</span>
                </span>
              </div>

              {/* Stacked Vertical Timezone Buttons (Pacific, Mountain, Central, Eastern) */}
              <div className="space-y-1.5">
                {timezones.map((tz) => {
                  const isSelected = selectedTimezone === tz.id;
                  const liveTime = nowTime.setZone(tz.id).toFormat('hh:mm a');
                  const abbr = tz.currentAbbr || tz.abbrStandard;
                  const cityName = tz.id.split('/')[1]?.replace('_', ' ');

                  return (
                    <button
                      key={tz.id}
                      type="button"
                      onClick={() => setSelectedTimezone(tz.id)}
                      className={`w-full p-2 rounded-xl border text-left transition-all relative cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-xs font-black ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                            {tz.region}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-tight">{cityName}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          {isSelected ? (
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold text-slate-400">{abbr}</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Local:</span>
                        <span className={`font-mono font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-700'}`}>
                          {liveTime}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Vertical Label matching screenshot */}
            <div className="mt-2 pt-2 border-t border-slate-100 text-center">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-center space-x-1">
                <Globe className="w-3 h-3 text-indigo-600" />
                <span>1. SELECT TIMEZONE</span>
              </div>
            </div>
          </div>

          {/* COLUMN 2 (Center): Monthly Calendar Card (Span 6) */}
          <div className="lg:col-span-6 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      {currentMonthDt.toFormat('MMMM yyyy')}
                    </h3>
                    {clientCode && (
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                        #{clientCode}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select an available working day to view time slots • <strong className="text-emerald-600">{totalAvailableDays} working days open</strong>
                  </p>
                </div>

                {/* Toolbar */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="px-2.5 py-1 rounded-xl border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                  >
                    Today
                  </button>
                  <div className="flex items-center bg-slate-100/80 rounded-xl p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Weekday Row */}
              <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, idx) => (
                  <div
                    key={d}
                    className={`text-[10px] font-black tracking-wider py-1 rounded-lg ${
                      idx === 0 || idx === 6 ? 'text-slate-400 bg-slate-50/70' : 'text-slate-600 bg-slate-100/70'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Grid: Perfectly Sized */}
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: leadingBlankDays }).map((_, i) => (
                  <div key={`blank-${i}`} className="h-14 sm:h-15.5 rounded-xl bg-slate-50/40 border border-dashed border-slate-100" />
                ))}

                {calendarDays.map((day) => {
                  const isSelected = selectedDate === day.dateStr;

                  let cellClasses = '';
                  let badge = null;

                  if (!day.isWorkingDay || day.isPast) {
                    cellClasses = 'bg-slate-50/60 text-slate-300 border border-slate-100/80 cursor-not-allowed opacity-45 select-none';
                    badge = <span className="text-[9px] text-slate-400 block">Off</span>;
                  } else if (day.isHoliday) {
                    cellClasses = 'bg-rose-50/70 border border-rose-200 text-rose-500 cursor-not-allowed';
                    badge = (
                      <span className="text-[9px] font-bold text-rose-600 truncate max-w-full px-1.5 py-0.2 rounded-full bg-rose-100/80 block">
                        Holiday
                      </span>
                    );
                  } else if (day.isAvailable) {
                    if (isSelected) {
                      cellClasses =
                        'bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white font-bold ring-4 ring-indigo-500/25 shadow-md shadow-indigo-600/30 scale-[1.02] -translate-y-0.5 z-10';
                      badge = (
                        <span className="text-[9px] font-bold block px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                          Selected
                        </span>
                      );
                    } else {
                      cellClasses =
                        'bg-white hover:bg-indigo-50/50 border border-slate-200 text-slate-800 hover:border-indigo-400 hover:shadow-xs cursor-pointer transition-all';
                      badge = (
                        <span className="text-[9px] font-bold block px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {day.availableSlotsCount} slots
                        </span>
                      );
                    }
                  } else {
                    cellClasses = 'bg-slate-50 text-slate-400 border border-slate-200/80 cursor-not-allowed';
                    badge = <span className="text-[9px] text-slate-400 block">Full</span>;
                  }

                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      disabled={!day.isAvailable}
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`h-14 sm:h-15.5 rounded-xl flex flex-col items-center justify-between p-1.5 relative ${cellClasses}`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {day.dayNumber}
                        </span>
                        {day.isToday && (
                          <span
                            className={`text-[8px] font-bold px-1 rounded ${
                              isSelected ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
                            }`}
                          >
                            TODAY
                          </span>
                        )}
                      </div>
                      <div className="w-full text-center">{badge}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-[11px]">Available Day</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="font-medium text-[11px]">Selected Date</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="font-medium text-[11px]">Holiday Excluded</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="font-medium text-[11px]">Weekend / Off</span>
              </div>
            </div>
          </div>

          {/* COLUMN 3 (Right): Timeslots & Simplified Confirmation Form (Span 4) */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-3.5">
            {/* Card 1: Available Timeslots */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>2. Available Timeslots</span>
                </label>
                {selectedDate && (
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {DateTime.fromISO(selectedDate).toFormat('EEE, MMM d')}
                  </span>
                )}
              </div>

              {!selectedDate ? (
                <div className="py-8 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-2 shadow-2xs">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">Select a date from the calendar</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Time slots will calculate in{' '}
                    <strong className="text-slate-700">{selectedTimezone.split('/')[1]?.replace('_', ' ')}</strong> with instant conflict checks.
                  </p>
                </div>
              ) : loadingSlots ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Calculating real-time slots...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="py-8 px-4 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-800">No open slots on this date</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Please pick another highlighted day.</p>
                </div>
              ) : (
                <div>
                  {/* Segmented Filter */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl mb-2.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setTimeOfDayFilter('ALL')}
                      className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
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
                      className={`flex-1 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                        timeOfDayFilter === 'MORNING'
                          ? 'bg-white text-indigo-950 font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sun className="w-3 h-3 text-amber-500" />
                      <span>Morning ({morningSlots.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeOfDayFilter('AFTERNOON')}
                      className={`flex-1 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                        timeOfDayFilter === 'AFTERNOON'
                          ? 'bg-white text-indigo-950 font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sunset className="w-3 h-3 text-indigo-500" />
                      <span>Afternoon ({afternoonSlots.length})</span>
                    </button>
                  </div>

                  {/* Slot Grid */}
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                    {displayedSlots.map((slot) => {
                      const isSelected = selectedSlot?.slotStartUtc === slot.slotStartUtc;
                      return (
                        <button
                          key={slot.slotStartUtc}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black border-indigo-600 shadow-sm shadow-indigo-600/25 ring-2 ring-indigo-500/20'
                              : 'bg-white hover:bg-indigo-50/60 border-slate-200 text-slate-700 hover:border-indigo-400'
                          }`}
                        >
                          <p className="text-xs font-bold">{slot.displayTime}</p>
                          <p className={`text-[9px] mt-0.2 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {slot.durationMinutes} min
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Confirm Meeting Details */}
            <div
              className={`p-4 rounded-3xl border transition-all ${
                selectedSlot
                  ? 'bg-white border-indigo-400 ring-4 ring-indigo-500/10 shadow-sm'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>3. Confirm Meeting Details</span>
                </h3>
                {selectedSlot && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Slot Locked
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmitBooking} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                    Agent Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      name="agentName"
                      value={formData.agentName}
                      onChange={handleChange}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                    Prospect Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      name="prospectEmail"
                      value={formData.prospectEmail}
                      onChange={handleChange}
                      placeholder="prospect@company.com"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                {selectedSlot && (
                  <div className="p-2.5 bg-indigo-50/80 rounded-xl border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between">
                    <div>
                      <span className="font-black text-[11px] block text-indigo-900">Selected Appointment:</span>
                      <span className="text-[11px]">
                        {DateTime.fromISO(selectedDate!).toFormat('EEE, MMM d')} at{' '}
                        <strong className="text-indigo-600 font-bold">{selectedSlot.displayTime}</strong>
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-white rounded-md font-bold text-[10px] text-indigo-700 border border-indigo-200 shadow-2xs">
                      {selectedTimezone.split('/')[1]?.replace('_', ' ')}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedSlot}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
                >
                  <span>{submitting ? 'Confirming...' : 'Confirm Meeting Booking'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Modal: Client Code Selector / Input */}
        {isClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Select Client Portal</h3>
                    <p className="text-[11px] text-slate-400">Enter client code or pick from active clients</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsClientModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5">
                <p className="text-xs text-slate-600">
                  Enter your client code (e.g. <strong>1050</strong> or <strong>4020</strong>):
                </p>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={clientCodeInput}
                    onChange={(e) => setClientCodeInput(e.target.value)}
                    placeholder="e.g. 1050"
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
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
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                {publicClients.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Active Portals ({publicClients.length})
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {publicClients.map((c) => (
                        <button
                          key={c.clientCode}
                          type="button"
                          onClick={() => {
                            window.location.hash = `#/${c.clientCode}`;
                            applyClientCode(c.clientCode);
                            setIsClientModalOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                            clientCode === c.clientCode
                              ? 'bg-indigo-50 border-indigo-400 font-bold text-indigo-950 ring-2 ring-indigo-500/20'
                              : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span className="font-mono font-extrabold text-indigo-600">#{c.clientCode}</span>
                            <span className="font-bold text-slate-800 ml-2">{c.name}</span>
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

        {/* Compact Footer */}
        <footer className="pt-2 border-t border-slate-200/60 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 DemandFlow Scheduler • High-Performance Multi-Client Meeting Calendar</p>
          <a
            href="/#/admin-login"
            className="inline-flex items-center space-x-1 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Shield className="w-3 h-3" />
            <span>Admin Portal</span>
          </a>
        </footer>
      </div>
    </div>
  );
};
