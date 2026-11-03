import React, { useState, useEffect } from 'react';
import { Sliders, Save, Info, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { SlotSettings, CalendarSettings } from '../../types';

export const AdminSlotSettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [slotSettings, setSlotSettings] = useState<SlotSettings>({
    id: 1,
    meetingDurationMinutes: 20,
    slotsPerHour: 3,
    bufferMinutes: 0,
  });
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [ssRes, csRes] = await Promise.all([
          api.getSlotSettings(),
          api.getCalendarSettings(),
        ]);
        setSlotSettings(ssRes.slotSettings);
        setCalendarSettings(csRes.settings);
      } catch (err: any) {
        showToast(err.message || 'Failed to load slot settings', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        api.updateSlotSettings(slotSettings),
        calendarSettings
          ? api.updateCalendarSettings({
              minAdvanceHours: calendarSettings.minAdvanceHours,
              maxAdvanceDays: calendarSettings.maxAdvanceDays,
            })
          : Promise.resolve(),
      ]);
      showToast('Slot configuration saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const effectiveInterval = slotSettings.meetingDurationMinutes + slotSettings.bufferMinutes;
  const slotsPerHourCalculated = Math.floor(60 / effectiveInterval);
  const slotsIn8HourDay = Math.floor((8 * 60) / effectiveInterval);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Slot Configuration</h1>
          <p className="text-xs text-slate-500 mt-1">
            Control meeting duration, buffer time between meetings, and advance booking rules
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Card (Span 7) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Meeting Duration (Minutes)
              </label>
              <select
                value={slotSettings.meetingDurationMinutes}
                onChange={(e) =>
                  setSlotSettings({
                    ...slotSettings,
                    meetingDurationMinutes: parseInt(e.target.value, 10),
                  })
                }
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes (Default)</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes (1 Hour)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Length of each confirmed meeting</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Buffer Time Between Meetings (Minutes)
              </label>
              <select
                value={slotSettings.bufferMinutes}
                onChange={(e) =>
                  setSlotSettings({
                    ...slotSettings,
                    bufferMinutes: parseInt(e.target.value, 10),
                  })
                }
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
              >
                <option value={0}>0 Minutes (Back-to-back)</option>
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Rest or preparation time after every slot</p>
            </div>

            {calendarSettings && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Min Advance Booking Notice (Hours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={168}
                      value={calendarSettings.minAdvanceHours}
                      onChange={(e) =>
                        setCalendarSettings({
                          ...calendarSettings,
                          minAdvanceHours: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:border-indigo-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">e.g. Prevent bookings starting within 2 hours</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Max Advance Booking Window (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={calendarSettings.maxAdvanceDays}
                      onChange={(e) =>
                        setCalendarSettings({
                          ...calendarSettings,
                          maxAdvanceDays: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:border-indigo-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">e.g. Allow bookings up to 60 days ahead</p>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20 transition-all"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Configuration</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Calculation Preview Card (Span 5) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Engine Simulation</h3>
          </div>

          <p className="text-sm text-slate-300">
            With your current parameters, the slot generation engine dynamically creates:
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Slots Per Hour
              </span>
              <p className="text-2xl font-extrabold text-white mt-1">~{slotsPerHourCalculated}</p>
            </div>

            <div className="p-3 rounded-xl bg-white/10 backdrop-blur border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Slots Per 8h Day
              </span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">{slotsIn8HourDay}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-xs text-indigo-200">
            <p className="font-semibold">Default Configuration Status:</p>
            <p className="mt-0.5 text-[11px] text-slate-300">
              {slotSettings.meetingDurationMinutes === 20 && slotSettings.bufferMinutes === 0
                ? 'Matches requirement: 20m duration, 3 slots/hr, 0m buffer = 24 slots/day.'
                : 'Custom configuration active.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
