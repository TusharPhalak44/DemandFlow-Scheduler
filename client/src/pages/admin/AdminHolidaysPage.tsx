import React, { useState, useEffect } from 'react';
import { CalendarOff, Plus, Trash2, Shield, Calendar, Clock, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { Holiday, FederalHoliday } from '../../types';

export const AdminHolidaysPage: React.FC = () => {
  const { showToast } = useToast();
  const [autoFederalEnabled, setAutoFederalEnabled] = useState(true);
  const [federalHolidays, setFederalHolidays] = useState<FederalHoliday[]>([]);
  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    holidayDate: '',
    isRecurring: false,
    isPartial: false,
    startTime: '09:00',
    endTime: '13:00',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadHolidays();
  }, []);

  async function loadHolidays() {
    try {
      const res = await api.getHolidays();
      setAutoFederalEnabled(res.autoFederalHolidaysEnabled);
      setFederalHolidays(res.federalHolidays);
      setCustomHolidays(res.customHolidays);
    } catch (err: any) {
      showToast(err.message || 'Failed to load holidays', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleToggleFederal = async () => {
    try {
      const nextState = !autoFederalEnabled;
      const res = await api.toggleFederalHolidays(nextState);
      setAutoFederalEnabled(res.autoFederalHolidays);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle federal holidays', 'error');
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.holidayDate) {
      showToast('Please provide a holiday name and date', 'error');
      return;
    }

    setCreating(true);
    try {
      await api.createCustomHoliday({
        name: newHoliday.name,
        holidayDate: newHoliday.holidayDate,
        isRecurring: newHoliday.isRecurring,
        isPartial: newHoliday.isPartial,
        startTime: newHoliday.isPartial ? newHoliday.startTime : null,
        endTime: newHoliday.isPartial ? newHoliday.endTime : null,
      });
      showToast('Custom holiday added successfully!', 'success');
      setIsModalOpen(false);
      setNewHoliday({
        name: '',
        holidayDate: '',
        isRecurring: false,
        isPartial: false,
        startTime: '09:00',
        endTime: '13:00',
      });
      loadHolidays();
    } catch (err: any) {
      showToast(err.message || 'Failed to add custom holiday', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await api.deleteHoliday(id);
      showToast('Holiday deleted successfully.', 'success');
      loadHolidays();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete holiday', 'error');
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Holiday Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automatic exclusion of US Federal holidays (observed dates) and custom company holidays
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Holiday</span>
        </button>
      </div>

      {/* Federal Holidays Switcher Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Automatic US Federal Holiday Exclusions</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically calculates observed dates (Saturday moves to Friday, Sunday moves to Monday)
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleFederal}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
            autoFederalEnabled ? 'bg-emerald-600' : 'bg-slate-300'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              autoFederalEnabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custom Company Holidays Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <CalendarOff className="w-4 h-4 text-indigo-600" />
              <span>Custom Company Holidays ({customHolidays.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Full & Partial Days</span>
          </div>

          {customHolidays.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">
              No custom company holidays created yet. Click "Add Custom Holiday" above.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {customHolidays.map((h) => (
                <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{h.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {h.holidayDate.split('T')[0]} {h.isRecurring && '(Repeats Annually)'}
                    </p>
                    {h.isPartial && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-block mt-1">
                        Partial Day ({h.startTime} - {h.endTime})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calculated US Federal Holidays Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Calculated Federal Holidays</span>
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                autoFederalEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {autoFederalEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
            {federalHolidays.map((fh, idx) => (
              <div key={idx} className="p-3.5 px-5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800">{fh.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">Actual: {fh.actualDate}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Observed: {fh.observedDate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Custom Holiday Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Custom Company Holiday"
        subtitle="Exclude full or partial days from agent calendar availability"
      >
        <form onSubmit={handleCreateHoliday} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Holiday Name</label>
            <input
              type="text"
              required
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              placeholder="e.g. Annual Company Retreat / Summer Friday"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
            <input
              type="date"
              required
              value={newHoliday.holidayDate}
              onChange={(e) => setNewHoliday({ ...newHoliday, holidayDate: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-mono"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isRecurring"
              checked={newHoliday.isRecurring}
              onChange={(e) => setNewHoliday({ ...newHoliday, isRecurring: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isRecurring" className="text-xs text-slate-700 font-medium">
              Repeats annually on the same day every year
            </label>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isPartial"
              checked={newHoliday.isPartial}
              onChange={(e) => setNewHoliday({ ...newHoliday, isPartial: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isPartial" className="text-xs text-slate-700 font-medium">
              Partial-day holiday (block specific hours only)
            </label>
          </div>

          {newHoliday.isPartial && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Start Time</label>
                <input
                  type="time"
                  value={newHoliday.startTime}
                  onChange={(e) => setNewHoliday({ ...newHoliday, startTime: e.target.value })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">End Time</label>
                <input
                  type="time"
                  value={newHoliday.endTime}
                  onChange={(e) => setNewHoliday({ ...newHoliday, endTime: e.target.value })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
            >
              {creating ? 'Saving...' : 'Add Holiday'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
