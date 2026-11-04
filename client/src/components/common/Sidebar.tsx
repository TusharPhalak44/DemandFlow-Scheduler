import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Clock,
  Sliders,
  CalendarOff,
  BookOpenCheck,
  Users,
  Link2,
  BarChart3,
  Settings,
  History,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const menuItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-clients', label: 'Client Codes', icon: Building2 },
    { id: 'admin-calendar', label: 'Calendar Inspector', icon: Calendar },
    { id: 'admin-working-hours', label: 'Working Hours', icon: Clock },
    { id: 'admin-slot-settings', label: 'Slot Settings', icon: Sliders },
    { id: 'admin-holidays', label: 'Holiday Management', icon: CalendarOff },
    { id: 'admin-bookings', label: 'Booking Management', icon: BookOpenCheck },
    { id: 'admin-agents', label: 'Agent Management', icon: Users },
    { id: 'admin-links', label: 'Booking Links', icon: Link2 },
    { id: 'admin-users', label: 'Admin Users & Password', icon: Users },
    { id: 'admin-reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'admin-settings', label: 'General Settings', icon: Settings },
    { id: 'admin-logs', label: 'Activity Logs', icon: History },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col shrink-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
        Admin Modules
      </div>
      <nav className="space-y-1 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-100">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
          <p className="text-[11px] font-semibold text-slate-700">DemandFlow Scheduler</p>
          <p className="text-[10px] text-slate-400 mt-0.5">High-Performance Booking</p>
        </div>
      </div>
    </aside>
  );
};
