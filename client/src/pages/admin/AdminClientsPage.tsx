import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Clock,
  Calendar as CalendarIcon,
  Copy,
  ExternalLink,
  Edit2,
  Trash2,
  BarChart3,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  Check,
  Globe,
  Settings,
  Briefcase,
  AlertCircle,
  X,
  Percent,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { ClientProfile, ClientStats, Booking } from '../../types';

export const AdminClientsPage: React.FC = () => {
  const { showToast } = useToast();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [analyticsClient, setAnalyticsClient] = useState<{
    client: ClientProfile;
    stats: ClientStats;
    recentBookings: Booking[];
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    clientCode: '',
    name: '',
    description: '',
    defaultTimezone: 'America/New_York',
    meetingDurationMinutes: 20,
    bufferMinutes: 0,
    slotsPerHour: 3,
    workingDays: '1,2,3,4,5',
    startTime: '09:00',
    endTime: '17:00',
    autoFederalHolidays: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminClients();
      setClients(res.clients);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      clientCode: '',
      name: '',
      description: '',
      defaultTimezone: 'America/New_York',
      meetingDurationMinutes: 20,
      bufferMinutes: 0,
      slotsPerHour: 3,
      workingDays: '1,2,3,4,5',
      startTime: '09:00',
      endTime: '17:00',
      autoFederalHolidays: true,
    });
    setEditingClient(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (c: ClientProfile) => {
    setFormData({
      clientCode: c.clientCode,
      name: c.name,
      description: c.description || '',
      defaultTimezone: c.defaultTimezone || 'America/New_York',
      meetingDurationMinutes: c.meetingDurationMinutes || 20,
      bufferMinutes: c.bufferMinutes || 0,
      slotsPerHour: c.slotsPerHour || 3,
      workingDays: c.workingDays || '1,2,3,4,5',
      startTime: c.startTime || '09:00',
      endTime: c.endTime || '17:00',
      autoFederalHolidays: c.autoFederalHolidays ?? true,
    });
    setEditingClient(c);
    setIsCreateModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientCode.trim() || !formData.name.trim()) {
      showToast('Client code and client name are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingClient) {
        await api.updateAdminClient(editingClient.clientCode, formData);
        showToast(`Client ${editingClient.clientCode} updated successfully!`, 'success');
      } else {
        await api.createAdminClient(formData);
        showToast(`Client ${formData.clientCode} created successfully!`, 'success');
      }
      setIsCreateModalOpen(false);
      fetchClients();
    } catch (err: any) {
      showToast(err.message || 'Failed to save client profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (code: string) => {
    if (!window.confirm(`Are you sure you want to deactivate/delete client ${code}?`)) {
      return;
    }

    try {
      await api.deleteAdminClient(code);
      showToast(`Client ${code} removed successfully.`, 'info');
      fetchClients();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete client', 'error');
    }
  };

  const handleOpenAnalytics = async (client: ClientProfile) => {
    setLoadingStats(true);
    try {
      const data = await api.getClientStats(client.clientCode);
      setAnalyticsClient(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load client statistics', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCopyLink = (code: string) => {
    const origin = window.location.origin;
    const link = `${origin}/#/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    showToast(`Direct booking link copied: /#/${code}`, 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const filteredClients = clients.filter(
    (c) =>
      c.clientCode.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Overall Aggregate Numbers
  const totalBookingsAll = clients.reduce((acc, c) => acc + (c.totalBookingsCount || 0), 0);
  const totalOpenSlotsAll = clients.reduce((acc, c) => acc + (c.openSlotsCount || 0), 0);
  const avgOccupancy =
    clients.length > 0
      ? Math.round(
          clients.reduce((acc, c) => acc + (c.occupancyRate || 0), 0) / clients.length
        )
      : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Multi-Client Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Client Calendars & Client Codes
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Create separate calendars, booking links, and slot configurations for each Client Code (e.g. 1050, 4020).
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Client Code</span>
        </button>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Total Clients
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{clients.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Active Client Codes</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Total Bookings
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalBookingsAll}</p>
          <p className="text-xs text-slate-500 mt-0.5">Across all client codes</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Open Slots (This Month)
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalOpenSlotsAll}</p>
          <p className="text-xs text-slate-500 mt-0.5">Available for booking</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Avg Occupancy
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{avgOccupancy}%</p>
          <p className="text-xs text-slate-500 mt-0.5">Slot capacity booked</p>
        </div>
      </div>

      {/* Client List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Client Code (e.g. 1050), Name, or Company..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filteredClients.length}</span> client portals
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Loading client calendars & slot metrics...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No client codes found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your first client code (e.g. 1050, 4020) to generate dedicated booking portals and custom slot configurations.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Client Code</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Client Code</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Slot Settings</th>
                  <th className="py-3 px-4">Working Hours</th>
                  <th className="py-3 px-4">Bookings</th>
                  <th className="py-3 px-4">Open Slots</th>
                  <th className="py-3 px-4">Direct Link</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredClients.map((client) => {
                  const isCopied = copiedCode === client.clientCode;
                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Client Code Badge */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg font-mono text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                          #{client.clientCode}
                        </span>
                      </td>

                      {/* Client Name & Description */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                          {client.description || 'Dedicated client scheduling portal'}
                        </p>
                      </td>

                      {/* Slot Settings */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs">
                          <p className="font-semibold text-slate-800">
                            ⏱️ {client.meetingDurationMinutes} min meeting
                          </p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Buffer: {client.bufferMinutes} min • {client.slotsPerHour} slots/hr
                          </p>
                        </div>
                      </td>

                      {/* Working Hours */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs">
                          <p className="font-semibold text-slate-800">
                            {client.startTime} - {client.endTime}
                          </p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {client.defaultTimezone.split('/')[1]?.replace('_', ' ') || client.defaultTimezone}
                          </p>
                        </div>
                      </td>

                      {/* Bookings Count */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {client.confirmedBookingsCount ?? client.totalBookingsCount ?? 0} booked
                        </span>
                      </td>

                      {/* Open Slots */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {client.openSlotsCount ?? 0} open
                        </span>
                      </td>

                      {/* Direct Booking Link */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleCopyLink(client.clientCode)}
                            title="Copy link to clipboard"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={`/#/${client.clientCode}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open client booking page"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors inline-block"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <span className="text-[11px] font-mono text-slate-400">/#{client.clientCode}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenAnalytics(client)}
                            title="View Client Slot Analytics"
                            className="p-2 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            title="Edit Settings"
                            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.clientCode)}
                            title="Deactivate / Delete Client"
                            className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Client */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingClient ? `Edit Client Code #${editingClient.clientCode}` : 'Create New Client Code'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure custom booking rules, slot duration, and working hours for this client.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client Code */}
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Client Code * (e.g. 1050, 4020)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingClient}
                    value={formData.clientCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, clientCode: e.target.value.trim() }))}
                    placeholder="1050"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Direct link will be: <span className="font-mono text-indigo-600">/#/{formData.clientCode || 'code'}</span>
                  </p>
                </div>

                {/* Client / Company Name */}
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Client / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                  Portal Description / Meeting Purpose
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Priority Strategy Consultation & Account Review"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Slot Settings Grid */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
                <span className="text-xs font-bold uppercase text-indigo-900 tracking-wider block">
                  ⚙️ Slot & Meeting Rules
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Meeting Duration
                    </label>
                    <select
                      value={formData.meetingDurationMinutes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, meetingDurationMinutes: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={20}>20 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Buffer Time
                    </label>
                    <select
                      value={formData.bufferMinutes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, bufferMinutes: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                    >
                      <option value={0}>0 minutes</option>
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Default Timezone
                    </label>
                    <select
                      value={formData.defaultTimezone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, defaultTimezone: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                    >
                      <option value="America/New_York">Eastern (ET)</option>
                      <option value="America/Chicago">Central (CT)</option>
                      <option value="America/Denver">Mountain (MT)</option>
                      <option value="America/Los_Angeles">Pacific (PT)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Working Hours & Days */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Working Hours Window
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Working Days
                  </label>
                  <select
                    value={formData.workingDays}
                    onChange={(e) => setFormData((prev) => ({ ...prev, workingDays: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                  >
                    <option value="1,2,3,4,5">Monday - Friday (Standard)</option>
                    <option value="1,2,3,4,5,6">Monday - Saturday (Extended)</option>
                    <option value="1,2,3,4,5,6,7">All 7 Days (Every Day)</option>
                  </select>
                </div>
              </div>

              {/* Auto Federal Holidays */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <p className="text-xs font-bold text-slate-800">Auto-Exclude US Federal Holidays</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automatically block scheduling on New Year, Memorial Day, July 4, Thanksgiving, etc.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoFederalHolidays}
                  onChange={(e) => setFormData((prev) => ({ ...prev, autoFederalHolidays: e.target.checked }))}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Client Analytics & Slot Breakdown */}
      {analyticsClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Client #{analyticsClient.client.clientCode} — {analyticsClient.client.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time slot capacity, bookings count, and utilization breakdown
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAnalyticsClient(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Total Bookings
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {analyticsClient.stats.totalBookings}
                </p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider block">
                  Confirmed Slots
                </span>
                <p className="text-2xl font-black text-emerald-800 mt-1">
                  {analyticsClient.stats.confirmedBookings}
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-600 tracking-wider block">
                  Open Slots (Month)
                </span>
                <p className="text-2xl font-black text-amber-800 mt-1">
                  {analyticsClient.stats.openSlots}
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200">
                <span className="text-[10px] font-bold uppercase text-purple-600 tracking-wider block">
                  Occupancy Rate
                </span>
                <p className="text-2xl font-black text-purple-800 mt-1">
                  {analyticsClient.stats.occupancyRate}%
                </p>
              </div>
            </div>

            {/* Direct Link Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-bold text-indigo-900">Direct Client Booking URL</p>
                <p className="text-xs font-mono text-indigo-700 mt-0.5">
                  {window.location.origin}/#/{analyticsClient.client.clientCode}
                </p>
              </div>
              <button
                onClick={() => handleCopyLink(analyticsClient.client.clientCode)}
                className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 cursor-pointer self-start sm:self-center"
              >
                Copy Link
              </button>
            </div>

            {/* Recent Bookings List for this client */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                Recent Bookings for Client #{analyticsClient.client.clientCode}
              </h4>
              {analyticsClient.recentBookings.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl text-center">
                  No bookings recorded yet for this client code.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {analyticsClient.recentBookings.map((b) => (
                    <div key={b.id} className="p-3 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-indigo-600">{b.bookingReference}</span>
                        <span className="text-slate-700 ml-2 font-semibold">{b.prospectEmail || b.prospectName}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-slate-500">
                        <span>{new Date(b.slotStartUtc).toLocaleDateString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
