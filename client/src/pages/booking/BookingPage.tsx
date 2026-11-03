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
} from '../../types';

interface BookingPageProps {
  initialToken?: string;
}

export const BookingPage: React.FC<BookingPageProps> = ({ initialToken }) => {
  const { showToast } = useToast();

  // Settings & Context
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

  // Simplified Booking Form State: ONLY Agent Name and Prospect Email
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

  // Load Timezones and Booking Token on mount
  useEffect(() => {
    async function init() {
      try {
        const tzRes = await api.getTimezones();
        setTimezones(tzRes.timezones);

        // Check if token in URL hash e.g. #/book/sarah-booking-2026
        const hash = window.location.hash;
        const match = hash.match(/#\/book\/(.+)/);
        const tokenToUse = match ? match[1] : initialToken;

        if (tokenToUse) {
          setAgentToken(tokenToUse);
          const linkRes = await api.resolveBookingLink(tokenToUse);
          if (linkRes.agent) {
            setAgentInfo(linkRes.agent);
            setFormData((prev) => ({
              ...prev,
              agentName: linkRes.agent?.name || '',
            }));
            if (linkRes.defaultTimezone) {
              setSelectedTimezone(linkRes.defaultTimezone);
            }
          }
          if (linkRes.companyName) setCompanyName(linkRes.companyName);
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, [initialToken]);

  // Load Month Availability whenever month or timezone changes
  useEffect(() => {
    async function fetchMonth() {
      setLoadingMonth(true);
      try {
        const monthQuery = currentMonthDt.toFormat('yyyy-MM');
        const res = await api.getAvailableDates(monthQuery, selectedTimezone);
        setMonthAvailability(res.days);

        if (selectedDate) {
          const dayObj = res.days.find((d) => d.date === selectedDate);
          if (!dayObj || !dayObj.isAvailable) {
            setSelectedDate(null);
            setSelectedSlot(null);
            setAvailableSlots([]);
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load calendar availability', 'error');
      } finally {
        setLoadingMonth(false);
      }
    }
    fetchMonth();
  }, [currentMonthDt, selectedTimezone]);

  // Load Slots whenever selectedDate or selectedTimezone changes
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const res = await api.getSlotsForDate(selectedDate!, selectedTimezone);
        setAvailableSlots(res.slots);
      } catch (err: any) {
        showToast(err.message || 'Failed to load available slots', 'error');
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate, selectedTimezone]);

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
      const emailDomain = formData.prospectEmail.split('@')[1] || 'General';

      const payload = {
        agentId: agentInfo?.id || null,
        agentName: formData.agentName.trim(),
        agentEmail: agentInfo?.email || `${formData.agentName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@demandflow.com`,
        prospectName: emailUsername,
        prospectEmail: formData.prospectEmail.trim(),
        companyName: emailDomain,
        meetingPurpose: 'Meeting Consultation',
        meetingNotes: null,
        slotStartUtc: selectedSlot.slotStartUtc,
        slotEndUtc: selectedSlot.slotEndUtc,
        bookedTimezone: selectedTimezone,
      };

      const res = await api.bookMeeting(payload);

      // Fetch confirmed full multi-timezone details
      const confirmedDetails = await api.getBookingByReference(res.bookingReference);
      setConfirmedBooking(confirmedDetails);
      showToast('Meeting booked and confirmed!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to book slot', 'error');
      if (selectedDate) {
        const refreshed = await api.getSlotsForDate(selectedDate, selectedTimezone);
        setAvailableSlots(refreshed.slots);
        setSelectedSlot(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Copy Meeting Details to Clipboard (includes selected meeting time with timezone)
  const handleCopySingle = () => {
    if (!confirmedBooking) return;
    const b = confirmedBooking.booking;
    const z = confirmedBooking.formattedInBookedZone;

    const text = [
      `DemandFlow Scheduler - Meeting Details`,
      `----------------------------------------`,
      `Selected Meeting Time: ${z.date} at ${z.timeWithZone}`,
      `Timezone: ${b.bookedTimezone}`,
      `Agent Name: ${b.agentName}`,
      `Prospect Email: ${b.prospectEmail || 'N/A'}`,
      `Booking Reference: ${b.bookingReference}`,
      `Duration: ${confirmedBooking.durationMinutes} minutes`,
      `Status: Confirmed`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    showToast('Meeting details with selected time & timezone copied!', 'success');
  };

  // Copy in All 4 US Timezones (includes selected primary time and regional breakdown)
  const handleCopyAllTimezones = () => {
    if (!confirmedBooking) return;
    const b = confirmedBooking.booking;
    const z = confirmedBooking.formattedInBookedZone;

    const tzLines = confirmedBooking.allFourTimezones
      .map((tz) => `• ${tz.label}: ${tz.formattedTime}`)
      .join('\n');

    const text = [
      `DemandFlow Scheduler - Meeting Times Across 4 US Timezones`,
      `----------------------------------------`,
      `Selected Meeting Time: ${z.date} at ${z.timeWithZone}`,
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
    showToast('Meeting copied in all 4 US Timezones with selected times!', 'success');
  };

  // Download ICS File
  const handleDownloadIcs = () => {
    if (!confirmedBooking) return;
    const url = api.getIcsDownloadUrl(confirmedBooking.booking.bookingReference);
    window.open(url, '_blank');
    showToast('Downloading .ics calendar file...', 'info');
  };

  // Calendar Day Rendering Helpers
  const firstDayOfMonth = currentMonthDt.startOf('month');
  const leadingBlankDays = firstDayOfMonth.weekday % 7;

  // If Confirmed, render Confirmation View
  if (confirmedBooking) {
    const b = confirmedBooking.booking;
    const z = confirmedBooking.formattedInBookedZone;

    return (
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-8 text-white text-center relative overflow-hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-md mb-3 ring-8 ring-white/10">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Meeting Confirmed!</h2>
            <p className="text-emerald-100 text-sm mt-1">
              Your meeting has been locked and saved in DemandFlow Scheduler.
            </p>
            <div className="mt-4 inline-block bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider">
              REF: {b.bookingReference}
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Primary Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">
                  Selected Meeting Time & Timezone
                </span>
                <p className="text-base font-bold text-slate-900 mt-1">{z.date}</p>
                <p className="text-sm font-extrabold text-indigo-700">{z.timeWithZone}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Timezone: {b.bookedTimezone} ({confirmedBooking.durationMinutes} mins)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Prospect Email
                </span>
                <p className="text-base font-bold text-slate-800 mt-1">{b.prospectEmail || '—'}</p>
                <p className="text-xs text-slate-500 mt-1">Confirmation & calendar updates</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Agent Name
                </span>
                <p className="text-base font-bold text-slate-800 mt-1">{b.agentName}</p>
                <p className="text-xs text-slate-500">{b.agentEmail}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Booking Status
                </span>
                <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmed & Locked in Database</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Double-booking prevented</p>
              </div>
            </div>

            {/* 4 US Timezones Matrix */}
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <div className="flex items-center space-x-2 mb-3">
                <Globe className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Equivalent Meeting Times Across All 4 US Timezones
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {confirmedBooking.allFourTimezones.map((tz) => (
                  <div
                    key={tz.zoneId}
                    className="p-2.5 rounded-xl bg-white border border-indigo-100/80 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-700">{tz.label}</span>
                    <span className="font-mono font-bold text-indigo-700">{tz.formattedTime}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleCopySingle}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Meeting Details</span>
              </button>

              <button
                onClick={handleCopyAllTimezones}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>Copy in 4 Timezones</span>
              </button>

              <button
                onClick={handleDownloadIcs}
                className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition-all cursor-pointer"
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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Title Header with Logo */}
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <img
          src="/logo.png"
          alt="DemandFlow Scheduler"
          className="h-16 w-auto mx-auto mb-4 object-contain"
        />
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-time Dynamic Scheduler</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {companyName}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-2">
          {agentInfo
            ? `Book your meeting with ${agentInfo.name}. Choose your timezone, select an open slot, and enter your details.`
            : 'Select your timezone, pick an available slot, and confirm your meeting instantly.'}
        </p>
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            {/* Month Nav Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {currentMonthDt.toFormat('MMMM yyyy')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Available working days are highlighted
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
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

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: leadingBlankDays }).map((_, i) => (
                <div key={`blank-${i}`} className="h-14 sm:h-16 rounded-xl bg-slate-50/40" />
              ))}

              {monthAvailability.map((day) => {
                const dayNum = DateTime.fromISO(day.date).day;
                const isSelected = selectedDate === day.date;

                let stateClass = '';
                let badgeContent = null;

                if (!day.isWorkingDay) {
                  stateClass = 'bg-slate-50/60 text-slate-300 cursor-not-allowed opacity-50';
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
                    : 'bg-white hover:bg-indigo-50/80 border border-slate-200 text-slate-800 hover:border-indigo-300 cursor-pointer shadow-sm';
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
                    key={day.date}
                    type="button"
                    disabled={!day.isAvailable}
                    onClick={() => setSelectedDate(day.date)}
                    title={day.holidayName || (day.isAvailable ? `${day.availableSlotsCount} slots available` : 'Unavailable')}
                    className={`h-14 sm:h-16 rounded-xl flex flex-col items-center justify-center p-1 transition-all ${stateClass}`}
                  >
                    <span className="text-sm font-semibold">{dayNum}</span>
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
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Available Timeslots</span>
              </h3>
              {selectedDate && (
                <span className="text-xs font-semibold text-slate-500">
                  {DateTime.fromISO(selectedDate).toFormat('EEE, MMM d')}
                </span>
              )}
            </div>

            {!selectedDate ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Select a date from the calendar</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Time slots will automatically calculate in {selectedTimezone.replace('_', ' ')}.
                </p>
              </div>
            ) : loadingSlots ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Generating slots in your timezone...</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-xl">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No slots available for this date</p>
                <p className="text-[11px] text-slate-400 mt-1">Please select another date on the calendar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const isSlotSelected = selectedSlot?.slotStartUtc === slot.slotStartUtc;
                    return (
                      <button
                        key={slot.slotStartUtc}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                          isSlotSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'bg-slate-50/70 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-800'
                        }`}
                      >
                        {slot.displayTime}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 text-center pt-2">
                  Showing {availableSlots.length} available slots ({availableSlots[0]?.durationMinutes} mins each)
                </p>
              </div>
            )}
          </div>

          {/* Simplified Booking Form Card: ONLY Agent Name and Prospect Email */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
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
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    name="agentName"
                    required
                    value={formData.agentName}
                    onChange={handleChange}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>

              {/* Prospect Email */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Prospect Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    name="prospectEmail"
                    required
                    value={formData.prospectEmail}
                    onChange={handleChange}
                    placeholder="prospect@company.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>

              {/* Selected Slot Summary Preview */}
              {selectedSlot && (
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="font-bold text-indigo-950">
                        {DateTime.fromISO(selectedDate!).toFormat('EEEE, MMMM d')}
                      </span>
                      <span className="text-indigo-700 block font-medium">
                        {selectedSlot.displayRange} ({selectedTimezone.split('/')[1].replace('_', ' ')})
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-800 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    {selectedSlot.durationMinutes}m
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !selectedSlot}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  submitting || !selectedSlot
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 active:scale-[0.99]'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Locking Slot in Database...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Meeting Booking</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
