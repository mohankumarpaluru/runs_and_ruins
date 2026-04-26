import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Lock, TrendingUp, TrendingDown, Target,
  Trophy, HandCoins, Eye, EyeOff, ShieldCheck, Calendar,
  Clock, CheckCircle2, XCircle, Minus,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { hashPassword, verifyPassword } from '../lib/auth';
import type { UserRole } from '../types/auth';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// ─── Types ──────────────────────────────────────────────────
interface BettingStats {
  total_bets: number;
  wins: number;
  losses: number;
  pending: number;
  net_pl: number;
  win_rate: number;
  best_match: { match_label: string; amount: number } | null;
  worst_match: { match_label: string; amount: number } | null;
}

interface SideBetStats {
  won: number;
  lost: number;
  net: number;
}

// ─── Helpers ─────────────────────────────────────────────────
function formatCurrency(n: number) {
  const abs = Math.abs(n);
  return `${n < 0 ? '-' : '+'}₹${abs.toLocaleString('en-IN')}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Role display ─────────────────────────────────────────────
const ROLE_CFG: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  admin:       { label: 'Admin',       color: '#00D4C8', bg: 'rgba(0,212,200,0.1)',   border: 'rgba(0,212,200,0.3)' },
  participant: { label: 'Participant', color: '#F5A524', bg: 'rgba(245,165,36,0.1)',  border: 'rgba(245,165,36,0.3)' },
  readonly:    { label: 'Read Only',   color: '#7A90A8', bg: 'rgba(122,144,168,0.1)', border: 'rgba(122,144,168,0.3)' },
};

// ─── Stat card ────────────────────────────────────────────────
function StatCard({
  label, value, sub, color = '#E8EDF5', icon: Icon,
}: {
  label: string; value: string | number; sub?: string;
  color?: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}) {
  return (
    <div className="rr-card" style={{ padding: '1.125rem 1.25rem' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="field-label">{label}</p>
        <Icon size={15} style={{ color, opacity: 0.7, flexShrink: 0 }} />
      </div>
      <p className="scoreboard-num" style={{ fontSize: '1.625rem', color, lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ color: '#4A5F75', fontSize: '0.75rem', marginTop: '0.25rem' }}>{sub}</p>}
    </div>
  );
}

// ─── Win-rate bar ─────────────────────────────────────────────
function WinRateBar({ rate }: { rate: number }) {
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span className="field-label">Win Rate</span>
        <span className="scoreboard-num" style={{ fontSize: '0.875rem', color: rate >= 50 ? '#22C55E' : '#EF4444' }}>
          {rate.toFixed(1)}%
        </span>
      </div>
      <div className="win-bar-track" style={{ width: '100%', height: '6px' }}>
        <div
          className="win-bar-fill"
          style={{
            width: `${rate}%`,
            background: rate >= 50
              ? 'linear-gradient(90deg, #22C55E, #16A34A)'
              : 'linear-gradient(90deg, #EF4444, #DC2626)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Change Password form ────────────────────────────────────
function ChangePasswordForm({ userId }: { userId: string }) {
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!current || !next || !confirm) { toast.error('All fields are required.'); return; }
    if (next.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    if (next !== confirm) { toast.error('New passwords do not match.'); return; }

    setSaving(true);

    // Verify current password
    const { data, error } = await supabase
      .from('app_users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !data) {
      toast.error('Could not verify current password.');
      setSaving(false);
      return;
    }

    const valid = await verifyPassword(current, data.password_hash);
    if (!valid) {
      toast.error('Current password is incorrect.');
      setSaving(false);
      return;
    }

    const newHash = await hashPassword(next);
    const { error: updateErr } = await supabase
      .from('app_users')
      .update({ password_hash: newHash })
      .eq('id', userId);

    setSaving(false);

    if (updateErr) { toast.error('Failed to update password: ' + updateErr.message); return; }

    toast.success('Password updated. You can use it on your next login.');
    setCurrent(''); setNext(''); setConfirm('');
  };

  return (
    <div className="rr-card" style={{ overflow: 'hidden' }}>
      {/* Card accent bar */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent, rgba(0,212,200,0.6), transparent)' }} />
      <div style={{ padding: '1.375rem 1.5rem' }}>
        <div className="flex items-center gap-2.5 mb-5">
          <div
            style={{
              width: '32px', height: '32px', borderRadius: '0.5rem',
              background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Lock size={15} style={{ color: '#00D4C8' }} />
          </div>
          <h2 className="section-header" style={{ fontSize: '1rem' }}>Change Password</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {/* Current */}
            <div>
              <label className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-dark"
                  type={showCur ? 'text' : 'password'}
                  placeholder="Your current password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  style={{ paddingRight: '3rem' }}
                  disabled={saving}
                />
                <button type="button" onClick={() => setShowCur((v) => !v)}
                  style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4A5F75', lineHeight: 0 }}>
                  {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New */}
            <div>
              <label className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-dark"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  style={{ paddingRight: '3rem' }}
                  disabled={saving}
                />
                <button type="button" onClick={() => setShowNew((v) => !v)}
                  style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4A5F75', lineHeight: 0 }}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength indicator */}
              {next && (
                <div style={{ marginTop: '0.375rem', display: 'flex', gap: '3px' }}>
                  {[6, 8, 10].map((threshold, i) => (
                    <div key={i} style={{
                      flex: 1, height: '3px', borderRadius: '9999px',
                      background: next.length >= threshold
                        ? (i === 0 ? '#EF4444' : i === 1 ? '#F5A524' : '#22C55E')
                        : 'rgba(255,255,255,0.08)',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                  <span style={{ fontSize: '0.6875rem', color: '#4A5F75', whiteSpace: 'nowrap' }}>
                    {next.length < 6 ? 'Weak' : next.length < 8 ? 'Fair' : next.length < 10 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="field-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                Confirm New Password
              </label>
              <input
                className="input-dark"
                type="password"
                placeholder="Repeat new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={saving}
                style={{
                  borderColor: confirm && next && confirm !== next
                    ? 'rgba(239,68,68,0.5)'
                    : confirm && next && confirm === next
                    ? 'rgba(34,197,94,0.4)'
                    : undefined,
                }}
              />
              {confirm && next && confirm !== next && (
                <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>Passwords do not match</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1.375rem' }}>
            <button
              type="submit"
              disabled={saving}
              className="action-btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Lock size={14} />
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Profile page ────────────────────────────────────────
export function Profile() {
  const { currentUser } = useAuth();
  const [bettingStats, setBettingStats] = useState<BettingStats | null>(null);
  const [sideStats,    setSideStats]    = useState<SideBetStats | null>(null);
  const [userDetails,  setUserDetails]  = useState<{ created_at: string; last_login_at: string | null } | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);

  const fetchStats = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);

    // Fetch user details (created_at, last_login)
    const { data: uData } = await supabase
      .from('app_users')
      .select('created_at, last_login_at')
      .eq('id', currentUser.id)
      .single();
    if (uData) setUserDetails(uData);

    const pid = currentUser.participant_id;

    if (!pid) {
      // Admin or no participant link — no betting stats
      setIsLoading(false);
      return;
    }

    // ── Main bets stats ────────────────────────────────────
    const { data: bets } = await supabase
      .from('match_bets')
      .select('result, profit_loss, match_id')
      .eq('participant_id', pid);

    if (bets) {
      const wins   = bets.filter((b) => b.result === 'win').length;
      const losses = bets.filter((b) => b.result === 'loss').length;
      const played = wins + losses;
      const netPL  = bets.reduce((sum, b) => sum + (b.profit_loss ?? 0), 0);
      const winRate = played > 0 ? (wins / played) * 100 : 0;

      // Best and worst match
      const settled = bets.filter((b) => b.result !== 'pending' && b.profit_loss !== 0);
      const bestBet  = settled.reduce<typeof settled[0] | null>((best, b) => !best || b.profit_loss > best.profit_loss ? b : best, null);
      const worstBet = settled.reduce<typeof settled[0] | null>((worst, b) => !worst || b.profit_loss < worst.profit_loss ? b : worst, null);

      // Fetch match labels for best/worst
      let bestMatch: BettingStats['best_match']   = null;
      let worstMatch: BettingStats['worst_match'] = null;

      if (bestBet) {
        const { data: m } = await supabase.from('matches').select('team1, team2, match_no').eq('id', bestBet.match_id).single();
        if (m) bestMatch = { match_label: `M${m.match_no}: ${m.team1} vs ${m.team2}`, amount: bestBet.profit_loss };
      }
      if (worstBet && worstBet.match_id !== bestBet?.match_id) {
        const { data: m } = await supabase.from('matches').select('team1, team2, match_no').eq('id', worstBet.match_id).single();
        if (m) worstMatch = { match_label: `M${m.match_no}: ${m.team1} vs ${m.team2}`, amount: worstBet.profit_loss };
      }

      setBettingStats({
        total_bets: bets.length,
        wins, losses,
        pending: bets.filter((b) => b.result === 'pending').length,
        net_pl: netPL,
        win_rate: winRate,
        best_match: bestMatch,
        worst_match: worstMatch,
      });
    }

    // ── Side bets stats ────────────────────────────────────
    const { data: wonBets } = await supabase
      .from('misc_bets')
      .select('amount')
      .eq('winner_participant_id', pid)
      .eq('status', 'settled');

    const { data: lostBets } = await supabase
      .from('misc_bets')
      .select('amount')
      .eq('loser_participant_id', pid)
      .eq('status', 'settled');

    const wonCount  = wonBets?.length ?? 0;
    const lostCount = lostBets?.length ?? 0;
    const wonTotal  = wonBets?.reduce((s, b) => s + (b.amount ?? 0), 0) ?? 0;
    const lostTotal = lostBets?.reduce((s, b) => s + (b.amount ?? 0), 0) ?? 0;

    setSideStats({ won: wonCount, lost: lostCount, net: wonTotal - lostTotal });

    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (!currentUser) return null;

  const roleCfg = ROLE_CFG[currentUser.role] ?? ROLE_CFG.readonly;
  const initials = currentUser.display_name.slice(0, 2).toUpperCase();
  const hasParticipant = !!currentUser.participant_id;

  return (
    <div className="page-enter" style={{ maxWidth: '720px' }}>
      {/* ── Account card ──────────────────────────────────── */}
      <div
        className="rr-card"
        style={{
          padding: '1.5rem 1.75rem',
          marginBottom: '1.5rem',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Subtle teal radial behind avatar */}
        <div style={{
          position: 'absolute', top: '-30px', left: '-30px',
          width: '180px', height: '180px', borderRadius: '9999px',
          background: 'radial-gradient(ellipse, rgba(0,212,200,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="flex items-center gap-4" style={{ position: 'relative' }}>
          {/* Avatar */}
          <div
            style={{
              width: '64px', height: '64px', borderRadius: '9999px', flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(0,212,200,0.25), rgba(0,212,200,0.08))',
              border: '2px solid rgba(0,212,200,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', color: '#00D4C8',
              boxShadow: '0 0 20px rgba(0,212,200,0.15)',
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.375rem',
                  color: '#E8EDF5', lineHeight: 1.2,
                }}
              >
                {currentUser.display_name}
              </h1>
              <span
                style={{
                  fontSize: '0.6875rem', fontFamily: 'var(--font-heading)', fontWeight: 700,
                  letterSpacing: '0.08em', color: roleCfg.color,
                  background: roleCfg.bg, border: `1px solid ${roleCfg.border}`,
                  borderRadius: '9999px', padding: '0.15rem 0.625rem',
                }}
              >
                {roleCfg.label}
              </span>
            </div>
            <p
              className="scoreboard-num"
              style={{ fontSize: '0.875rem', color: '#4A5F75', marginTop: '0.25rem' }}
            >
              @{currentUser.username}
            </p>

            <div className="flex flex-wrap gap-4 mt-3">
              {[
                { icon: Calendar, label: 'Member since', value: formatDate(userDetails?.created_at) },
                { icon: Clock,    label: 'Last login',   value: formatDate(userDetails?.last_login_at) },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <item.icon size={12} style={{ color: '#2A3F55' }} />
                  <span style={{ color: '#4A5F75', fontSize: '0.75rem' }}>{item.label}:</span>
                  <span style={{ color: '#7A90A8', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Betting stats ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="rr-card" style={{ padding: '3rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9999px', border: '2px solid rgba(0,212,200,0.2)', borderTopColor: '#00D4C8', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          <p style={{ color: '#4A5F75', fontSize: '0.875rem', marginTop: '1rem' }}>Loading your stats…</p>
        </div>
      ) : !hasParticipant ? (
        /* Admin — no participant data */
        <div
          className="rr-card"
          style={{
            padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '1.5rem',
            border: '1px dashed rgba(255,255,255,0.08)',
          }}
        >
          <ShieldCheck size={36} style={{ color: '#2A3F55', margin: '0 auto 0.875rem' }} />
          <p style={{ color: '#7A90A8', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem' }}>
            Admin Account
          </p>
          <p style={{ color: '#4A5F75', fontSize: '0.875rem', marginTop: '0.375rem', lineHeight: 1.6 }}>
            This account is not linked to a betting participant.<br />
            Betting stats are only shown for Sahitya &amp; Durgesh.
          </p>
        </div>
      ) : (
        <>
          {/* ── Main bets section ───────────────────────── */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <Trophy size={15} style={{ color: '#F5A524' }} />
              <h2 className="field-label" style={{ color: '#7A90A8', letterSpacing: '0.1em' }}>MAIN BETS</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <StatCard label="Total Bets" value={bettingStats?.total_bets ?? 0} icon={Target} color="#00D4C8" />
              <StatCard label="Won" value={bettingStats?.wins ?? 0} icon={CheckCircle2} color="#22C55E" />
              <StatCard label="Lost" value={bettingStats?.losses ?? 0} icon={XCircle} color="#EF4444" />
              <StatCard label="Pending" value={bettingStats?.pending ?? 0} icon={Minus} color="#7A90A8" />
            </div>

            {/* P&L + Win rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rr-card" style={{ padding: '1.125rem 1.25rem' }}>
                <p className="field-label mb-1">Net P&amp;L</p>
                <p
                  className="scoreboard-num"
                  style={{
                    fontSize: '2rem', lineHeight: 1.1,
                    color: (bettingStats?.net_pl ?? 0) >= 0 ? '#22C55E' : '#EF4444',
                  }}
                >
                  {bettingStats ? formatCurrency(bettingStats.net_pl) : '₹0'}
                </p>
                <p style={{ color: '#4A5F75', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  across {bettingStats?.wins ?? 0 + (bettingStats?.losses ?? 0)} settled matches
                </p>
              </div>

              <div className="rr-card" style={{ padding: '1.125rem 1.25rem' }}>
                {bettingStats && <WinRateBar rate={bettingStats.win_rate} />}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {bettingStats?.best_match && (
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <TrendingUp size={11} style={{ color: '#22C55E' }} />
                        <span style={{ color: '#2A3F55', fontSize: '0.6875rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.06em', fontWeight: 700 }}>BEST</span>
                      </div>
                      <p style={{ color: '#22C55E', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        +₹{bettingStats.best_match.amount}
                      </p>
                      <p style={{ color: '#4A5F75', fontSize: '0.6875rem', lineHeight: 1.4 }}>
                        {bettingStats.best_match.match_label}
                      </p>
                    </div>
                  )}
                  {bettingStats?.worst_match && (
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <TrendingDown size={11} style={{ color: '#EF4444' }} />
                        <span style={{ color: '#2A3F55', fontSize: '0.6875rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.06em', fontWeight: 700 }}>WORST</span>
                      </div>
                      <p style={{ color: '#EF4444', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        ₹{bettingStats.worst_match.amount}
                      </p>
                      <p style={{ color: '#4A5F75', fontSize: '0.6875rem', lineHeight: 1.4 }}>
                        {bettingStats.worst_match.match_label}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Side bets section ──────────────────────────── */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <HandCoins size={15} style={{ color: '#00D4C8' }} />
              <h2 className="field-label" style={{ color: '#7A90A8', letterSpacing: '0.1em' }}>SIDE BETS</h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Won" value={sideStats?.won ?? 0} icon={CheckCircle2} color="#22C55E" />
              <StatCard label="Lost" value={sideStats?.lost ?? 0} icon={XCircle} color="#EF4444" />
              <div className="rr-card" style={{ padding: '1.125rem 1.25rem' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="field-label">Net</p>
                  <TrendingUp size={15} style={{ color: (sideStats?.net ?? 0) >= 0 ? '#22C55E' : '#EF4444', opacity: 0.7 }} />
                </div>
                <p
                  className="scoreboard-num"
                  style={{
                    fontSize: '1.625rem', lineHeight: 1.1,
                    color: (sideStats?.net ?? 0) >= 0 ? '#22C55E' : '#EF4444',
                  }}
                >
                  {sideStats ? formatCurrency(sideStats.net) : '+₹0'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Change Password ───────────────────────────────────── */}
      <ChangePasswordForm userId={currentUser.id} />
    </div>
  );
}
