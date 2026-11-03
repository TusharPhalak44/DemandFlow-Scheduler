import React, { useState, useEffect } from 'react';
import { Clock, Save, Sparkles, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { WorkingHours, SlotSettings } from '../../types';

export const AdminWorkingHoursPage: React.FC = () => {
  const { showToast } = useToast();
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [slotSettings, setSlotSettings] = useState<SlotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [whRes, ssRes] = await Promise.all([
          api.getWorkingHours(),
          api.getSlotSettings(),
        ]);
        setWorkingHours(whRes.workingHours);
        setSlotSettings(ssRes.slotSettings);
      } catch (err: any) {
        showToast(err.message || 'Failed to load working hours', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggleDay = (dayOfWeek: number) => {
    setWorkingHours((prev) =>
      prev.map((wh) =>
        wh.dayOfWeek === dayOfWeek ? { ...wh, isWorkingDay: !wh.isWorkingDay } : wh
      )
    );
  };

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setWorkingHours((prev) =>
      prev.map((wh) => (wh.dayOfWeek === dayOfWeek ? { ...wh, [field]: value } : wh))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateWorkingHours(workingHours);
      showToast('Working hours updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update working hours', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper to calculate total slots for a day
  const calculateDailySlots = (wh: WorkingHours) => {
    if (!wh.isWorkingDay || !slotSettings) return 0;
    const [sH, sM] = wh.startTime.split(':').map(Number);
    const [eH, eM] = wh.endTime.split(':').map(Number);
    const totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    if (totalMinutes <= 0) return 0;
    const interval = slotSettings.meetingDurationMinutes + slotSettings.bufferMinutes;
    return Math.floor(totalMinutes / interval);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Working Hours Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure business working days and daily operating windows. Default: Mon–Fri, 09:00 AM – 05:00 PM.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start space-x-3 text-xs text-indigo-900">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Dynamic Slot Calculation</p>
          <p className="text-indigo-700 mt-0.5">
            With meeting duration set to {slotSettings?.meetingDurationMinutes || 20} minutes and a{' '}
            {slotSettings?.bufferMinutes || 0} minute buffer, a standard 09:00 AM – 05:00 PM working window automatically produces exactly{' '}
            <span className="font-bold underline">24 slots per full working day</span>.
          </p>
        </div>
      </div>

      {/* Working Days Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {workingHours.map((wh) => {
            const slotsCount = calculateDailySlots(wh);

            return (
              <div
                key={wh.dayOfWeek}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  wh.isWorkingDay ? 'bg-white' : 'bg-slate-50/70 opacity-70'
                }`}
              >
                {/* Day Toggle & Name */}
                <div className="flex items-center space-x-4 min-w-[160px]">
                  <button
                    type="button"
                    onClick={() => handleToggleDay(wh.dayOfWeek)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      wh.isWorkingDay ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        wh.isWorkingDay ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{wh.dayName}</p>
                    <p className="text-[11px] text-slate-400">
                      {wh.isWorkingDay ? 'Active Working Day' : 'Non-Working (Off)'}
                    </p>
                  </div>
                </div>

                {/* Time Range Pickers */}
                {wh.isWorkingDay ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-semibold text-slate-500">From</span>
                      <input
                        type="time"
                        value={wh.startTime}
                        onChange={(e) => handleTimeChange(wh.dayOfWeek, 'startTime', e.target.value)}
                        className="text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <span className="text-slate-400 text-xs">to</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-semibold text-slate-500">To</span>
                      <input
                        type="time"
                        value={wh.endTime}
                        onChange={(e) => handleTimeChange(wh.dayOfWeek, 'endTime', e.target.value)}
                        className="text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">No slots will be generated</span>
                )}

                {/* Slot preview count */}
                <div className="text-right min-w-[120px]">
                  {wh.isWorkingDay ? (
                    <span className="inline-flex items-center text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                      {slotsCount} slots / day
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                      0 slots
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
