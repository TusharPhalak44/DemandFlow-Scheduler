import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Globe,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { Badge } from '../../components/common/Badge';
import { Booking } from '../../types';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    metrics: {
      todayBookingsCount: number;
      upcomingBookingsCount: number;
      cancelledCount: number;
      weeklyCount: number;
      monthlyCount: number;
      totalBookingsCount: number;
      activeAgentsCount: number;
    };
    agentWiseStats: { agentId: number; name: string; email: string; count: number }[];
    timezoneDistribution: { timezone: string; count: number }[];
    statusDistribution: { status: string; count: number }[];
    recentBookings: Booking[];
  } | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.getDashboardStats();
        setData(res);
      } catch (err: any) {
        showToast(err.message || 'Failed to load dashboard metrics', 'error');
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

  const kpis = [
    {
      title: "Today's Bookings",
      value: m?.todayBookingsCount ?? 0,
      icon: Calendar,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Upcoming Meetings',
      value: m?.upcomingBookingsCount ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Cancelled Meetings',
      value: m?.cancelledCount ?? 0,
      icon: XCircle,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
    },
    {
      title: 'Weekly Bookings (7d)',
      value: m?.weeklyCount ?? 0,
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      title: 'Monthly Bookings (30d)',
      value: m?.monthlyCount ?? 0,
      icon: Clock,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      title: 'Active Agents',
      value: m?.activeAgentsCount ?? 0,
      icon: Users,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time meeting metrics, agent activity, and booking analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('admin-bookings')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-all"
          >
            Manage Bookings
          </button>
          <button
            onClick={() => onNavigate('booking')}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-sm transition-all flex items-center space-x-1.5"
          >
            <span>Open Public Calendar</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">{kpi.title}</span>
                <div className={`p-2 rounded-xl border ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Breakdown Grid: Agent Leaderboard & Timezone Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Leaderboard */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Agent Booking Performance</span>
            </h3>
            <button
              onClick={() => onNavigate('admin-agents')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View All Agents
            </button>
          </div>

          {(!data?.agentWiseStats || data.agentWiseStats.length === 0) ? (
            <p className="text-xs text-slate-400 py-8 text-center">No agent booking records yet.</p>
          ) : (
            <div className="space-y-3">
              {data.agentWiseStats.map((agent) => {
                const maxCount = Math.max(...data.agentWiseStats.map((a) => a.count), 1);
                const percent = Math.round((agent.count / maxCount) * 100);

                return (
                  <div key={agent.agentId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{agent.name}</span>
                      <span className="font-bold text-indigo-600">{agent.count} meetings</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Timezone Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>Bookings by US Timezone</span>
            </h3>
            <span className="text-[11px] font-medium text-slate-400">Regional Distribution</span>
          </div>

          {(!data?.timezoneDistribution || data.timezoneDistribution.length === 0) ? (
            <p className="text-xs text-slate-400 py-8 text-center">No timezone booking data recorded.</p>
          ) : (
            <div className="space-y-3">
              {data.timezoneDistribution.map((tz) => {
                const total = data.metrics.totalBookingsCount || 1;
                const percent = Math.round((tz.count / total) * 100);

                return (
                  <div key={tz.timezone} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {tz.timezone.replace('America/', '').replace('_', ' ')} Timezone
                      </span>
                      <span className="font-bold text-slate-700">
                        {tz.count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-teal-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Meeting Bookings</h3>
            <p className="text-xs text-slate-400 mt-0.5">Most recent meetings submitted to the database</p>
          </div>
          <button
            onClick={() => onNavigate('admin-bookings')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {(!data?.recentBookings || data.recentBookings.length === 0) ? (
          <p className="text-xs text-slate-400 py-8 text-center">No bookings confirmed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Prospect & Company</th>
                  <th className="px-5 py-3">Agent</th>
                  <th className="px-5 py-3">Scheduled (UTC)</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-indigo-600">{b.bookingReference}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800">{b.prospectName}</p>
                      <p className="text-[11px] text-slate-400">{b.companyName}</p>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700">{b.agentName}</td>
                    <td className="px-5 py-3 font-mono text-slate-600">
                      {new Date(b.slotStartUtc).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC',
                      })}{' '}
                      UTC
                    </td>
                    <td className="px-5 py-3">
                      <Badge status={b.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
