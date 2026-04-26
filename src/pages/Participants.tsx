import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { hashPassword } from '../lib/auth';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { UserPlus, Users, ShieldCheck, ShieldOff, UserCog, Eye, EyeOff, X } from 'lucide-react';
import { cn, getAvatarColor } from '../lib/utils';

// ─── Register New User Modal ─────────────────────────────────
interface RegisterModalProps {
  onClose: () => void;
}
function RegisterUserModal({ onClose }: RegisterModalProps) {
  const [username, setUsername] = useState('');
  const [display,  setDisplay]  = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving,   setSaving]   = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !display.trim() || !password) {
      toast.error('All fields are required.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    const hash = await hashPassword(password);

    const { error } = await supabase.from('app_users').insert({
      username:      username.toLowerCase().trim(),
      display_name:  display.trim(),
      password_hash: hash,
      role:          'readonly',   // Always read-only — admin upgrades later
    });

    setSaving(false);

    if (error) {
      toast.error(error.code === '23505' ? 'Username already taken.' : error.message);
      return;
    }

    toast.success(
      `"${display.trim()}" registered! Username: ${username.toLowerCase().trim()} · Password: ${password} · Role: Read Only (admin can upgrade)`
    );
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(5,9,18,0.88)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: '420px',
          background: '#0C1422',
          border: '1px solid rgba(0,212,200,0.18)',
          borderRadius: '1.125rem',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
        }}
      >
        {/* Accent bar */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent, #00D4C8 40%, #F5A524 70%, transparent)' }} />

        <div style={{ padding: '1.5rem 1.75rem' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <UserCog size={17} style={{ color: '#00D4C8' }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: '#E8EDF5' }}>
                Register New User
              </h3>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5F75' }}>
              <X size={17} />
            </button>
          </div>

          {/* Role notice */}
          <div
            style={{
              background: 'rgba(122,144,168,0.08)',
              border: '1px solid rgba(122,144,168,0.2)',
              borderRadius: '0.625rem',
              padding: '0.625rem 0.875rem',
              marginTop: '0.875rem',
              marginBottom: '1.25rem',
              display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={14} style={{ color: '#7A90A8', flexShrink: 0, marginTop: '0.125rem' }} />
            <p style={{ color: '#7A90A8', fontSize: '0.8125rem', lineHeight: 1.5 }}>
              New users get <strong style={{ color: '#E8EDF5' }}>Read Only</strong> access by default.
              An admin can upgrade their role in <strong style={{ color: '#00D4C8' }}>Users</strong>.
            </p>
          </div>

          <form onSubmit={handleCreate}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Username</label>
                <input
                  className="input-dark"
                  placeholder="e.g. ravi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Display Name</label>
                <input
                  className="input-dark"
                  placeholder="e.g. Ravi Kumar"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-dark"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: '3rem' }}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4A5F75', lineHeight: 0 }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '1.25rem 0' }} />

            <button
              type="submit"
              disabled={saving}
              className="action-btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <UserCog size={15} />
              {saving ? 'Registering…' : 'Register User'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Participants page ───────────────────────────────────
export function Participants() {
  const { participants, fetchParticipants } = useStore();
  const [newName,      setNewName]      = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('participants')
        .insert([{ name: newName.trim(), is_active: true }]);
      if (error) throw error;
      toast.success('Participant added');
      setNewName('');
      await fetchParticipants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add participant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('participants')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success('Status updated');
      await fetchParticipants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const active   = participants.filter((p) => p.is_active);
  const inactive = participants.filter((p) => !p.is_active);

  return (
    <div className="space-y-7 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="section-header text-3xl md:text-4xl">Participants</h1>
          <p className="section-meta mt-1.5">
            {participants.length} registered · {active.length} active
          </p>
        </div>

        {/* Register new user button */}
        <button
          onClick={() => setShowRegister(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.125rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.625rem',
            color: '#7A90A8', fontSize: '0.875rem', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-heading)',
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,212,200,0.3)'; e.currentTarget.style.color = '#00D4C8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#7A90A8'; }}
        >
          <UserCog size={15} />
          Register Login
        </button>
      </div>

      {/* Add participant form */}
      <div className="form-action-card p-5 md:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <UserPlus className="w-5 h-5" style={{ color: '#00D4C8' }} />
          <h2 className="section-header text-lg">Add New Participant</h2>
        </div>
        <form onSubmit={handleAddParticipant} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 max-w-sm">
            <label className="field-label mb-1.5 block" style={{ color: '#4A5F75' }}>Name</label>
            <Input
              placeholder="e.g. Ravi"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-surface-light border-border/60 focus-visible:ring-primary/40 h-11 text-base"
              style={{ background: '#111E30', border: '1px solid rgba(255,255,255,0.09)', color: '#E8EDF5', fontSize: '0.9375rem' }}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting || !newName.trim()}
              className="action-btn-primary h-11 px-7 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add
            </button>
          </div>
        </form>
      </div>

      {/* Participant list */}
      <div className="rr-card overflow-hidden">
        {/* Header row */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}
        >
          <Users className="w-5 h-5" style={{ color: '#00D4C8' }} />
          <span className="section-header text-lg">Roster</span>
          <span
            className="ml-auto text-xs px-2.5 py-1 rounded-full font-bold scoreboard-num"
            style={{ background: 'rgba(0,212,200,0.08)', border: '1px solid rgba(0,212,200,0.15)', color: '#00D4C8' }}
          >
            {participants.length}
          </span>
        </div>

        {participants.length === 0 ? (
          <div className="empty-state m-4">
            <Users className="w-12 h-12" style={{ color: '#2A3F55' }} />
            <p className="font-bold text-base" style={{ color: '#4A5F75' }}>No participants yet</p>
            <p className="text-sm" style={{ color: '#2A3F55' }}>Add your first participant above to get started</p>
          </div>
        ) : (
          <div>
            {/* Desktop table header */}
            <div
              className="hidden md:grid grid-cols-[1fr_100px_140px] px-6 py-3 text-xs font-black uppercase tracking-widest"
              style={{ color: '#2A3F55', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-heading)' }}
            >
              <span>Participant</span>
              <span className="text-center">Status</span>
              <span className="text-right">Action</span>
            </div>

            {participants.map((p, idx) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]',
                  idx < participants.length - 1 ? 'border-b' : ''
                )}
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0',
                      getAvatarColor(p.name)
                    )}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div
                      className="font-semibold text-base"
                      style={{ fontFamily: 'var(--font-heading)', color: '#E8EDF5' }}
                    >
                      {p.name}
                    </div>
                    {/* Mobile: show status under name */}
                    <div className="md:hidden mt-1">
                      <span className={cn('status-pill', p.is_active ? 'status-pill--settled' : 'status-pill--completed')}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop: status pill centered */}
                <div className="hidden md:flex justify-center w-[100px]">
                  <span className={cn('status-pill', p.is_active ? 'status-pill--settled' : 'status-pill--completed')}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Toggle button */}
                <div className="md:w-[140px] flex md:justify-end">
                  <button
                    onClick={() => toggleStatus(p.id, p.is_active)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                    style={
                      p.is_active
                        ? { background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#EF4444', fontFamily: 'var(--font-heading)' }
                        : { background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', color: '#22C55E', fontFamily: 'var(--font-heading)' }
                    }
                  >
                    {p.is_active ? (
                      <><ShieldOff className="w-3.5 h-3.5" /><span className="hidden sm:inline">Deactivate</span></>
                    ) : (
                      <><ShieldCheck className="w-3.5 h-3.5" /><span className="hidden sm:inline">Activate</span></>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary strip */}
      {participants.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl flex-1 min-w-[140px]"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.14)' }}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: '#22C55E' }} />
            <div>
              <div className="field-label" style={{ color: '#2A3F55' }}>Active</div>
              <div className="scoreboard-num text-xl font-bold mt-0.5" style={{ color: '#22C55E' }}>{active.length}</div>
            </div>
          </div>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl flex-1 min-w-[140px]"
            style={{ background: 'rgba(122,144,168,0.07)', border: '1px solid rgba(122,144,168,0.14)' }}
          >
            <ShieldOff className="w-4 h-4 shrink-0" style={{ color: '#4A5F75' }} />
            <div>
              <div className="field-label" style={{ color: '#2A3F55' }}>Inactive</div>
              <div className="scoreboard-num text-xl font-bold mt-0.5" style={{ color: '#4A5F75' }}>{inactive.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Register modal */}
      {showRegister && <RegisterUserModal onClose={() => setShowRegister(false)} />}
    </div>
  );
}
