import React, { useState, useEffect } from 'react';
import { Users, Plus, Copy, Edit, Link2, Globe, Mail, Phone, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Agent } from '../../types';

export const AdminAgentsPage: React.FC = () => {
  const { showToast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    defaultTimezone: 'America/New_York',
  });
  const [creating, setCreating] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      const res = await api.getAgents();
      setAgents(res.agents);
    } catch (err: any) {
      showToast(err.message || 'Failed to load agents', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createAgent(newAgent);
      showToast('Agent created with unique booking link!', 'success');
      setCreateModalOpen(false);
      setNewAgent({
        name: '',
        email: '',
        phone: '',
        status: 'ACTIVE',
        defaultTimezone: 'America/New_York',
      });
      loadAgents();
    } catch (err: any) {
      showToast(err.message || 'Failed to create agent', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    setSavingEdit(true);
    try {
      await api.updateAgent(editingAgent.id, {
        name: editingAgent.name,
        email: editingAgent.email,
        phone: editingAgent.phone,
        status: editingAgent.status,
        defaultTimezone: editingAgent.defaultTimezone,
      });
      showToast('Agent profile updated successfully.', 'success');
      setEditModalOpen(false);
      loadAgents();
    } catch (err: any) {
      showToast(err.message || 'Failed to update agent', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const origin = window.location.origin;
    const url = `${origin}/#/book/${token}`;
    navigator.clipboard.writeText(url);
    showToast('Agent booking link copied to clipboard!', 'success');
  };

  const handleToggleStatus = async (agent: Agent) => {
    const nextStatus = agent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateAgent(agent.id, { status: nextStatus });
      showToast(`Agent marked as ${nextStatus}.`, 'success');
      loadAgents();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', 'error');
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Agent Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage agents, assign unique booking URLs with non-guessable tokens, and track booking metrics
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Agent</span>
        </button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const primaryLink = agent.bookingLinks?.[0]?.token;

          return (
            <div
              key={agent.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge status={agent.status} size="sm" />
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    {agent._count?.bookings || 0} Meetings
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{agent.name}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{agent.email}</span>
                  </div>
                  {agent.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{agent.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Default: {agent.defaultTimezone.replace('America/', '').replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Primary Booking Link */}
                {primaryLink && (
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Unique Booking Link
                      </span>
                      <span className="font-mono text-slate-600 truncate block text-[11px]">
                        .../#/book/{primaryLink}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyLink(primaryLink)}
                      title="Copy Booking Link"
                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs font-semibold">
                <button
                  onClick={() => handleToggleStatus(agent)}
                  className={`hover:underline ${
                    agent.status === 'ACTIVE' ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {agent.status === 'ACTIVE' ? 'Deactivate Agent' : 'Activate Agent'}
                </button>

                <button
                  onClick={() => {
                    setEditingAgent(agent);
                    setEditModalOpen(true);
                  }}
                  className="text-slate-600 hover:text-indigo-600 flex items-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Agent Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Agent"
        subtitle="Generates a unique, non-guessable booking link token for the agent"
      >
        <form onSubmit={handleCreateAgent} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Agent Full Name</label>
            <input
              type="text"
              required
              value={newAgent.name}
              onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              placeholder="e.g. Alex Johnson"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={newAgent.email}
              onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
              placeholder="alex@company.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number (Optional)</label>
            <input
              type="text"
              value={newAgent.phone}
              onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Default Timezone</label>
            <select
              value={newAgent.defaultTimezone}
              onChange={(e) => setNewAgent({ ...newAgent, defaultTimezone: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white font-medium"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
            >
              {creating ? 'Creating...' : 'Create Agent & Link'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Agent Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Agent Profile"
        subtitle={editingAgent?.name}
      >
        {editingAgent && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editingAgent.name}
                onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
              <input
                type="email"
                required
                value={editingAgent.email}
                onChange={(e) => setEditingAgent({ ...editingAgent, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Phone</label>
              <input
                type="text"
                value={editingAgent.phone || ''}
                onChange={(e) => setEditingAgent({ ...editingAgent, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Default Timezone</label>
              <select
                value={editingAgent.defaultTimezone}
                onChange={(e) => setEditingAgent({ ...editingAgent, defaultTimezone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white font-medium"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
              >
                {savingEdit ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
