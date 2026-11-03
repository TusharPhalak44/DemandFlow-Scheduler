import React, { useState, useEffect } from 'react';
import { Settings, Save, Building, Globe, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { CalendarSettings } from '../../types';

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<CalendarSettings>({
    id: 1,
    companyName: 'DemandFlow Scheduler',
    schedulingTimezone: 'America/New_York',
    autoFederalHolidays: true,
    minAdvanceHours: 2,
    maxAdvanceDays: 60,
    prospectEmailRequired: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.getCalendarSettings();
        setSettings(res.settings);
      } catch (err: any) {
        showToast(err.message || 'Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateCalendarSettings(settings);
      showToast('Settings saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">General Settings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure branding, baseline operating timezone, and prospect requirement rules
          </p>
        </div>
      </div>

      <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Company / Organization Name</label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Displayed prominently on the public booking page</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Baseline Scheduling Timezone</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={settings.schedulingTimezone}
                onChange={(e) => setSettings({ ...settings, schedulingTimezone: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white font-medium"
              >
                <option value="America/New_York">Eastern Time (America/New_York)</option>
                <option value="America/Chicago">Central Time (America/Chicago)</option>
                <option value="America/Denver">Mountain Time (America/Denver)</option>
                <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Your business working hours (e.g. 09:00 - 17:00) operate relative to this base timezone
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Booking Form Fields</h4>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    prospectEmailRequired: !settings.prospectEmailRequired,
                  })
                }
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  settings.prospectEmailRequired ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    settings.prospectEmailRequired ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <div>
                <p className="text-xs font-bold text-slate-800">Require Prospect Email</p>
                <p className="text-[11px] text-slate-500">
                  When enabled, agents must provide a valid prospect email to confirm the booking
                </p>
              </div>
            </div>
          </div>

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
                <span>Save General Settings</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
