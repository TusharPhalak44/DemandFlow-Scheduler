import React, { useState, useEffect } from 'react';
import { Link2, Copy, ExternalLink, CheckCircle2, User } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { BookingLink } from '../../types';

export const AdminBookingLinksPage: React.FC = () => {
  const { showToast } = useToast();
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    try {
      const res = await api.getBookingLinks();
      setLinks(res.links);
    } catch (err: any) {
      showToast(err.message || 'Failed to load booking links', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (token: string) => {
    const origin = window.location.origin;
    const url = `${origin}/#/book/${token}`;
    navigator.clipboard.writeText(url);
    showToast('Booking URL copied to clipboard!', 'success');
  };

  const handleToggle = async (link: BookingLink) => {
    try {
      await api.toggleBookingLink(link.id, !link.isActive);
      showToast('Booking link status updated.', 'success');
      loadLinks();
    } catch (err: any) {
      showToast(err.message || 'Failed to update link', 'error');
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
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Booking Link Management</h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor public scheduling URLs, click tracking, agent assignment, and link activation
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Link Name</th>
                <th className="px-5 py-3">Assigned Agent</th>
                <th className="px-5 py-3">Token & URL</th>
                <th className="px-5 py-3">Activity / Clicks</th>
                <th className="px-5 py-3">Active Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{link.name}</td>
                  <td className="px-5 py-3.5">
                    {link.agent ? (
                      <span className="font-semibold text-slate-800 flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{link.agent.name}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">General / Unassigned</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-indigo-600 font-semibold">
                    .../#/book/{link.token}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-700">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-full text-xs">
                      {link.clicksCount} bookings
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggle(link)}
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        link.isActive ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          link.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleCopy(link.token)}
                        title="Copy Link URL"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={`/#/book/${link.token}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in new tab"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
