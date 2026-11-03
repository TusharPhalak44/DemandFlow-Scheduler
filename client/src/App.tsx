import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { ToastProvider, useToast } from './components/common/Toast';
import { BookingPage } from './pages/booking/BookingPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminCalendarPage } from './pages/admin/AdminCalendarPage';
import { AdminWorkingHoursPage } from './pages/admin/AdminWorkingHoursPage';
import { AdminSlotSettingsPage } from './pages/admin/AdminSlotSettingsPage';
import { AdminHolidaysPage } from './pages/admin/AdminHolidaysPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminAgentsPage } from './pages/admin/AdminAgentsPage';
import { AdminBookingLinksPage } from './pages/admin/AdminBookingLinksPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminActivityLogsPage } from './pages/admin/AdminActivityLogsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { api } from './services/api';
import { AdminUser } from './types';

function AppContent() {
  const { showToast } = useToast();
  const [currentView, setCurrentView] = useState('booking');
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Parse URL hash on load and listen to hashchange
  useEffect(() => {
    function parseHash() {
      const hash = window.location.hash.replace('#/', '');
      if (!hash || hash.startsWith('book')) {
        setCurrentView('booking');
      } else if (hash.startsWith('admin')) {
        setCurrentView(hash);
      }
    }

    parseHash();
    window.addEventListener('hashchange', parseHash);

    // Check existing auth token
    async function checkAuth() {
      const token = localStorage.getItem('meeting_calendar_admin_token');
      if (token) {
        try {
          const res = await api.getMe();
          setAdmin(res.admin);
        } catch {
          localStorage.removeItem('meeting_calendar_admin_token');
          setAdmin(null);
        }
      }
      setAuthChecking(false);
    }
    checkAuth();

    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    window.location.hash = `#/${view}`;
  };

  const handleLoginSuccess = (adminUser: AdminUser) => {
    setAdmin(adminUser);
    handleNavigate('admin-dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('meeting_calendar_admin_token');
    setAdmin(null);
    showToast('Logged out successfully.', 'info');
    handleNavigate('booking');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdminRoute = currentView.startsWith('admin');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        admin={admin}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {/* Public Booking Route */}
        {!isAdminRoute && <BookingPage />}

        {/* Admin Login Route */}
        {isAdminRoute && !admin && (
          <AdminLoginPage onLoginSuccess={handleLoginSuccess} />
        )}

        {/* Authenticated Admin Views with Sidebar */}
        {isAdminRoute && admin && (
          <div className="flex">
            <Sidebar currentView={currentView} onNavigate={handleNavigate} />
            <div className="flex-1 p-6 lg:p-8 max-w-7xl overflow-hidden">
              {currentView === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}
              {currentView === 'admin-calendar' && <AdminCalendarPage />}
              {currentView === 'admin-working-hours' && <AdminWorkingHoursPage />}
              {currentView === 'admin-slot-settings' && <AdminSlotSettingsPage />}
              {currentView === 'admin-holidays' && <AdminHolidaysPage />}
              {currentView === 'admin-bookings' && <AdminBookingsPage />}
              {currentView === 'admin-agents' && <AdminAgentsPage />}
              {currentView === 'admin-links' && <AdminBookingLinksPage />}
              {currentView === 'admin-users' && <AdminUsersPage currentAdmin={admin} />}
              {currentView === 'admin-reports' && <AdminReportsPage />}
              {currentView === 'admin-settings' && <AdminSettingsPage />}
              {currentView === 'admin-logs' && <AdminActivityLogsPage />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
