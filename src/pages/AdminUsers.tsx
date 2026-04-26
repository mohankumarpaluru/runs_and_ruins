import React, { useState, useEffect, useCallback } from 'react';
import { UserCog, Plus, Pencil, Power, PowerOff, X, Check, Eye, EyeOff, KeyRound, Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { hashPassword } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import type { AppUser, UserRole } from '../types/auth';
import { toast } from 'sonner';

// ─── Role badge ─────────────────────────────────────────────
function RoleBadge({ role }: { role: UserRole }) {
  const cfg = {
    admin:       { label: 'Admin',       bg: 'rgba(0,212,200,0.1)',   border: 'rgba(0,212,200,0.3)',   color: '#00D4C8' },
    participant: { label: 'Participant', bg: 'rgba(245,165,36,0.1)',  border: 'rgba(245,165,36,0.3)',  color: '#F5A524' },
    readonly:    { label: 'Read Only',   bg: 'rgba(122,144,168,0.1)', border: 'rgba(122,144,168,0.3)', color: '#7A90A8' },
  }[role];
  return (
    <span
      className="status-pill"
      style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color, fontSize: '0.6875rem' }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Inline editable row ────────────────────────────────────
interface EditRowProps {
  key?: React.Key;
  user: AppUser;
  onSave: () => void;
  onCancel: () => void;
}
function EditRow({ user, onSave, onCancel }: EditRowProps) {
  const [displayName,  setDisplayName]  = useState(user.display_name);
  const [role,         setRole]         = useState<UserRole>(user.role);
  const [newPassword,  setNewPassword]  = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [saving,       setSaving]       = useState(false);

  const save = async () => {
    if (!displayName.trim()) { toast.error('Display name cannot be empty.'); return; }
    setSaving(true);
    const updates: Record<string, unknown> = { display_name: displayName.trim(), role };
    if (newPassword) {
      updates.password_hash = await hashPassword(newPassword);
    }
    const { error } = await supabase.from('app_users').update(updates).eq('id', user.id);
    setSaving(false);
    if (error) { toast.error('Failed to save: ' + error.message); return; }
    toast.success('User updated.');
    onSave();
  };

  return (
    <tr style={{ background: 'rgba(0,212,200,0.04)' }}>
      {/* Username (read-only) */}
      <td className="scoreboard-num" style={{ padding: '0.875rem 1rem', color: '#7A90A8', fontSize: '0.875rem' }}>
        {user.username}
      </td>
      {/* Display name */}
      <td style={{ padding: '0.875rem 0.75rem' }}>
        <input
          className="input-dark"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
          autoFocus
        />
      </td>
      {/* Role */}
      <td style={{ padding: '0.875rem 0.75rem' }}>
        <select
          className="input-dark"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
        >
          <option value="admin">Admin</option>
          <option value="participant">Participant</option>
          <option value="readonly">Read Only</option>
        </select>
      </td>
      {/* New password */}
      <td style={{ padding: '0.875rem 0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            className="input-dark"
            type={showPass ? 'text' : 'password'}
            placeholder="Leave blank to keep"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4A5F75', lineHeight: 0 }}
          >
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </td>
      {/* Actions */}
      <td style={{ padding: '0.875rem 0.75rem' }}>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.875rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', color: '#22C55E', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-heading)' }}
          >
            <Check size={13} /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.5rem', color: '#EF4444', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-heading)' }}
          >
            <X size={13} /> Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Add User Modal ─────────────────────────────────────────
interface AddModalProps {
  onClose: () => void;
  onCreated: () => void;
}
function AddUserModal({ onClose, onCreated }: AddModalProps) {
  const [username,  setUsername]  = useState('');
  const [display,   setDisplay]   = useState('');
  const [password,  setPassword]  = useState('');
  const [role,      setRole]      = useState<UserRole>('participant');
  const [showPass,  setShowPass]  = useState(false);
  const [saving,    setSaving]    = useState(false);

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !display.trim() || !password) {
      toast.error('All fields are required.');
      return;
    }
    setSaving(true);
    const hash = await hashPassword(password);
    const { error } = await supabase.from('app_users').insert({
      username:      username.toLowerCase().trim(),
      display_name:  display.trim(),
      password_hash: hash,
      role,
    });
    setSaving(false);
    if (error) {
      toast.error(error.code === '23505' ? 'Username already exists.' : error.message);
      return;
    }
    toast.success(`User "${display.trim()}" created. Password: ${password}`);
    onCreated();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(5,9,18,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: '440px',
          background: '#0C1422',
          border: '1px solid rgba(0,212,200,0.2)',
          borderRadius: '1.125rem',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #00D4C8 40%, #F5A524 70%, transparent)',
          }}
        />
        <div style={{ padding: '1.5rem 1.75rem' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Plus size={18} style={{ color: '#00D4C8' }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: '#E8EDF5' }}>
                New User
              </h3>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5F75' }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={create}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Username</label>
                <input className="input-dark" placeholder="e.g. newplayer" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Display Name</label>
                <input className="input-dark" placeholder="e.g. New Player" value={display} onChange={(e) => setDisplay(e.target.value)} />
              </div>
              <div>
                <label className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-dark"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Set initial password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: '3rem' }}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4A5F75', lineHeight: 0 }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Role</label>
                <select className="input-dark" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                  <option value="admin">Admin</option>
                  <option value="participant">Participant</option>
                  <option value="readonly">Read Only</option>
                </select>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '1.375rem 0' }} />

            <button
              type="submit"
              disabled={saving}
              className="action-btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Plus size={15} />
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export function AdminUsers() {
  const { currentUser } = useAuth();
  const [users,     setUsers]     = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd,   setShowAdd]   = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('app_users')
      .select('id, username, display_name, role, participant_id, is_active, last_login_at, created_at')
      .order('created_at', { ascending: true });
    if (error) toast.error('Failed to load users.');
    else setUsers((data ?? []) as AppUser[]);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleActive = async (user: AppUser) => {
    if (user.id === currentUser?.id) { toast.error("You can't deactivate your own account."); return; }
    const { error } = await supabase
      .from('app_users')
      .update({ is_active: !user.is_active })
      .eq('id', user.id);
    if (error) { toast.error(error.message); return; }
    toast.success(user.is_active ? `${user.display_name} deactivated.` : `${user.display_name} activated.`);
    fetchUsers();
  };

  return (
    <div className="page-enter">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: '40px', height: '40px', borderRadius: '0.75rem',
              background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <UserCog size={19} style={{ color: '#00D4C8' }} />
          </div>
          <div>
            <h1 className="section-header" style={{ fontSize: '1.375rem' }}>User Management</h1>
            <p className="section-meta mt-0.5">Manage login accounts and roles</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="action-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <Plus size={15} /> New User
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Users',  value: users.length, color: '#00D4C8' },
          { label: 'Active',       value: users.filter((u) => u.is_active).length,       color: '#22C55E' },
          { label: 'Admins',       value: users.filter((u) => u.role === 'admin').length, color: '#F5A524' },
        ].map((s) => (
          <div key={s.label} className="rr-card" style={{ padding: '1rem 1.25rem' }}>
            <p className="field-label" style={{ marginBottom: '0.375rem' }}>{s.label}</p>
            <p className="scoreboard-num" style={{ fontSize: '1.5rem', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="rr-card" style={{ overflow: 'hidden' }}>
        <div
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}
        >
          <Users size={15} style={{ color: '#4A5F75' }} />
          <span className="field-label">All Users</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#4A5F75', fontSize: '0.875rem' }}>
            Loading users…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Username', 'Display Name', 'Role', 'Reset Password', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="field-label"
                      style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) =>
                  editingId === user.id ? (
                    <EditRow
                      key={user.id}
                      user={user}
                      onSave={() => { setEditingId(null); fetchUsers(); }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        opacity: user.is_active ? 1 : 0.45,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Username */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div className="flex items-center gap-2">
                          <span
                            className="scoreboard-num"
                            style={{ fontSize: '0.875rem', color: user.is_active ? '#E8EDF5' : '#4A5F75' }}
                          >
                            {user.username}
                          </span>
                          {user.id === currentUser?.id && (
                            <span
                              style={{
                                fontSize: '0.6875rem', fontFamily: 'var(--font-heading)', fontWeight: 700,
                                letterSpacing: '0.06em', color: '#00D4C8',
                                background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.2)',
                                borderRadius: '9999px', padding: '0.1rem 0.5rem',
                              }}
                            >
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Display name */}
                      <td style={{ padding: '0.875rem 0.75rem', color: '#B8CADA', fontSize: '0.9375rem' }}>
                        {user.display_name}
                      </td>
                      {/* Role */}
                      <td style={{ padding: '0.875rem 0.75rem' }}>
                        <RoleBadge role={user.role} />
                      </td>
                      {/* Password hint */}
                      <td style={{ padding: '0.875rem 0.75rem' }}>
                        <div className="flex items-center gap-1.5" style={{ color: '#4A5F75', fontSize: '0.8125rem' }}>
                          <KeyRound size={13} />
                          <span style={{ fontFamily: 'var(--font-mono)' }}>••••••</span>
                        </div>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '0.875rem 0.75rem' }}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingId(user.id)}
                            title="Edit user"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.4rem 0.75rem',
                              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '0.5rem', color: '#7A90A8', fontSize: '0.8125rem', fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'var(--font-heading)',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,212,200,0.3)'; e.currentTarget.style.color = '#00D4C8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#7A90A8'; }}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => toggleActive(user)}
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                            disabled={user.id === currentUser?.id}
                            style={{
                              display: 'flex', alignItems: 'center',
                              padding: '0.45rem',
                              background: user.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                              border: `1px solid ${user.is_active ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                              borderRadius: '0.5rem',
                              color: user.is_active ? '#EF4444' : '#22C55E',
                              cursor: user.id === currentUser?.id ? 'not-allowed' : 'pointer',
                              opacity: user.id === currentUser?.id ? 0.4 : 1,
                              transition: 'all 0.15s',
                            }}
                          >
                            {user.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="empty-state">
                <Users size={32} style={{ color: '#2A3F55' }} />
                <p style={{ color: '#4A5F75', fontSize: '0.9375rem' }}>No users found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role legend */}
      <div
        className="rr-card"
        style={{ marginTop: '1.25rem', padding: '1rem 1.25rem' }}
      >
        <p className="field-label" style={{ marginBottom: '0.75rem' }}>Role Permissions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { role: 'Admin' as UserRole,       desc: 'Full access — all pages, user management, data entry', color: '#00D4C8' },
            { role: 'Participant' as UserRole,  desc: 'Can view all data. No access to admin panel.',         color: '#F5A524' },
            { role: 'Read Only' as UserRole,    desc: 'Can only view the dashboard. No edits.',               color: '#7A90A8' },
          ].map((r) => (
            <div key={r.role} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <RoleBadge role={r.role.toLowerCase().replace(' ', '') as UserRole} />
              <p style={{ color: '#4A5F75', fontSize: '0.8125rem', lineHeight: 1.5 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={fetchUsers} />}
    </div>
  );
}
