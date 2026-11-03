import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, User, CheckCircle2, XCircle } from 'lucide-react';
import { DateTime } from 'luxon';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { MonthDayAvailability, GeneratedSlot } from '../../types';

export const AdminCalendarPage: React.FC = () => {
  const { showToast } = useToast();
  const [currentMonthDt, setCurrentMonthDt] = useState(DateTime.now().startOf('month'));
  const [monthAvailability, setMonthAvailability] = useState<MonthDayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().toFormat('yyyy-MM-dd'));
  const [slots, setSlots] = useState<GeneratedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState('America/New_York');

  useEffect(() => {
    async function fetchMonth() {
      setLoading(true);
      try {
        const monthQuery = currentMonthDt.toFormat('yyyy-MM');
        const res = await api.getAvailableDates(monthQuery, selectedZone);
        setMonthAvailability(res.days);
      } catch (err: any) {
        showToast(err.message || 'Failed to load month availability', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchMonth();
  }, [currentMonthDt, selectedZone]);

  useEffect(() => {
    if (!selectedDate) return;
    async function fetchSlots() {
      try {
        const res = await api.getSlotsForDate(selectedDate, selectedZone);
        setSlots(res.slots);
      } catch (err: any) {
        showToast(err.message || 'Failed to fetch slots', 'error');
      }
    }
    fetchSlots();
  }, [selectedDate, selectedZone]);

  const prevMonth = () => setCurrentMonthDt((prev) => prev.minus({ months: 1 }));
  const nextMonth = () => setCurrentMonthDt((prev) => prev.plus({ months: 1 }));

  const firstDayOfMonth = currentMonthDt.startOf('month');
  const leadingBlankDays = firstDayOfMonth.weekday % 7;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Calendar Inspector</h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual inspection of daily working windows, holidays, exceptions, and live slot inventory
          </p>
        </div>

        {/* Timezone Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-600">Inspect In:</label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:border-indigo-500 outline-none"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid (Span 7) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {currentMonthDt.toFormat('MMMM yyyy')}
            </h3>
            <div className="flex items-center space-x-1">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: leadingBlankDays }).map((_, i) => (
              <div key={`blank-${i}`} className="h-16 rounded-xl bg-slate-50/50" />
            ))}

            {monthAvailability.map((day) => {
              const dayNum = DateTime.fromISO(day.date).day;
              const isSelected = selectedDate === day.date;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`h-16 rounded-xl flex flex-col items-center justify-center p-1 border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                      : !day.isWorkingDay
                      ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-60'
                      : day.isHoliday
                      ? 'bg-rose-50 text-rose-500 border-rose-200'
                      : 'bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-sm">{dayNum}</span>
                  <span
                    className={`text-[9px] mt-0.5 font-medium truncate max-w-full px-1 ${
                      isSelected
                        ? 'text-indigo-100'
                        : day.isHoliday
                        ? 'text-rose-600 font-bold'
                        : !day.isWorkingDay
                        ? 'text-slate-400'
                        : 'text-emerald-600 font-semibold'
                    }`}
                  >
                    {day.isHoliday ? 'Holiday' : !day.isWorkingDay ? 'Weekend' : `${day.availableSlotsCount} open`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot Inspector Pane (Span 5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Slots for {DateTime.fromISO(selectedDate).toFormat('EEEE, MMMM d, yyyy')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Timezone: {selectedZone}</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {slots.length} Slots Generated
            </span>
          </div>

          {slots.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No active slots for this day (non-working day, holiday, or past date).
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-1">
              {slots.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{s.displayTime}</span>
                    <span className="text-[10px] text-slate-400">until {s.displayEndTime}</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Open Slot" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
