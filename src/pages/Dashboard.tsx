import { useStore } from '../store/useStore';
import { Trophy, TrendingUp, Users, Activity, CalendarDays, Crown, ChevronDown, ChevronUp, ArrowUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LeaderboardEntry } from '../types';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn, getAvatarColor } from '../lib/utils';
import { CountUp } from '../components/ui/count-up';
import { TeamLogo } from '../components/TeamLogo';

export function Dashboard() {
  const { participants, matches, matchBets, miscBets } = useStore();
  const [isWinnersTableOpen, setIsWinnersTableOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'side'>('main');

  const winningBets = useMemo(() => {
    return matchBets
      .filter((bet) => bet.result === 'win')
      .map((bet) => {
        const match = matches.find((m) => m.id === bet.match_id);
        const participant = participants.find((p) => p.id === bet.participant_id);
        const matchWinnerName = match?.winner === 'team1' ? match.team1 : match?.team2;
        return {
          id: bet.id,
          match_no: match?.match_no || 0,
          team1: match?.team1 || '',
          team2: match?.team2 || '',
          team1_score: match?.team1_score,
          team2_score: match?.team2_score,
          matchWinnerName,
          participantName: participant?.name || 'Unknown',
          amountWon: bet.profit_loss,
        };
      })
      .sort((a, b) => b.match_no - a.match_no);
  }, [matchBets, matches, participants]);

  const sideBetsByMatch = useMemo(() => {
    const settled = miscBets.filter((b) => b.status === 'settled');
    const groups: {
      matchNo?: number;
      matchLabel: string;
      bets: typeof settled;
      participantPL: { participantName: string; totalPL: number }[];
    }[] = [];
    const seen: Record<string, number> = {};

    settled.forEach((bet) => {
      const matchId = bet.match_id ?? '__general__';
      if (seen[matchId] === undefined) {
        const match = bet.match_id ? matches.find((m) => m.id === bet.match_id) : null;
        const label = match ? `Match ${match.match_no}: ${match.team1} vs ${match.team2}` : 'General (No Match)';
        seen[matchId] = groups.length;
        groups.push({ matchNo: match?.match_no, matchLabel: label, bets: [], participantPL: [] });
      }
      groups[seen[matchId]].bets.push(bet);
    });

    groups.forEach((group) => {
      const plMap: Record<string, number> = {};
      group.bets.forEach((bet) => {
        const winner = participants.find((p) => p.id === bet.winner_participant_id);
        const loser = participants.find((p) => p.id === bet.loser_participant_id);
        if (winner) plMap[winner.name] = (plMap[winner.name] || 0) + bet.amount;
        if (loser) plMap[loser.name] = (plMap[loser.name] || 0) - bet.amount;
      });
      group.participantPL = Object.entries(plMap)
        .map(([name, pl]) => ({ participantName: name, totalPL: pl }))
        .sort((a, b) => b.totalPL - a.totalPL);
    });

    return groups.sort((a, b) => (b.matchNo ?? 0) - (a.matchNo ?? 0));
  }, [miscBets, matches, participants]);

  const leaderboard = useMemo(() => {
    const stats: Record<string, LeaderboardEntry> = {};
    participants.forEach((p) => {
      stats[p.id] = { participant_id: p.id, name: p.name, total_pl: 0, matches_played: 0, wins: 0, losses: 0, win_rate: 0 };
    });
    matchBets.forEach((bet) => {
      if (stats[bet.participant_id] && bet.result !== 'pending') {
        stats[bet.participant_id].total_pl += bet.profit_loss;
        stats[bet.participant_id].matches_played += 1;
        if (bet.result === 'win') stats[bet.participant_id].wins += 1;
        if (bet.result === 'loss') stats[bet.participant_id].losses += 1;
      }
    });
    miscBets.forEach((bet) => {
      if (bet.status === 'settled') {
        if (stats[bet.winner_participant_id]) stats[bet.winner_participant_id].total_pl += bet.amount;
        if (stats[bet.loser_participant_id]) stats[bet.loser_participant_id].total_pl -= bet.amount;
      }
    });
    return Object.values(stats)
      .map((stat) => {
        stat.win_rate = stat.matches_played > 0 ? (stat.wins / stat.matches_played) * 100 : 0;
        return stat;
      })
      .sort((a, b) => b.total_pl - a.total_pl);
  }, [participants, matchBets, miscBets]);

  const nextMatch = useMemo(() => matches.find((m) => m.status === 'scheduled'), [matches]);
  const completedMatches = useMemo(() => matches.filter((m) => m.status === 'completed' || m.status === 'settled').length, [matches]);
  const totalPool = useMemo(
    () => matchBets.reduce((acc, bet) => acc + bet.amount, 0) + miscBets.reduce((acc, bet) => acc + bet.amount, 0),
    [matchBets, miscBets]
  );

  const leader = leaderboard[0];

  return (
    <div className="space-y-7 page-enter">
      {/* Page Title */}
      <div>
        <h1 className="section-header text-2xl md:text-3xl xl:text-4xl">Overview</h1>
        <p className="section-meta mt-1.5">Season standings & match activity</p>
      </div>

      {/* ── Hero Strip ── */}
      <div className="hero-strip p-5 md:p-6 xl:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-0">
          {/* Leader */}
          <div className="lg:w-[22%] lg:pr-6 min-w-0">
            <p
              className="text-[0.6875rem] font-bold mb-3"
              style={{ color: '#F5A524', fontFamily: 'var(--font-mono)', letterSpacing: '0.22em', textTransform: 'uppercase' }}
            >
              Leading
            </p>
            {leader ? (
              <div className="flex items-center gap-4 relative">
                {/* Ambient glow behind name — purely decorative */}
                <div className="leader-glow" />
                <div className="relative z-10">
                  <div
                    className="text-lg md:text-xl xl:text-2xl font-bold leading-tight tracking-tight"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      color: '#F5A524',
                    }}
                  >
                    {leader.name}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <ArrowUp className="w-4 h-4" style={{ color: '#22C55E' }} />
                    <span
                      className="scoreboard-num text-lg xl:text-xl font-bold"
                      style={{ color: '#22C55E' }}
                    >
                      +₹{leader.total_pl.toLocaleString()}
                    </span>
                    <span className="text-sm" style={{ color: '#4A5F75' }}>net P/L</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-base" style={{ color: '#4A5F75' }}>No data yet — place your first bet</p>
            )}
          </div>

          {/* Dividers */}
          <div className="hidden lg:block w-px self-stretch mr-6" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)' }} />
          <div className="block lg:hidden h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />

          {/* Stat pills */}
          <div className="lg:w-[78%] flex flex-wrap items-center gap-3">
            <StatPill icon={<Users className="w-3.5 h-3.5" />} label="Players" value={participants.length} color="teal" />
            <StatPill 
              icon={<Trophy className="w-3.5 h-3.5" />} 
              label="Played" 
              value={`${completedMatches}/${matches.length}`} 
              color="amber" 
            />
            
            <StatPill 
              icon={<Activity className="w-3.5 h-3.5" />} 
              label="Main Bets" 
              value={matchBets.length} 
              subValue={`${matchBets.filter(b => b.result === 'pending').length} pending`}
              color="teal" 
            />

            <StatPill 
              icon={<Activity className="w-3.5 h-3.5" />} 
              label="Side Bets" 
              value={miscBets.length} 
              subValue={`${miscBets.filter(b => b.status === 'pending').length} pending`}
              color="amber" 
            />

            <StatPill icon={<TrendingUp className="w-3.5 h-3.5" />} label="Pool" value={`₹${totalPool.toLocaleString()}`} color="amber" mono />
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Standings */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center gap-2.5 mb-4">
            <Trophy className="w-5 h-5" style={{ color: '#F5A524' }} />
            <h2 className="section-header text-xl">Standings</h2>
          </div>

          {leaderboard.length === 0 ? (
            <div className="empty-state">
              <Trophy className="w-10 h-10" style={{ color: '#2A3F55' }} />
              <p className="text-base" style={{ color: '#4A5F75' }}>No activity yet — place your first bet to get started</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {leaderboard.map((entry, index) => (
                <div key={entry.participant_id} className={cn(index === 0 ? 'rank-card-top' : 'rank-card')}>
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="w-8 flex justify-center shrink-0">
                      {index === 0 ? (
                        <Crown className="w-5 h-5" style={{ color: '#F5A524' }} />
                      ) : (
                        <span className="text-sm font-bold scoreboard-num" style={{ color: '#4A5F75' }}>
                          {index + 1}
                        </span>
                      )}
                    </div>
                    {/* Avatar */}
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0', getAvatarColor(entry.name))}>
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-bold text-base truncate"
                        style={{ fontFamily: 'var(--font-heading)', color: index === 0 ? '#F5A524' : '#E8EDF5' }}
                      >
                        {entry.name}
                      </div>
                      <div className="flex items-center gap-2.5 mt-1.5">
                        <div className="win-bar-track">
                          <div className="win-bar-fill" style={{ width: `${entry.win_rate}%` }} />
                        </div>
                        <span className="text-xs" style={{ color: '#4A5F75' }}>
                          {entry.win_rate.toFixed(0)}% win · {entry.matches_played} played
                        </span>
                      </div>
                    </div>
                    {/* W / L */}
                    <div className="flex gap-4 items-center shrink-0 mr-4 hidden sm:flex">
                      <div className="text-center">
                        <div className="text-sm font-bold scoreboard-num" style={{ color: '#22C55E' }}>{entry.wins}</div>
                        <div className="text-xs" style={{ color: '#2A3F55' }}>W</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold scoreboard-num" style={{ color: '#EF4444' }}>{entry.losses}</div>
                        <div className="text-xs" style={{ color: '#2A3F55' }}>L</div>
                      </div>
                    </div>
                    {/* P/L */}
                    <div className="text-right shrink-0">
                      <div
                        className={cn(
                          'scoreboard-num text-base font-bold',
                          entry.total_pl > 0 ? 'pl-positive' : entry.total_pl < 0 ? 'pl-negative' : 'pl-neutral'
                        )}
                      >
                        {entry.total_pl > 0 ? '+' : ''}₹{entry.total_pl.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Match */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 mb-4">
            <CalendarDays className="w-5 h-5" style={{ color: '#00D4C8' }} />
            <h2 className="section-header text-xl">Next Match</h2>
          </div>

          {nextMatch ? (
            <Link to={`/matches/${nextMatch.id}`} className="block">
              <div className="upcoming-card p-5 md:p-6">
                {/* Match no + date */}
                <div className="flex justify-between items-center mb-6">
                  <span className="status-pill status-pill--upcoming">Match {nextMatch.match_no}</span>
                  <span className="text-sm" style={{ color: '#4A5F75' }}>
                    {format(new Date(nextMatch.match_date), 'MMM d')}
                  </span>
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between gap-2 py-2">
                  <div className="flex flex-col items-center flex-1 text-center gap-2.5">
                    <TeamLogo team={nextMatch.team1} className="w-14 h-14 text-xl" fallbackColorClass="text-primary bg-primary/10" />
                    <div
                      className="text-sm font-bold leading-tight"
                      style={{ fontFamily: 'var(--font-heading)', color: '#E8EDF5' }}
                    >
                      {nextMatch.team1}
                    </div>
                  </div>
                  <div className="vs-divider shrink-0">
                    <div className="vs-badge">VS</div>
                  </div>
                  <div className="flex flex-col items-center flex-1 text-center gap-2.5">
                    <TeamLogo team={nextMatch.team2} className="w-14 h-14 text-xl" fallbackColorClass="text-secondary bg-secondary/10" />
                    <div
                      className="text-sm font-bold leading-tight"
                      style={{ fontFamily: 'var(--font-heading)', color: '#E8EDF5' }}
                    >
                      {nextMatch.team2}
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div
                  className="mt-5 pt-4 flex items-center justify-center gap-2 text-xs"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#4A5F75' }}
                >
                  <span>{nextMatch.match_time}</span>
                  <span className="w-1 h-1 rounded-full" style={{ background: '#2A3F55' }} />
                  <span className="truncate">{nextMatch.venue}</span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="empty-state">
              <CalendarDays className="w-10 h-10" style={{ color: '#2A3F55' }} />
              <p className="text-base" style={{ color: '#4A5F75' }}>No upcoming matches</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Winning Bets Summary ── */}
      <div className="rr-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-5 transition-colors hover:bg-white/[0.02] cursor-pointer"
          style={{ borderBottom: isWinnersTableOpen ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          onClick={() => setIsWinnersTableOpen(!isWinnersTableOpen)}
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5" style={{ color: '#F5A524' }} />
            <span className="section-header text-lg">Winning Bets Summary</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: '#4A5F75' }}>
              {winningBets.length} won · {miscBets.filter((b) => b.status === 'settled').length} settled
            </span>
            {isWinnersTableOpen
              ? <ChevronUp className="w-5 h-5" style={{ color: '#4A5F75' }} />
              : <ChevronDown className="w-5 h-5" style={{ color: '#4A5F75' }} />}
          </div>
        </button>

        {isWinnersTableOpen && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            {/* Tabs */}
            <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
              {(['main', 'side'] as const).map((tab) => {
                const label = tab === 'main' ? 'Main Bets' : 'Side Bets';
                const count = tab === 'main' ? winningBets.length : miscBets.filter((b) => b.status === 'settled').length;
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-3.5 text-sm font-semibold transition-colors relative cursor-pointer"
                    style={{ color: active ? '#E8EDF5' : '#4A5F75', fontFamily: 'var(--font-heading)', fontSize: '0.9375rem' }}
                  >
                    {label}
                    <span
                      className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: active ? 'rgba(0,212,200,0.12)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#00D4C8' : '#4A5F75',
                        border: `1px solid ${active ? 'rgba(0,212,200,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      {count}
                    </span>
                    {active && <span className="tab-indicator" />}
                  </button>
                );
              })}
            </div>

            {/* Main Bets Tab */}
            {activeTab === 'main' && (
              <div>
                {winningBets.length === 0 ? (
                  <div className="empty-state m-6">
                    <Trophy className="w-9 h-9" style={{ color: '#2A3F55' }} />
                    <p className="text-base" style={{ color: '#4A5F75' }}>No winning bets settled yet.</p>
                  </div>
                ) : (
                  <>
                    <div
                      className="hidden md:grid grid-cols-[90px_1fr_160px_160px_120px] px-6 py-3 text-xs font-black uppercase tracking-widest"
                      style={{ color: '#4A5F75', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-heading)' }}
                    >
                      <span>Match</span>
                      <span>Teams</span>
                      <span>Match Winner</span>
                      <span>Bet Winner</span>
                      <span className="text-right">Amount Won</span>
                    </div>
                    {winningBets.map((bet) => (
                      <div key={bet.id} className="bet-strip bet-strip--win">
                        <div className="hidden md:grid grid-cols-[90px_1fr_160px_160px_120px] items-center gap-3">
                          <span className="text-sm scoreboard-num font-bold" style={{ color: '#4A5F75' }}>#{bet.match_no}</span>
                          <div className="text-sm" style={{ color: '#7A90A8' }}>
                            <div>{bet.team1} {bet.team1_score && <span className="scoreboard-num text-xs" style={{ color: '#4A5F75' }}>({bet.team1_score})</span>}</div>
                            <div className="text-xs my-0.5" style={{ color: '#2A3F55' }}>vs</div>
                            <div>{bet.team2} {bet.team2_score && <span className="scoreboard-num text-xs" style={{ color: '#4A5F75' }}>({bet.team2_score})</span>}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
                            <span className="text-sm font-semibold" style={{ color: '#22C55E' }}>{bet.matchWinnerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', getAvatarColor(bet.participantName))}>
                              {bet.participantName.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold" style={{ color: '#E8EDF5' }}>{bet.participantName}</span>
                          </div>
                          <div className="text-right scoreboard-num text-base font-bold" style={{ color: '#22C55E' }}>
                            +₹{bet.amountWon.toLocaleString()}
                          </div>
                        </div>
                        {/* Mobile */}
                        <div className="md:hidden space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs scoreboard-num font-bold" style={{ color: '#4A5F75' }}>Match #{bet.match_no}</span>
                              <div className="text-sm mt-0.5 font-medium" style={{ color: '#7A90A8' }}>{bet.team1} vs {bet.team2}</div>
                            </div>
                            <span className="scoreboard-num text-lg font-bold" style={{ color: '#22C55E' }}>+₹{bet.amountWon.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span style={{ color: '#4A5F75' }}>Won by: <span style={{ color: '#22C55E', fontWeight: 600 }}>{bet.matchWinnerName}</span></span>
                            <span style={{ color: '#2A3F55' }}>·</span>
                            <span style={{ color: '#4A5F75' }}>Bettor: <span style={{ color: '#E8EDF5', fontWeight: 600 }}>{bet.participantName}</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Side Bets Tab */}
            {activeTab === 'side' && (
              <div>
                {sideBetsByMatch.length === 0 ? (
                  <div className="empty-state m-6">
                    <Activity className="w-9 h-9" style={{ color: '#2A3F55' }} />
                    <p className="text-base" style={{ color: '#4A5F75' }}>No settled side bets yet.</p>
                  </div>
                ) : (
                  sideBetsByMatch.map((group) => (
                    <div key={group.matchLabel}>
                      <div
                        className="px-6 py-2.5 text-xs font-black uppercase tracking-widest"
                        style={{ color: '#4A5F75', background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-heading)' }}
                      >
                        {group.matchLabel}
                      </div>
                      {group.bets.map((bet) => {
                        const winner = participants.find((p) => p.id === bet.winner_participant_id);
                        const loser = participants.find((p) => p.id === bet.loser_participant_id);
                        return (
                          <div key={bet.id} className="bet-strip">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-base font-semibold truncate" style={{ color: '#E8EDF5' }}>{bet.title}</div>
                                <div className="flex items-center gap-4 mt-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0', getAvatarColor(winner?.name || ''))}>
                                      {winner?.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: '#22C55E' }}>{winner?.name}</span>
                                  </div>
                                  <span className="text-xs" style={{ color: '#2A3F55' }}>vs</span>
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 opacity-60', getAvatarColor(loser?.name || ''))}>
                                      {loser?.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="text-sm" style={{ color: '#4A5F75' }}>{loser?.name}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="scoreboard-num text-base font-bold shrink-0" style={{ color: '#E8EDF5' }}>
                                ₹{bet.amount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div
                        className="px-6 py-3.5 flex flex-wrap gap-x-8 gap-y-2 items-center"
                        style={{ background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <span className="text-xs font-black uppercase tracking-widest mr-auto" style={{ color: '#2A3F55', fontFamily: 'var(--font-heading)' }}>
                          Match P/L
                        </span>
                        {group.participantPL.map((item) => (
                          <div key={item.participantName} className="flex items-center gap-2">
                            <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0', getAvatarColor(item.participantName))}>
                              {item.participantName.charAt(0)}
                            </div>
                            <span className="text-sm font-medium" style={{ color: '#7A90A8' }}>{item.participantName}:</span>
                            <span
                              className="text-sm scoreboard-num font-bold"
                              style={{ color: item.totalPL > 0 ? '#22C55E' : item.totalPL < 0 ? '#EF4444' : '#4A5F75' }}
                            >
                              {item.totalPL > 0 ? '+' : ''}₹{item.totalPL.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Stat Pill ── */
function StatPill({
  icon, label, value, color, mono, subValue
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'teal' | 'amber';
  mono?: boolean;
  subValue?: string;
}) {
  const isTeal = color === 'teal';
  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg flex-1 min-w-[max-content]"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 2px 8px rgba(0,0,0,0.2)'
      }}
    >
      <div style={{ color: isTeal ? 'rgba(0,212,200,0.65)' : 'rgba(245,165,36,0.65)' }}>{icon}</div>
      <div>
        <div
          className="field-label whitespace-nowrap"
          style={{ color: '#4A5F75' }}
        >
          {label}
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <div
            className="text-sm font-bold whitespace-nowrap"
            style={{ color: '#E8EDF5', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-heading)' }}
          >
            {typeof value === 'number' ? <CountUp value={value} /> : value}
          </div>
          {subValue && (
            <div className="text-[10px] whitespace-nowrap" style={{ color: '#F5A524' }}>
              {subValue}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
