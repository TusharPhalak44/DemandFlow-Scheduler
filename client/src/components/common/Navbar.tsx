import React from 'react';
import { Shield, ExternalLink, LogOut, User, KeyRound } from 'lucide-react';
import { AdminUser } from '../../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  admin: AdminUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, admin, onLogout }) => {
  const isAdminView = currentView.startsWith('admin');

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('booking')}>
            <img
              src="/logo.png"
              alt="DemandFlow Scheduler"
              className="h-10 w-auto object-contain hover:opacity-90 transition-opacity"
            />
          </div>

          {/* Quick Nav Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => onNavigate('booking')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isAdminView
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Agent Booking UI</span>
            </button>

            {admin ? (
              <button
                onClick={() => onNavigate('admin-dashboard')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isAdminView
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Portal</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('admin-login')}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
            )}

            {admin && (
              <div className="hidden sm:flex items-center pl-3 border-l border-slate-200 space-x-2">
                <button
                  onClick={() => onNavigate('admin-users')}
                  title="Admin Profile & Password"
                  className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-2.5 py-1 rounded-full transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{admin.name}</span>
                  <KeyRound className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
