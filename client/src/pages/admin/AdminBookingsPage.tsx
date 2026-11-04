import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  Globe,
  MoreVertical,
  XCircle,
  RefreshCw,
  Copy,
  Eye,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Booking, MultiTimezoneFormat, ClientProfile } from '../../types';

export const AdminBookingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clientList, setClientList] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [clientCode, setClientCode] = useState('');
  const [timezone, setTimezone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [multiTzData, setMultiTzData] = useState<MultiTimezoneFormat[]>([]);

  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [rescheduleSlot, setRescheduleSlot] = useState<any | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    api.getAdminClients()
      .then((res) => setClientList(res.clients || []))
      .catch(() => setClientList([]));
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [pagination.page, status, clientCode, timezone, startDate, endDate]);

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await api.adminListBookings({
        page: pagination.page,
        limit: pagination.limit,
        search,
        status: status === 'ALL' ? undefined : status,
        clientCode: clientCode || undefined,
        timezone: timezone || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setBookings(res.bookings);
      setPagination(res.pagination);
    } catch (err: any) {
      showToast(err.message || 'Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchBookings();
  };

  const handleOpenCancel = (booking: Booking) => {
    setActiveBooking(booking);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!activeBooking) return;
    setCancelling(true);
    try {
      await api.adminCancelBooking(activeBooking.id, cancelReason);
      showToast('Booking cancelled and slot released successfully.', 'success');
      setCancelModalOpen(false);
      fetchBookings();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel booking', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenDetails = async (booking: Booking) => {
    setActiveBooking(booking);
    try {
      const res = await api.getBookingByReference(booking.bookingReference);
      setMultiTzData(res.allFourTimezones);
      setDetailsModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to load booking details', 'error');
    }
  };

  const handleCopySingle = () => {
    if (!activeBooking) return;
    const matchingTz = multiTzData.find((t) => t.zoneId === activeBooking.bookedTimezone) || multiTzData[0];
    const text = [
      `DemandFlow Scheduler - Meeting Details`,
      `----------------------------------------`,
      `Selected Meeting Time: ${matchingTz ? matchingTz.formattedFull : new Date(activeBooking.slotStartUtc).toUTCString()}`,
      `Timezone: ${activeBooking.bookedTimezone}`,
      `Agent: ${activeBooking.agentName}`,
      `Prospect Email: ${activeBooking.prospectEmail || 'N/A'}`,
      `Reference: ${activeBooking.bookingReference}`,
      `Status: ${activeBooking.status}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    showToast('Meeting details with selected time copied!', 'success');
  };

  const handleCopyAllTimezones = () => {
    if (!activeBooking || multiTzData.length === 0) return;
    const matchingTz = multiTzData.find((t) => t.zoneId === activeBooking.bookedTimezone) || multiTzData[0];
    const lines = multiTzData.map((tz) => `• ${tz.label}: ${tz.formattedTime}`).join('\n');
    const text = [
      `DemandFlow Scheduler - Meeting Times Across 4 US Timezones`,
      `----------------------------------------`,
      `Selected Meeting Time: ${matchingTz ? matchingTz.formattedFull : new Date(activeBooking.slotStartUtc).toUTCString()}`,
      `Timezone: ${activeBooking.bookedTimezone}`,
      `Reference: ${activeBooking.bookingReference}`,
      `Agent: ${activeBooking.agentName}`,
      `Prospect Email: ${activeBooking.prospectEmail || 'N/A'}`,
      `\nTimes across US Regions:`,
      lines,
      `\nStatus: ${activeBooking.status}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    showToast('Copied across all 4 US Timezones with selected times!', 'success');
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await api.adminUpdateBookingStatus(id, newStatus);
      showToast(`Status updated to ${newStatus}.`, 'success');
      fetchBookings();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Reschedule flow
  const handleOpenReschedule = (booking: Booking) => {
    setActiveBooking(booking);
    setRescheduleDate('');
    setRescheduleSlots([]);
    setRescheduleSlot(null);
    setRescheduleReason('');
    setRescheduleModalOpen(true);
  };

  const handleRescheduleDateChange = async (date: string) => {
    setRescheduleDate(date);
    setRescheduleSlot(null);
    if (!date) return;
    try {
      const res = await api.getSlotsForDate(date, activeBooking?.bookedTimezone || 'America/New_York');
      setRescheduleSlots(res.slots);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch slots for date', 'error');
      setRescheduleSlots([]);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!activeBooking || !rescheduleSlot) {
      showToast('Please select a new time slot', 'error');
      return;
    }
    setRescheduling(true);
    try {
      await api.adminRescheduleBooking(activeBooking.id, {
        newSlotStartUtc: rescheduleSlot.slotStartUtc,
        newSlotEndUtc: rescheduleSlot.slotEndUtc,
        reason: rescheduleReason,
      });
      showToast('Meeting rescheduled and new slot allocated successfully!', 'success');
      setRescheduleModalOpen(false);
      fetchBookings();
    } catch (err: any) {
      showToast(err.message || 'Failed to reschedule meeting', 'error');
    } finally {
      setRescheduling(false);
    }
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('meeting_calendar_admin_token');
    window.open(`/api/admin/bookings/export/csv?token=${token}`, '_blank');
    showToast('Exporting bookings CSV report...', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Booking Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, reschedule, cancel, and export confirmed meeting bookings
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, prospect, company, or agent email..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED_BY_ADMIN">Cancelled by Admin</option>
              <option value="CANCELLED_BY_AGENT">Cancelled by Agent</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>

          {/* Timezone Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-500">Timezone:</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium outline-none"
            >
              <option value="">All Timezones</option>
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono outline-none"
            />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono outline-none"
            />
          </div>

          {/* Client Code Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-500">Client:</span>
            <select
              value={clientCode}
              onChange={(e) => setClientCode(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium outline-none"
            >
              <option value="">All Clients</option>
              {clientList.map((c) => (
                <option key={c.id} value={c.clientCode}>
                  #{c.clientCode} - {c.name}
                </option>
              ))}
            </select>
          </div>

          {(search || status !== 'ALL' || clientCode || timezone || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setStatus('ALL');
                setClientCode('');
                setTimezone('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-indigo-600 font-semibold hover:underline text-xs ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading bookings from database...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No bookings found matching your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Reference & Client</th>
                  <th className="px-5 py-3">Prospect & Company</th>
                  <th className="px-5 py-3">Agent</th>
                  <th className="px-5 py-3">Scheduled Slot</th>
                  <th className="px-5 py-3">Timezone</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-indigo-600">{b.bookingReference}</div>
                      {b.clientCode && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          #{b.clientCode}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{b.prospectName}</p>
                      <p className="text-[11px] text-slate-500">{b.companyName}</p>
                      {b.prospectEmail && (
                        <p className="text-[10px] text-slate-400 font-mono">{b.prospectEmail}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{b.agentName}</p>
                      <p className="text-[11px] text-slate-400">{b.agentEmail}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <p className="text-slate-800 font-semibold">
                        {new Date(b.slotStartUtc).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(b.slotStartUtc).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'UTC',
                        })}{' '}
                        UTC
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {b.bookedTimezone.replace('America/', '').replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={b.status} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenDetails(b)}
                          title="View Details & Multi-timezone format"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => window.open(api.getIcsDownloadUrl(b.bookingReference), '_blank')}
                          title="Download ICS"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {b.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => handleOpenReschedule(b)}
                              title="Reschedule Meeting"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenCancel(b)}
                              title="Cancel & Release Slot"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                              title="Mark as Completed"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {bookings.length} of {pagination.total} bookings
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-700">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Meeting Booking"
        subtitle={`Reference: ${activeBooking?.bookingReference}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Cancelling will release the allocated slot in <span className="font-mono font-bold">slot_inventory</span> so
            it immediately becomes available again for other bookings. The historical meeting record will be preserved.
          </p>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Cancellation Reason</label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Prospect called to cancel / Schedule conflict"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              disabled={cancelling}
              onClick={handleConfirmCancel}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20"
            >
              {cancelling ? 'Cancelling & Releasing Slot...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Details & Multi-Timezone Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Meeting Details & Multi-Timezone Formats"
        subtitle={`Reference: ${activeBooking?.bookingReference}`}
      >
        {activeBooking && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p><span className="font-bold text-slate-600">Prospect:</span> {activeBooking.prospectName} ({activeBooking.companyName})</p>
              <p><span className="font-bold text-slate-600">Email:</span> {activeBooking.prospectEmail || 'None provided'}</p>
              <p><span className="font-bold text-slate-600">Agent:</span> {activeBooking.agentName} ({activeBooking.agentEmail})</p>
              <p><span className="font-bold text-slate-600">Purpose:</span> {activeBooking.meetingPurpose}</p>
              {activeBooking.meetingNotes && (
                <p><span className="font-bold text-slate-600">Notes:</span> {activeBooking.meetingNotes}</p>
              )}
            </div>

            <div>
              <p className="font-bold text-slate-800 mb-2">Equivalent Time Across 4 US Regions:</p>
              <div className="space-y-1.5">
                {multiTzData.map((tz) => (
                  <div
                    key={tz.zoneId}
                    className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center justify-between"
                  >
                    <span className="font-semibold text-indigo-950">{tz.label}</span>
                    <span className="font-mono font-bold text-indigo-700">{tz.formattedTime}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopySingle}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs flex items-center space-x-1.5 hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Details</span>
                </button>
                <button
                  onClick={handleCopyAllTimezones}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs flex items-center space-x-1.5 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy 4 Timezones</span>
                </button>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Meeting"
        subtitle={`Current Reference: ${activeBooking?.bookingReference}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Pick New Date</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => handleRescheduleDateChange(e.target.value)}
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 outline-none"
            />
          </div>

          {rescheduleDate && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Select New Available Slot</label>
              {rescheduleSlots.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  No open slots on this date.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1">
                  {rescheduleSlots.map((s) => {
                    const isSel = rescheduleSlot?.slotStartUtc === s.slotStartUtc;
                    return (
                      <button
                        key={s.slotStartUtc}
                        type="button"
                        onClick={() => setRescheduleSlot(s)}
                        className={`py-2 px-1 text-xs rounded-lg font-bold border transition-all ${
                          isSel
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-400'
                        }`}
                      >
                        {s.displayTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Reschedule Reason (Optional)</label>
            <input
              type="text"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="e.g. Moved at prospect's request"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={rescheduling || !rescheduleSlot}
              onClick={handleConfirmReschedule}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {rescheduling ? 'Rescheduling Slot...' : 'Confirm New Time'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
