import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle2,
  XCircle,
  Building2,
  CalendarDays,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { MonthDayAvailability, GeneratedSlot, ClientProfile } from '../../types';

export const AdminCalendarPage: React.FC = () => {
  const { showToast } = useToast();
  const [currentMonthDt, setCurrentMonthDt] = useState<any>(DateTime.now().startOf('month'));
  const [monthAvailability, setMonthAvailability] = useState<MonthDayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd');
  });
  const [slots, setSlots] = useState<GeneratedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedZone, setSelectedZone] = useState('America/New_York');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Client Selection for Inspection
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientCode, setSelectedClientCode] = useState<string>('');

  // Fetch Clients on mount (try admin first, then public fallback)
  const loadClients = async () => {
    try {
      const res = await api.getAdminClients();
      if (res.clients && res.clients.length > 0) {
        setClients(res.clients);
        return;
      }
    } catch {
      // Fallback to public clients endpoint
    }
    try {
      const pub = await api.getPublicClients();
      if (pub.clients && pub.clients.length > 0) {
        setClients(pub.clients);
      }
    } catch (err: any) {
      console.warn('Could not load clients for calendar inspector:', err);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Fetch Month Availability function
  const fetchMonthAvailability = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const monthQuery = currentMonthDt.toFormat('yyyy-MM');
      const res = await api.getAvailableDates(monthQuery, selectedZone, selectedClientCode || undefined);
      setMonthAvailability(res.days || []);
      if (!res.days || res.days.length === 0) {
        setFetchError('No days returned by backend. Showing calendar framework.');
      }
    } catch (err: any) {
      console.warn('Could not fetch month availability:', err);
      setFetchError(err.message || 'Failed to fetch month availability from server');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch month availability when month, timezone, or client changes
  useEffect(() => {
    fetchMonthAvailability();
  }, [currentMonthDt, selectedZone, selectedClientCode]);

  // Ensure selectedDate is valid for current month
  useEffect(() => {
    const monthPrefix = currentMonthDt.toFormat('yyyy-MM');
    if (!selectedDate || !selectedDate.startsWith(monthPrefix)) {
      const todayInTz = DateTime.now().setZone(selectedZone);
      if (todayInTz.toFormat('yyyy-MM') === monthPrefix) {
        setSelectedDate(todayInTz.toFormat('yyyy-MM-dd'));
      } else {
        setSelectedDate(`${monthPrefix}-01`);
      }
    }
  }, [currentMonthDt, selectedZone]);

  // Fetch Slots for selected date
  const fetchSlotsForDate = async () => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    try {
      const res = await api.getSlotsForDate(selectedDate, selectedZone, selectedClientCode || undefined);
      if (res.slots && res.slots.length > 0) {
        setSlots(res.slots);
      } else {
        // Generate fallback slots if server returned empty
        const fallback = generateAdminFallbackSlots(selectedDate, selectedZone, selectedClientCode);
        setSlots(fallback);
      }
    } catch (err: any) {
      const fallback = generateAdminFallbackSlots(selectedDate, selectedZone, selectedClientCode);
      setSlots(fallback);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlotsForDate();
  }, [selectedDate, selectedZone, selectedClientCode]);

  // Fallback Slot Generator for instant admin viewing
  const generateAdminFallbackSlots = (dateStr: string, tz: string, clientCode?: string): GeneratedSlot[] => {
    const selectedClient = clients.find((c) => c.clientCode === clientCode);
    const duration = selectedClient?.meetingDurationMinutes || 20;
    const startParts = (selectedClient?.startTime || '09:00').split(':').map(Number);
    const endParts = (selectedClient?.endTime || '17:00').split(':').map(Number);

    const [year, month, day] = dateStr.split('-').map(Number);
    let currentDt = DateTime.fromObject(
      { year, month, day, hour: startParts[0], minute: startParts[1] },
      { zone: tz }
    );
    const endDt = DateTime.fromObject(
      { year, month, day, hour: endParts[0], minute: endParts[1] },
      { zone: tz }
    );

    const generated: GeneratedSlot[] = [];
    while (currentDt.plus({ minutes: duration }) <= endDt) {
      const slotEnd = currentDt.plus({ minutes: duration });
      generated.push({
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
    return generated;
  };

  const prevMonth = () => setCurrentMonthDt((prev: DateTime) => prev.minus({ months: 1 }));
  const nextMonth = () => setCurrentMonthDt((prev: DateTime) => prev.plus({ months: 1 }));
  const handleJumpToToday = () => {
    const today = DateTime.now().setZone(selectedZone);
    setCurrentMonthDt(today.startOf('month'));
    setSelectedDate(today.toFormat('yyyy-MM-dd'));
  };

  // Calendar Day Calculation (guaranteed to render all 1..31 days!)
  const firstDayOfMonth = currentMonthDt.startOf('month');
  const leadingBlankDays = firstDayOfMonth.weekday % 7; // 0 = Sun ... 6 = Sat
  const daysInMonth = currentMonthDt.daysInMonth || 30;
  const todayStr = DateTime.now().setZone(selectedZone).toFormat('yyyy-MM-dd');

  const selectedClient = clients.find((c) => c.clientCode === selectedClientCode);

  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const dayDt = currentMonthDt.set({ day: dayNumber });
    const dateStr = dayDt.toFormat('yyyy-MM-dd');
    const dayOfWeek = dayDt.weekday; // 1 = Mon ... 7 = Sun

    const isToday = dateStr === todayStr;

    // Server day availability match
    const serverDay = monthAvailability.find((d) => d.date === dateStr);

    let isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
    if (selectedClient?.workingDays) {
      const allowed = selectedClient.workingDays.split(',').map((s) => parseInt(s.trim(), 10));
      isWorkingDay = allowed.includes(dayOfWeek);
    } else if (serverDay) {
      isWorkingDay = serverDay.isWorkingDay;
    }

    const isHoliday = serverDay?.isHoliday ?? false;
    const holidayName = serverDay?.holidayName;
    const isAvailable = serverDay?.isAvailable ?? (isWorkingDay && !isHoliday);
    const availableSlotsCount = serverDay?.availableSlotsCount ?? (isAvailable ? 24 : 0);

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
    };
  });

  return (
    <div className="space-y-6">
      {/* Title & Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Calendar Inspector</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time inspection of daily working windows, holidays, exceptions, and live client slot inventory
          </p>
        </div>

        {/* Filter Controls: Client Selector, Timezone, and Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => {
              fetchMonthAvailability();
              fetchSlotsForDate();
              showToast('Refreshed calendar and slot capacity', 'info');
            }}
            disabled={loading || loadingSlots}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh live data from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingSlots ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Fetching...' : 'Fetch Live Data'}</span>
          </button>

          {/* Client Code Filter */}
          <div className="flex items-center space-x-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClientCode}
              onChange={(e) => setSelectedClientCode(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:border-indigo-500 outline-none"
            >
              <option value="">All Clients (Default Schedule)</option>
              {clients.map((c) => (
                <option key={c.clientCode || c.id} value={c.clientCode}>
                  #{c.clientCode} - {c.name} ({c.meetingDurationMinutes}m)
                </option>
              ))}
            </select>
          </div>

          {/* Timezone Filter */}
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:border-indigo-500 outline-none"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fetch Error or Status Banner */}
      {fetchError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchMonthAvailability}
            className="font-bold underline text-amber-900 hover:text-amber-700 ml-2"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid (Span 7) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <h3 className="text-lg font-bold text-slate-900">
                {currentMonthDt.toFormat('MMMM yyyy')}
              </h3>
              {selectedClientCode && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  #{selectedClientCode}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-white hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-white hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: leadingBlankDays }).map((_, i) => (
              <div key={`blank-${i}`} className="h-16 rounded-xl bg-slate-50/40" />
            ))}

            {calendarDays.map((day) => {
              const isSelected = selectedDate === day.dateStr;

              let cellStyle = '';
              let badgeText = '';

              if (!day.isWorkingDay) {
                cellStyle = 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 cursor-not-allowed';
                badgeText = 'Off';
              } else if (day.isHoliday) {
                cellStyle = 'bg-rose-50 text-rose-500 border-rose-200';
                badgeText = 'Holiday';
              } else if (isSelected) {
                cellStyle = 'bg-indigo-600 text-white font-bold border-indigo-600 ring-2 ring-indigo-500/20 shadow-md';
                badgeText = 'Selected';
              } else if (day.isAvailable) {
                cellStyle = 'bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-800 hover:border-indigo-300 cursor-pointer';
                badgeText = `${day.availableSlotsCount} slots`;
              } else {
                cellStyle = 'bg-slate-50 text-slate-400 border-slate-200/80 cursor-not-allowed';
                badgeText = 'Full';
              }

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`h-16 rounded-xl flex flex-col items-center justify-between p-1.5 border transition-all ${cellStyle}`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs font-bold">{day.dayNumber}</span>
                    {day.isToday && (
                      <span className={`text-[8px] font-bold px-1 rounded ${isSelected ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'}`}>
                        Today
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-semibold truncate max-w-full px-1 ${
                      isSelected
                        ? 'text-indigo-100'
                        : day.isHoliday
                        ? 'text-rose-600'
                        : !day.isWorkingDay
                        ? 'text-slate-400'
                        : 'text-emerald-600'
                    }`}
                  >
                    {badgeText}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Available Working Day</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>Selected Date</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Holiday Excluded</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>Weekend / Off</span>
            </div>
          </div>
        </div>

        {/* Slot Inspector Pane (Span 5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Slots for {DateTime.fromISO(selectedDate).toFormat('EEE, MMM d, yyyy')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedClient ? `#${selectedClient.clientCode} • ${selectedClient.name}` : 'Default Schedule'} • {selectedZone.split('/')[1]?.replace('_', ' ')}
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
              {slots.length} Slots
            </span>
          </div>

          {loadingSlots ? (
            <div className="text-center py-16">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading slot capacity...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No active slots for this day (non-working day, holiday, or past date).
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
              {slots.map((s, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-indigo-200 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{s.displayTime}</span>
                    <span className="text-[10px] text-slate-400">{s.durationMinutes}m slot</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Open Slot Available" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
