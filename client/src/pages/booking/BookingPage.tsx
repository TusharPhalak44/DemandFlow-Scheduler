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

  // Timezone state (default Eastern)
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York');

  // Calendar Month State
  const [currentMonthDt, setCurrentMonthDt] = useState(DateTime.now().startOf('month'));
  const [monthAvailability, setMonthAvailability] = useState<MonthDayAvailability[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  // Date & Slot Selection
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<GeneratedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);

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
    async function init() {
      try {
        const tzRes = await api.getTimezones();
        setTimezones(tzRes.timezones);

        // Fetch list of active clients for quick switcher
        try {
          const clientsRes = await api.getPublicClients();
          setPublicClients(clientsRes.clients);
        } catch (e) {
          console.warn('Could not load public clients list', e);
        }

        const detected = parseUrlContext();
        if (detected) {
          applyClientCode(detected);
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
      }
    }
    init();

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
        showToast(`Loaded Client Portal #${res.client.clientCode}: ${res.client.name}`, 'success');
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

  // Load Slots whenever selectedDate, selectedTimezone, or clientCode changes
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const res = await api.getSlotsForDate(selectedDate!, selectedTimezone, clientCode || undefined);
        setAvailableSlots(res.slots || []);
      } catch (err: any) {
        showToast(err.message || 'Failed to load available slots', 'error');
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate, selectedTimezone, clientCode]);

  // Month navigation
  const prevMonth = () => setCurrentMonthDt((prev) => prev.minus({ months: 1 }));
  const nextMonth = () => setCurrentMonthDt((prev) => prev.plus({ months: 1 }));

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

  // Calendar Day Calculation (Locally generated so it is NEVER blank!)
  const firstDayOfMonth = currentMonthDt.startOf('month');
  const leadingBlankDays = firstDayOfMonth.weekday % 7; // 0 = Sun ... 6 = Sat
  const daysInMonth = currentMonthDt.daysInMonth || 30;

  // Build the complete list of calendar days
  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const dayDt = currentMonthDt.set({ day: dayNumber });
    const dateStr = dayDt.toFormat('yyyy-MM-dd');
    const dayOfWeek = dayDt.weekday; // 1 = Mon ... 7 = Sun

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
    const isAvailable = serverDay?.isAvailable ?? (isWorkingDay && !isHoliday);
    const availableSlotsCount = serverDay?.availableSlotsCount ?? (isAvailable ? 12 : 0);

    return {
      dateStr,
      dayNumber,
      dayOfWeek,
      isWorkingDay,
      isHoliday,
      holidayName,
      isAvailable,
      availableSlotsCount,
      hasServerData: !!serverDay,
    };
  });

  // If Confirmed, render Confirmation View
  if (confirmedBooking) {
    const b = confirmedBooking.booking;
    const z = confirmedBooking.formattedInBookedZone;

    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-8 text-white text-center relative overflow-hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-md mb-3 ring-8 ring-white/10">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Meeting Confirmed!</h2>
            <p className="text-emerald-100 text-sm mt-1">
              Your meeting has been locked in DemandFlow Scheduler.
            </p>
            <div className="mt-4 flex items-center justify-center space-x-2">
              <span className="bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider">
                REF: {b.bookingReference}
              </span>
              {b.clientCode && (
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
                  Client #{b.clientCode}
                </span>
              )}
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Primary Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">
                  Selected Meeting Time & Timezone
                </span>
                <p className="text-lg font-bold text-slate-900 mt-1">{z.date}</p>
                <p className="text-indigo-600 font-extrabold text-xl mt-0.5">{z.timeWithZone}</p>
                <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                  {b.bookedTimezone}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Attendees & Session
                </span>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-900">Agent:</span> {b.agentName}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-900">Prospect:</span> {b.prospectEmail}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-900">Duration:</span> {confirmedBooking.durationMinutes} Minutes
                  </p>
                </div>
              </div>
            </div>

            {/* All 4 US Timezones Breakdown */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Corresponding Times Across 4 US Regions
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {confirmedBooking.allFourTimezones.map((tz) => (
                  <div
                    key={tz.zoneId}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      tz.zoneId === b.bookedTimezone
                        ? 'bg-indigo-50/70 border-indigo-300 font-bold text-indigo-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{tz.label}</span>
                    <span className="font-mono">{tz.formattedTime}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={handleCopySingle}
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Selected Time</span>
              </button>
              <button
                onClick={handleCopyAllTimezones}
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copy 4 Timezones</span>
              </button>
              <button
                onClick={handleDownloadIcs}
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
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
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
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
    <div className="max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Redesigned Hero Header Above Calendar */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        {/* Prominent, Big Brand Logo */}
        <div className="flex items-center justify-center mb-5">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 rounded-3xl blur-md opacity-25 group-hover:opacity-40 transition-opacity" />
            <div className="relative bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="DemandFlow Scheduler"
                className="h-20 sm:h-24 md:h-28 w-auto object-contain transition-transform transform group-hover:scale-105"
                onError={(e) => {
                  // Fallback vector display if logo.png not loaded
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* Live System Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span>Real-time Dynamic Scheduler</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          {companyName}
        </h1>

        <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-xl mx-auto">
          {clientProfile?.description ||
            (agentInfo
              ? `Book your direct session with ${agentInfo.name}. Select your timezone and pick an available time slot.`
              : 'Select your timezone, pick an available slot, and confirm your meeting instantly.')}
        </p>

        {/* Client Code Portal Bar / Switcher */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {clientCode ? (
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs font-semibold text-indigo-900 shadow-xs">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>
                Client Portal: <strong className="font-mono text-indigo-700">#{clientCode}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>{clientProfile?.meetingDurationMinutes || 20}m Session</span>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="ml-2 text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
              >
                Switch Code
              </button>
              <button
                type="button"
                onClick={handleCopyClientLink}
                title="Copy client booking link"
                className="p-1 hover:bg-indigo-100 rounded-md text-indigo-700 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsClientModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-xs font-semibold text-slate-700 shadow-xs transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Have a Client Code? (e.g. 1050, 4020)</span>
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
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Select Your Timezone</span>
              </label>
              <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Automatic DST Conversion
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {timezones.map((tz) => {
                const isSelected = selectedTimezone === tz.id;
                return (
                  <button
                    key={tz.id}
                    type="button"
                    onClick={() => setSelectedTimezone(tz.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <p className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {tz.region}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{tz.currentAbbr}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{tz.currentLocalTime}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Calendar Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative">
            {/* Month Nav Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <span>{currentMonthDt.toFormat('MMMM yyyy')}</span>
                  {clientCode && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                      #{clientCode}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Available working days are highlighted with open slot counts
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Robust Calendar Grid: ALWAYS Rendered */}
            <div className="grid grid-cols-7 gap-2">
              {/* Leading blanks for start of month alignment */}
              {Array.from({ length: leadingBlankDays }).map((_, i) => (
                <div key={`blank-${i}`} className="h-14 sm:h-16 rounded-xl bg-slate-50/40" />
              ))}

              {/* Month Days */}
              {calendarDays.map((day) => {
                const isSelected = selectedDate === day.dateStr;

                let stateClass = '';
                let badgeContent = null;

                if (!day.isWorkingDay) {
                  stateClass = 'bg-slate-50/60 text-slate-300 cursor-not-allowed opacity-40';
                } else if (day.isHoliday) {
                  stateClass = 'bg-rose-50/50 border border-rose-200/50 text-rose-400 cursor-not-allowed';
                  badgeContent = (
                    <span className="text-[9px] font-bold text-rose-500 truncate block px-1">
                      Holiday
                    </span>
                  );
                } else if (day.isAvailable) {
                  stateClass = isSelected
                    ? 'bg-indigo-600 text-white font-bold ring-4 ring-indigo-500/20 shadow-md shadow-indigo-600/20'
                    : 'bg-white hover:bg-indigo-50/80 border border-slate-200 text-slate-800 hover:border-indigo-300 cursor-pointer shadow-xs';
                  badgeContent = (
                    <span
                      className={`text-[10px] font-medium block mt-0.5 ${
                        isSelected ? 'text-indigo-100' : 'text-emerald-600 font-semibold'
                      }`}
                    >
                      {day.availableSlotsCount} slots
                    </span>
                  );
                } else {
                  stateClass = 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed';
                  badgeContent = <span className="text-[9px] text-slate-400 block mt-0.5">Full</span>;
                }

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    disabled={!day.isAvailable}
                    onClick={() => setSelectedDate(day.dateStr)}
                    title={
                      day.holidayName ||
                      (day.isAvailable ? `${day.availableSlotsCount} open slots available` : 'Unavailable')
                    }
                    className={`h-14 sm:h-16 rounded-xl flex flex-col items-center justify-center p-1 transition-all ${stateClass}`}
                  >
                    <span className="text-sm font-semibold">{day.dayNumber}</span>
                    {badgeContent}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>Available Slots</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-300 inline-block" />
                <span>Holiday Excluded</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                <span>Weekend / Off</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Span 5): Slots & Simplified Booking Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Slots Picker Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Available Timeslots</span>
              </label>
              {selectedDate && (
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                  {DateTime.fromISO(selectedDate).toFormat('EEE, MMM d')}
                </span>
              )}
            </div>

            {!selectedDate ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Select a date from the calendar</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Time slots will automatically calculate in{' '}
                  <span className="font-semibold text-slate-600">{selectedTimezone}</span>.
                </p>
              </div>
            ) : loadingSlots ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Checking open slots...</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">No open slots on this date</p>
                <p className="text-[11px] text-slate-500 mt-1">Please select another highlighted day.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot?.slotStartUtc === slot.slotStartUtc;
                  return (
                    <button
                      key={slot.slotStartUtc}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-sm shadow-indigo-600/20'
                          : 'bg-white hover:bg-indigo-50/70 border-slate-200 text-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      <p className="text-xs">{slot.displayTime}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Simplified Booking Form: ONLY Agent Name and Prospect Email */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2 mb-4">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Confirm Meeting</span>
            </h3>

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* Agent Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Agent Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    name="agentName"
                    value={formData.agentName}
                    onChange={handleChange}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Prospect Email */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Prospect Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    name="prospectEmail"
                    value={formData.prospectEmail}
                    onChange={handleChange}
                    placeholder="prospect@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Selected Slot Summary Badge */}
              {selectedSlot && (
                <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold block">Selected Slot:</span>
                    <span>
                      {DateTime.fromISO(selectedDate!).toFormat('EEE, MMM d')} at {selectedSlot.displayTime}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-200/60 rounded font-bold text-[10px]">
                    {selectedTimezone.split('/')[1]?.replace('_', ' ') || selectedTimezone}
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !selectedSlot}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span>{submitting ? 'Confirming...' : 'Confirm Meeting Booking'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal: Client Code Selector / Input */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Enter Client Code</h3>
              </div>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Enter your numeric or alphanumeric client code (e.g. <strong>1050</strong> or <strong>4020</strong>) to open your dedicated calendar portal:
              </p>

              {/* Input field */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={clientCodeInput}
                  onChange={(e) => setClientCodeInput(e.target.value)}
                  placeholder="e.g. 1050"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
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
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {/* Quick Select from Active Client Codes */}
              {publicClients.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Available Client Codes
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {publicClients.map((c) => (
                      <button
                        key={c.clientCode}
                        type="button"
                        onClick={() => {
                          window.location.hash = `#/${c.clientCode}`;
                          applyClientCode(c.clientCode);
                          setIsClientModalOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          clientCode === c.clientCode
                            ? 'bg-indigo-50 border-indigo-300 font-bold text-indigo-900'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <span className="font-mono font-bold text-indigo-600">#{c.clientCode}</span>
                          <span className="ml-2 text-slate-800">{c.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
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
      <footer className="mt-16 pt-8 border-t border-slate-200/80 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© 2026 DemandFlow Scheduler • High-Performance Meeting Calendar</p>
        <a
          href="/#/admin-login"
          className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Admin Portal</span>
        </a>
      </footer>
    </div>
  );
};
