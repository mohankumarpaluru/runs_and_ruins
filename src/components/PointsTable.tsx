import { useMemo, useState } from 'react';
import { Trophy, Flame, Ban, TrendingUp, Star, Calendar, Swords, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { TeamLogo } from './TeamLogo';
import type { Match } from '../types';

// ─── IPL Points Rules ─────────────────────────────────────────
// Win       → 2 pts for winner, 0 for loser
// Cancelled → 1 pt each (NR / No Result)
// Settled / completed are treated the same for points

// ─── Types ───────────────────────────────────────────────────
export interface TeamStanding {
  team: string;
  played: number;
  won: number;
  lost: number;
  nr: number;       // No Result / Cancelled
  pts: number;
  highScore: string | null;
  highScoreDate: string | null;
  highScoreVs: string | null;
}

interface PointsTableProps {
  matches: Match[];
}

// ─── Parse score runs (e.g. "185/3 (20)" → 185) ─────────────
function parseRuns(score?: string | null): number {
  if (!score) return 0;
  const m = score.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// ─── Compute standings from matches ─────────────────────────
function computeStandings(matches: Match[]): TeamStanding[] {
  const map = new Map<string, TeamStanding>();

  const ensure = (team: string) => {
    if (!map.has(team)) {
      map.set(team, { team, played: 0, won: 0, lost: 0, nr: 0, pts: 0, highScore: null, highScoreDate: null, highScoreVs: null });
    }
    return map.get(team)!;
  };

  for (const m of matches) {
    const isDone = m.status === 'completed' || m.status === 'settled' || m.status === 'cancelled';
    if (!isDone) continue;

    const t1 = ensure(m.team1);
    const t2 = ensure(m.team2);

    if (m.status === 'cancelled') {
      // No result — 1 point each
      t1.played++;  t1.nr++;  t1.pts++;
      t2.played++;  t2.nr++;  t2.pts++;
    } else if (m.winner === 'team1') {
      t1.played++;  t1.won++;   t1.pts += 2;
      t2.played++;  t2.lost++;
    } else if (m.winner === 'team2') {
      t2.played++;  t2.won++;   t2.pts += 2;
      t1.played++;  t1.lost++;
    } else {
      // completed but no winner set yet — still count played
      t1.played++;
      t2.played++;
    }

    // Track highest score for each team
    const score1 = parseRuns(m.team1_score);
    const score2 = parseRuns(m.team2_score);

    if (score1 > 0) {
      const cur1 = parseRuns(t1.highScore);
      if (score1 > cur1) {
        t1.highScore = m.team1_score!;
        t1.highScoreDate = m.match_date;
        t1.highScoreVs = m.team2;
      }
    }
    if (score2 > 0) {
      const cur2 = parseRuns(t2.highScore);
      if (score2 > cur2) {
        t2.highScore = m.team2_score!;
        t2.highScoreDate = m.match_date;
        t2.highScoreVs = m.team1;
      }
    }
  }

  return [...map.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    // Tiebreak: win ratio
    const aWR = a.played ? a.won / a.played : 0;
    const bWR = b.played ? b.won / b.played : 0;
    return bWR - aWR;
  });
}

// ─── Position badge ──────────────────────────────────────────
function PosBadge({ pos }: { pos: number }) {
  if (pos === 1) return (
    <div style={{
      width: '26px', height: '26px', borderRadius: '9999px', flexShrink: 0,
      background: 'linear-gradient(135deg, #F59E0B, #F5A524)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(245,165,36,0.4)',
    }}>
      <Trophy size={12} style={{ color: '#001' }} />
    </div>
  );
  if (pos === 2) return (
    <div style={{
      width: '26px', height: '26px', borderRadius: '9999px', flexShrink: 0,
      background: 'rgba(156,163,175,0.15)', border: '1px solid rgba(156,163,175,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: '#9CA3AF' }}>2</span>
    </div>
  );
  if (pos === 3) return (
    <div style={{
      width: '26px', height: '26px', borderRadius: '9999px', flexShrink: 0,
      background: 'rgba(180,120,60,0.12)', border: '1px solid rgba(180,120,60,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: '#B47C3C' }}>3</span>
    </div>
  );
  if (pos === 4) return (
    <div style={{
      width: '26px', height: '26px', borderRadius: '9999px', flexShrink: 0,
      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: '#22C55E' }}>4</span>
    </div>
  );
  return (
    <div style={{
      width: '26px', height: '26px', borderRadius: '9999px', flexShrink: 0,
      background: 'rgba(255,255,255,0.04)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: '#4A5F75' }}>{pos}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function PointsTable({ matches }: PointsTableProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const standings = useMemo(() => computeStandings(matches), [matches]);

  const playedCount = matches.filter(
    (m) => m.status === 'completed' || m.status === 'settled' || m.status === 'cancelled'
  ).length;

  if (standings.length === 0) {
    return (
      <div className="rr-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <TrendingUp size={32} style={{ color: '#2A3F55', margin: '0 auto 0.875rem' }} />
        <p style={{ color: '#4A5F75', fontSize: '0.9375rem' }}>
          Points table builds up as matches are completed.
        </p>
      </div>
    );
  }

  const leader = standings[0];

  return (
    <div className="space-y-3">
      {/* ── Collapsible header ── */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full rr-card flex flex-col md:flex-row items-center justify-between p-4 px-5 transition-colors duration-200"
        style={{
          background: isExpanded ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)',
          borderColor: isExpanded ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
          cursor: 'pointer',
        }}
      >
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(245,165,36,0.1)', border: '1px solid rgba(245,165,36,0.2)' }}>
            <Trophy size={14} style={{ color: '#F5A524' }} />
          </div>
          <div className="flex flex-col items-start pr-2">
            <span className="font-bold text-[0.9375rem]" style={{ fontFamily: 'var(--font-heading)', color: '#E8EDF5' }}>
              IPL 2026 Standings
            </span>
            <span className="text-xs" style={{ color: '#7A90A8', fontFamily: 'var(--font-heading)' }}>
              Top 4 Qualify for Playoffs
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isExpanded && leader && (
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-md text-[0.625rem] font-bold" style={{ background: 'rgba(245,165,36,0.15)', color: '#F5A524', letterSpacing: '0.05em' }}>
                <Flame size={10} className="inline mr-1" />{leader.team} Leading
              </span>
            )}
            {isExpanded 
              ? <ChevronUp size={16} style={{ color: '#4A5F75' }} />
              : <ChevronDown size={16} style={{ color: '#4A5F75' }} />}
          </div>
        </div>
      </button>

      {/* ── Expanded Content ── */}
      {isExpanded && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300 fill-mode-both">
          {/* ── Leader spotlight ─────────────────────────────── */}
          <div
            className="rr-card"
            style={{
              overflow: 'hidden',
              position: 'relative',
              borderColor: 'rgba(245,165,36,0.2)',
            }}
          >
        {/* Amber glow */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '200px', height: '200px', borderRadius: '9999px',
          background: 'radial-gradient(ellipse, rgba(245,165,36,0.1) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent, #F5A524 50%, transparent)' }} />

        <div style={{ padding: '1.125rem 1.375rem' }}>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={14} style={{ color: '#F5A524' }} />
            <span
              style={{
                fontFamily: 'var(--font-heading)', fontSize: '0.6875rem', fontWeight: 700,
                letterSpacing: '0.12em', color: '#F5A524', textTransform: 'uppercase',
              }}
            >
              Leading — {playedCount} matches played
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <TeamLogo team={leader.team} className="w-12 h-12" />
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: '#F5A524', lineHeight: 1 }}>
                  {leader.team}
                </h2>
                <p style={{ color: '#7A90A8', fontSize: '0.8125rem', marginTop: '0.2rem' }}>
                  {leader.won}W · {leader.lost}L{leader.nr > 0 ? ` · ${leader.nr}NR` : ''}
                </p>
              </div>
            </div>

            {/* Big points badge */}
            <div
              style={{
                marginLeft: 'auto',
                background: 'rgba(245,165,36,0.1)', border: '1px solid rgba(245,165,36,0.3)',
                borderRadius: '0.875rem', padding: '0.625rem 1.25rem', textAlign: 'center',
              }}
            >
              <div style={{ color: '#4A5F75', fontSize: '0.6875rem', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>PTS</div>
              <div className="scoreboard-num" style={{ fontSize: '2.25rem', color: '#F5A524', lineHeight: 1 }}>{leader.pts}</div>
            </div>

            {/* Highest score */}
            {leader.highScore && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '0.75rem', padding: '0.625rem 1rem',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Star size={11} style={{ color: '#F5A524' }} />
                  <span style={{ color: '#4A5F75', fontSize: '0.6875rem', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Season High</span>
                </div>
                <div className="scoreboard-num" style={{ fontSize: '1.125rem', color: '#E8EDF5' }}>{leader.highScore}</div>
                <div style={{ color: '#4A5F75', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                  <Swords size={10} />
                  <span>{leader.highScoreVs}</span>
                  <span>·</span>
                  <Calendar size={10} />
                  <span>{format(new Date(leader.highScoreDate!), 'MMM d')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Full table ───────────────────────────────────── */}
      <div className="rr-card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0.875rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.625rem',
          }}
        >
          <TrendingUp size={15} style={{ color: '#00D4C8' }} />
          <span className="field-label">IPL 2026 Points Table</span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.6875rem', fontFamily: 'var(--font-heading)', fontWeight: 700,
              letterSpacing: '0.08em', color: '#2A3F55',
            }}
          >
            TOP 4 QUALIFY
          </span>
        </div>

        {/* Table header */}
        <div className="w-full overflow-x-auto no-scrollbar pb-1">
          <div style={{ minWidth: '460px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 36px 36px 36px 36px 52px',
                gap: '0 0.5rem',
                padding: '0.5rem 1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {['#', 'Team', 'P', 'W', 'L', 'NR', 'PTS'].map((h) => (
                <span
                  key={h}
                  style={{
                    fontFamily: 'var(--font-heading)', fontSize: '0.6875rem', fontWeight: 700,
                    letterSpacing: '0.1em', color: '#2A3F55',
                    textAlign: h === 'Team' ? 'left' : 'center',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

        {/* Rows */}
        {standings.map((s, idx) => {
          const pos = idx + 1;
          const isTop4 = pos <= 4;
          const isLeader = pos === 1;

          return (
            <div
              key={s.team}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 36px 36px 36px 36px 52px',
                gap: '0 0.5rem',
                padding: '0.75rem 1.25rem',
                borderBottom: idx < standings.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                alignItems: 'center',
                background: isLeader ? 'rgba(245,165,36,0.03)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = isLeader ? 'rgba(245,165,36,0.06)' : 'rgba(255,255,255,0.015)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = isLeader ? 'rgba(245,165,36,0.03)' : 'transparent')}
            >
              {/* Position */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <PosBadge pos={pos} />
              </div>

              {/* Team name + logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                <TeamLogo team={s.team} className="w-7 h-7 shrink-0" />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.875rem',
                      color: isLeader ? '#F5A524' : isTop4 ? '#E8EDF5' : '#7A90A8',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {s.team}
                  </div>
                  {s.highScore && (
                    <div style={{ color: '#2A3F55', fontSize: '0.6875rem', marginTop: '0.1rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <Star size={9} style={{ color: '#F5A524', opacity: 0.7 }} />
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{s.highScore}</span>
                      <span style={{ color: '#1A2F45' }}>vs {s.highScoreVs} · {s.highScoreDate ? format(new Date(s.highScoreDate), 'MMM d') : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              {[s.played, s.won, s.lost, s.nr].map((val, i) => (
                <div
                  key={i}
                  className="scoreboard-num"
                  style={{
                    textAlign: 'center', fontSize: '0.9375rem',
                    color: i === 1 && val > 0 ? '#22C55E'
                      : i === 2 && val > 0 ? '#EF4444'
                      : i === 3 && val > 0 ? '#F5A524'
                      : '#7A90A8',
                  }}
                >
                  {val}
                </div>
              ))}

              {/* Points */}
              <div style={{ textAlign: 'center' }}>
                <span
                  className="scoreboard-num"
                  style={{
                    fontSize: '1rem', fontWeight: 700,
                    color: isLeader ? '#F5A524' : isTop4 ? '#00D4C8' : '#4A5F75',
                    background: isLeader ? 'rgba(245,165,36,0.1)' : isTop4 ? 'rgba(0,212,200,0.08)' : 'transparent',
                    border: isLeader ? '1px solid rgba(245,165,36,0.25)' : isTop4 ? '1px solid rgba(0,212,200,0.15)' : 'none',
                    borderRadius: '0.375rem',
                    display: 'inline-block',
                    padding: isLeader || isTop4 ? '0.15rem 0.5rem' : '0',
                  }}
                >
                  {s.pts}
                </span>
              </div>
            </div>
          );
        })}
        </div></div>

        {/* Legend */}
        <div
          style={{
            padding: '0.625rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', gap: '1.25rem', flexWrap: 'wrap',
          }}
        >
          {[
            { color: '#F5A524', label: 'Leader' },
            { color: '#00D4C8', label: 'Playoff zone (Top 4)' },
            { color: '#7A90A8', label: 'NR = No Result (cancelled)' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
              <span style={{ color: '#2A3F55', fontSize: '0.6875rem', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
