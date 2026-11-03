import React, { useState, useEffect } from 'react';
import { Users, Plus, KeyRound, Shield, Trash2, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { AdminAccount, AdminUser } from '../../types';

interface AdminUsersPageProps {
  currentAdmin: AdminUser | null;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ currentAdmin }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'change-password'>('users');
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Admin Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });
  const [creating, setCreating] = useState(false);

  // Reset Admin Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [targetAdmin, setTargetAdmin] = useState<AdminAccount | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetting, setResetting] = useState(false);

  // Change My Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingMyPass, setChangingMyPass] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  async function loadAdmins() {
    setLoading(true);
    try {
      const res = await api.getAdminUsers();
      setAdmins(res.admins);
    } catch (err: any) {
      showToast(err.message || 'Failed to load admin users', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setCreating(true);
    try {
      await api.createAdminUser(newAdmin);
      showToast(`Admin account for ${newAdmin.name} created successfully!`, 'success');
      setAddModalOpen(false);
      setNewAdmin({ name: '', email: '', password: '', role: 'ADMIN' });
      loadAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to create admin', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenReset = (admin: AdminAccount) => {
    setTargetAdmin(admin);
    setResetPasswordVal('');
    setResetModalOpen(true);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAdmin || !resetPasswordVal) return;
    setResetting(true);
    try {
      await api.resetAdminPassword(targetAdmin.id, resetPasswordVal);
      showToast(`Password updated for ${targetAdmin.name}!`, 'success');
      setResetModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleToggleStatus = async (admin: AdminAccount) => {
    if (admin.id === currentAdmin?.id) {
      showToast('You cannot deactivate your own account', 'error');
      return;
    }
    try {
      const res = await api.toggleAdminStatus(admin.id);
      showToast(res.message, 'success');
      loadAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleDeleteAdmin = async (admin: AdminAccount) => {
    if (admin.id === currentAdmin?.id) {
      showToast('You cannot delete your own account', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete admin ${admin.name}?`)) return;
    try {
      await api.deleteAdminUser(admin.id);
      showToast('Admin deleted successfully.', 'success');
      loadAdmins();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete admin', 'error');
    }
  };

  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match!', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }
    setChangingMyPass(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      showToast('Your password has been changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password. Verify your current password.', 'error');
    } finally {
      setChangingMyPass(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Admin Users & Password Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage administrator accounts, assign access privileges, and update passwords
          </p>
        </div>

        {activeTab === 'users' && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Admin User</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Admin Team ({admins.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('change-password')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'change-password'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Change My Password</span>
        </button>
      </div>

      {/* Tab 1: Admin Users List */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading administrators...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Admin Name</th>
                    <th className="px-5 py-3">Email Address</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admins.map((adm) => {
                    const isSelf = adm.id === currentAdmin?.id;

                    return (
                      <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{adm.name}</span>
                            {isSelf && (
                              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-mono">{adm.email}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                              adm.role === 'SUPER_ADMIN'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {adm.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge status={adm.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono">
                          {new Date(adm.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenReset(adm)}
                              title="Reset Password"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            {!isSelf && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(adm)}
                                  className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                                    adm.isActive
                                      ? 'text-amber-600 hover:bg-amber-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  {adm.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDeleteAdmin(adm)}
                                  title="Delete Admin"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
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
      )}

      {/* Tab 2: Change My Password */}
      {activeTab === 'change-password' && (
        <div className="max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">Update Your Password</h3>
          <p className="text-xs text-slate-500 mb-5">
            Ensure your account uses a strong password of at least 6 characters
          </p>

          <form onSubmit={handleChangeMyPassword} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Current Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={changingMyPass}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20 transition-all"
            >
              {changingMyPass ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Add Admin Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Administrator"
        subtitle="Create an admin user account with dashboard access"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
              placeholder="e.g. Rachel Green"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              placeholder="rachel@demandflow.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Initial Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              placeholder="Temporary password (min 6 chars)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Role</label>
            <select
              value={newAdmin.role}
              onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white font-medium"
            >
              <option value="ADMIN">Standard Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
            >
              {creating ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Admin Password Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Admin Password"
        subtitle={`Admin: ${targetAdmin?.name} (${targetAdmin?.email})`}
      >
        <form onSubmit={handleConfirmReset} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={resetPasswordVal}
              onChange={(e) => setResetPasswordVal(e.target.value)}
              placeholder="Enter new password (min 6 chars)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
            >
              {resetting ? 'Updating...' : 'Set New Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
