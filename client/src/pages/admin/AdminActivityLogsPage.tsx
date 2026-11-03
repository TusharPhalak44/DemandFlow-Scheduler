import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Clock, User, Shield } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { ActivityLog } from '../../types';

export const AdminActivityLogsPage: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, actionType]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await api.getActivityLogs({
        page: pagination.page,
        limit: pagination.limit,
        search,
        actionType: actionType || undefined,
      });
      setLogs(res.logs);
      setPagination(res.pagination);
    } catch (err: any) {
      showToast(err.message || 'Failed to load activity logs', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Activity Logs</h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete audit trail of bookings, schedule modifications, cancellations, and administrative events
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action type, entity ID, or details..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
          />
        </form>

        <div className="flex items-center space-x-2">
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium outline-none"
          >
            <option value="">All Action Types</option>
            <option value="BOOKING_CONFIRMED">BOOKING_CONFIRMED</option>
            <option value="BOOKING_CANCELLED_BY_ADMIN">BOOKING_CANCELLED_BY_ADMIN</option>
            <option value="BOOKING_RESCHEDULED">BOOKING_RESCHEDULED</option>
            <option value="WORKING_HOURS_UPDATED">WORKING_HOURS_UPDATED</option>
            <option value="SLOT_SETTINGS_UPDATED">SLOT_SETTINGS_UPDATED</option>
            <option value="CUSTOM_HOLIDAY_CREATED">CUSTOM_HOLIDAY_CREATED</option>
            <option value="AGENT_CREATED">AGENT_CREATED</option>
            <option value="ADMIN_LOGIN">ADMIN_LOGIN</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setActionType('');
            }}
            className="text-xs text-indigo-600 font-semibold px-2 py-1"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading activity trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No activity logs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Timestamp (UTC)</th>
                  <th className="px-5 py-3">Action Type</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Actor / Admin</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZone: 'UTC',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-800">
                      <span className="font-sans font-semibold text-slate-700">{log.entityType}</span>
                      {log.entityId && <span className="text-[11px] text-slate-400 ml-1">#{log.entityId}</span>}
                    </td>
                    <td className="px-5 py-3 font-sans">
                      {log.admin ? (
                        <span className="font-semibold text-slate-800 flex items-center space-x-1">
                          <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{log.admin.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">System / Public</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-sans text-slate-600 max-w-xs truncate" title={log.details || ''}>
                      {log.details || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-[11px]">
                      {log.ipAddress || '—'}
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
            Showing {logs.length} of {pagination.total} records
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-700 font-sans">
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
    </div>
  );
};
