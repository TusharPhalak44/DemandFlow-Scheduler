import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Globe, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';

export const AdminReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.getDashboardStats();
        setData(res);
      } catch (err: any) {
        showToast(err.message || 'Failed to load report analytics', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const m = data?.metrics;
  const total = m?.totalBookingsCount || 1;
  const confirmed = m?.upcomingBookingsCount || 0;
  const cancelled = m?.cancelledCount || 0;
  const cancellationRate = Math.round((cancelled / total) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Detailed metrics, meeting conversion distributions, and agent performance insights
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bookings</span>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{m?.totalBookingsCount || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">All time bookings recorded</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Volume</span>
          <p className="text-3xl font-extrabold text-indigo-600 mt-1">{m?.weeklyCount || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Past 7 days</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Volume</span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{m?.monthlyCount || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Past 30 days</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancellation Rate</span>
          <p className="text-3xl font-extrabold text-rose-600 mt-1">{cancellationRate}%</p>
          <p className="text-[11px] text-slate-400 mt-1">{cancelled} cancellations</p>
        </div>
      </div>

      {/* Detailed Status Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Meeting Status Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(data?.statusDistribution || []).map((s: any) => (
            <div key={s.status} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                {s.status.replace(/_/g, ' ')}
              </span>
              <p className="text-xl font-extrabold text-slate-800 mt-1">{s.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Agent Booking Leaderboard</h3>
          <p className="text-xs text-slate-400 mt-0.5">Total meetings handled by each registered agent</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Total Meetings</th>
                <th className="px-5 py-3">% of All Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.agentWiseStats || []).map((agent: any) => {
                const percent = Math.round((agent.count / total) * 100);
                return (
                  <tr key={agent.agentId} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{agent.name}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono">{agent.email}</td>
                    <td className="px-5 py-3.5 font-extrabold text-indigo-600">{agent.count}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700">{percent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
