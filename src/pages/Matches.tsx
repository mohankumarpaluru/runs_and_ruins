import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Input } from '../components/ui/input';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { Plus, X, Trophy, CalendarDays, MapPin, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import { TeamLogo } from '../components/TeamLogo';
import { PointsTable } from '../components/PointsTable';

export function Matches() {
  const { matches, fetchMatches } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newMatch, setNewMatch] = useState({
    match_no: '',
    team1: '',
    team2: '',
    match_date: '',
    match_time: '',
    venue: '',
    stage: 'Group Stage',
  });

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatch.match_no || !newMatch.team1 || !newMatch.team2 || !newMatch.match_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const { error } = await supabase.from('matches').insert([{
        match_no: Number(newMatch.match_no),
        team1: newMatch.team1,
        team2: newMatch.team2,
        match_date: newMatch.match_date,
        match_time: newMatch.match_time || '19:30',
        venue: newMatch.venue || 'TBD',
        stage: newMatch.stage,
        status: 'scheduled',
      }]);
      if (error) throw error;
      toast.success('Match added successfully');
      setIsAdding(false);
      setNewMatch({ match_no: '', team1: '', team2: '', match_date: '', match_time: '', venue: '', stage: 'Group Stage' });
      await fetchMatches();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add match');
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="section-header text-3xl md:text-4xl">Matches</h1>
          <p className="section-meta mt-1.5">{matches.length} matches this season</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[0.9375rem] font-bold transition-all duration-200 cursor-pointer"
          style={isAdding ? {
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#EF4444',
            fontFamily: 'var(--font-heading)',
          } : {
            background: 'linear-gradient(135deg, #00D4C8, #00B8AE)',
            border: '1px solid transparent',
            color: '#001312',
            fontFamily: 'var(--font-heading)',
            boxShadow: '0 2px 10px rgba(0,212,200,0.3)',
          }}
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'Add Match'}
        </button>
      </div>

      {/* ─── Points Table ─────────────────── */}
      <PointsTable matches={matches} />

      {/* Add Match Form */}
      {isAdding && (
        <div className="form-action-card p-6 animate-in slide-in-from-top-4 duration-300">
          <h2 className="section-header text-lg mb-6">Add New Match</h2>
          <form onSubmit={handleAddMatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Match Number *', type: 'number', placeholder: 'e.g. 1', field: 'match_no' },
                { label: 'Date *', type: 'date', placeholder: '', field: 'match_date' },
                { label: 'Team 1 *', type: 'text', placeholder: 'e.g. CSK', field: 'team1' },
                { label: 'Team 2 *', type: 'text', placeholder: 'e.g. MI', field: 'team2' },
                { label: 'Time', type: 'time', placeholder: '', field: 'match_time' },
                { label: 'Venue', type: 'text', placeholder: 'e.g. Wankhede Stadium', field: 'venue' },
              ].map(({ label, type, placeholder, field }) => (
                <div key={field} className="space-y-1.5">
                  <label className="field-label" style={{ color: '#4A5F75' }}>
                    {label}
                  </label>
                  <Input
                    type={type}
                    placeholder={placeholder}
                    value={(newMatch as any)[field]}
                    onChange={(e) => setNewMatch({ ...newMatch, [field]: e.target.value })}
                    required={label.includes('*')}
                    className="bg-surface-light border-border/60 focus-visible:ring-primary/40 h-10"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-3">
              <button type="submit" className="action-btn-primary px-7 py-2.5">
                Save Match
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Match Grid */}
      {matches.length === 0 ? (
        <div className="empty-state">
          <Trophy className="w-12 h-12" style={{ color: '#2A3F55' }} />
          <p className="font-bold text-base" style={{ color: '#4A5F75', fontFamily: 'var(--font-heading)' }}>No matches yet</p>
          <p className="text-sm" style={{ color: '#2A3F55' }}>Add your first match to get started</p>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => {
            const isCancelled = match.status === 'cancelled';
            const isCompleted = match.status === 'completed' || match.status === 'settled';
            const isUpcoming  = match.status === 'scheduled';
            const winnerTeam  = match.winner;

            return (
              <Link key={match.id} to={`/matches/${match.id}`} className="block">
                <div
                  className={cn(
                    'match-event-card h-full relative border flex flex-col',
                    isCompleted ? 'border-white/[0.04] bg-[#0A121E]/60 backdrop-blur-md' : 'border-transparent',
                    isUpcoming && 'match-event-card-upcoming border-white/[0.06]'
                  )}
                  style={{ isolation: 'isolate' }}
                >
                  {/* Winner accent bar */}
                  {isCompleted && winnerTeam === 'team1' && <div className="winner-accent-left" />}
                  {isCompleted && winnerTeam === 'team2' && <div className="winner-accent-right" />}
                  {/* Cancelled stripe */}
                  {isCancelled && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'repeating-linear-gradient(90deg, rgba(245,165,36,0.5) 0px, rgba(245,165,36,0.5) 6px, transparent 6px, transparent 12px)' }} />
                  )}

                  <div className="p-5 flex flex-col h-full">
                    {/* Top row: match no + status */}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs scoreboard-num font-bold" style={{ color: isUpcoming ? '#00D4C8' : '#3A5570' }}>
                        Match #{match.match_no}
                      </span>
                      {/* Status pill */}
                      <span
                        className="text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full"
                        style={
                          isCancelled ? {
                            background: 'rgba(245,165,36,0.08)',
                            border: '1px solid rgba(245,165,36,0.2)',
                            color: 'rgba(245,165,36,0.8)',
                            fontFamily: 'var(--font-heading)',
                            letterSpacing: '0.06em',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          } : isUpcoming ? {
                            background: 'rgba(0,212,200,0.07)',
                            border: '1px solid rgba(0,212,200,0.18)',
                            color: 'rgba(0,212,200,0.75)',
                            fontFamily: 'var(--font-heading)',
                            letterSpacing: '0.06em',
                          } : isCompleted ? {
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            color: 'rgba(122,144,168,0.6)',
                            fontFamily: 'var(--font-heading)',
                            letterSpacing: '0.06em',
                          } : {
                            background: 'rgba(34,197,94,0.07)',
                            border: '1px solid rgba(34,197,94,0.15)',
                            color: 'rgba(34,197,94,0.7)',
                            fontFamily: 'var(--font-heading)',
                            letterSpacing: '0.06em',
                          }
                        }
                      >
                        {isCancelled && <Ban style={{ width: '9px', height: '9px' }} />}
                        {isCancelled ? 'No Result' : isUpcoming ? 'Upcoming' : match.status === 'settled' ? 'Settled' : 'Completed'}
                      </span>
                    </div>

                    {/* Teams */}
                    <div className="flex-1 flex items-center justify-between gap-2 py-3">
                      {/* Team 1 */}
                      <div
                        className={cn(
                          'flex flex-col items-center flex-1 relative gap-2 transition-opacity duration-300',
                          isCompleted && winnerTeam === 'team2' && 'opacity-35'
                        )}
                      >
                        {/* Winner trophy badge */}
                        {winnerTeam === 'team1' && (
                          <div
                            className="absolute -top-1.5 right-0 p-1 rounded-full"
                            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)' }}
                          >
                            <Trophy className="w-2.5 h-2.5" style={{ color: '#22C55E' }} />
                          </div>
                        )}
                        {/* Logo — winner gets glow ring */}
                        <div className={cn(winnerTeam === 'team1' && isCompleted && 'logo-winner')}>
                          <TeamLogo
                            team={match.team1}
                            className={cn('text-xl', isCompleted && winnerTeam === 'team1' ? 'w-16 h-16' : 'w-14 h-14')}
                            fallbackColorClass="text-primary bg-primary/10"
                          />
                        </div>
                        <div
                          className="text-sm font-bold text-center line-clamp-1 transition-colors"
                          style={{
                            fontFamily: 'var(--font-heading)',
                            color: winnerTeam === 'team1' && isCompleted ? '#22C55E'
                              : isCompleted && winnerTeam === 'team2' ? '#3A5570'
                              : '#E8EDF5',
                          }}
                        >
                          {match.team1}
                        </div>
                        {match.team1_score && (
                          <div
                            className="scoreboard-num text-xs px-2.5 py-0.5 rounded"
                            style={{
                              background: winnerTeam === 'team1' ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                              color: winnerTeam === 'team1' ? '#22C55E' : '#4A5F75',
                              border: `1px solid ${winnerTeam === 'team1' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)'}`,
                            }}
                          >
                            {match.team1_score}
                          </div>
                        )}
                      </div>

                      {/* VS */}
                      <div className="vs-divider shrink-0">
                        <div className={cn('vs-badge', isUpcoming && 'vs-badge-upcoming')}>VS</div>
                      </div>

                      {/* Team 2 */}
                      <div
                        className={cn(
                          'flex flex-col items-center flex-1 relative gap-2 transition-opacity duration-300',
                          isCompleted && winnerTeam === 'team1' && 'opacity-35'
                        )}
                      >
                        {winnerTeam === 'team2' && (
                          <div
                            className="absolute -top-1.5 right-0 p-1 rounded-full"
                            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)' }}
                          >
                            <Trophy className="w-2.5 h-2.5" style={{ color: '#22C55E' }} />
                          </div>
                        )}
                        <div className={cn(winnerTeam === 'team2' && isCompleted && 'logo-winner')}>
                          <TeamLogo
                            team={match.team2}
                            className={cn('text-xl', isCompleted && winnerTeam === 'team2' ? 'w-16 h-16' : 'w-14 h-14')}
                            fallbackColorClass="text-secondary bg-secondary/10"
                          />
                        </div>
                        <div
                          className="text-sm font-bold text-center line-clamp-1 transition-colors"
                          style={{
                            fontFamily: 'var(--font-heading)',
                            color: winnerTeam === 'team2' && isCompleted ? '#22C55E'
                              : isCompleted && winnerTeam === 'team1' ? '#3A5570'
                              : '#E8EDF5',
                          }}
                        >
                          {match.team2}
                        </div>
                        {match.team2_score && (
                          <div
                            className="scoreboard-num text-xs px-2.5 py-0.5 rounded"
                            style={{
                              background: winnerTeam === 'team2' ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                              color: winnerTeam === 'team2' ? '#22C55E' : '#4A5F75',
                              border: `1px solid ${winnerTeam === 'team2' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)'}`,
                            }}
                          >
                            {match.team2_score}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      className="mt-4 pt-4 flex items-center justify-center gap-2.5"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: isUpcoming ? '#4A5F75' : '#3A5570', fontSize: '0.8125rem' }}
                    >
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      <span>{format(new Date(match.match_date), 'MMM d')}</span>
                      <span className="w-0.5 h-0.5 rounded-full" style={{ background: '#2A3F55' }} />
                      <span>{match.match_time}</span>
                      {match.venue && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full" style={{ background: '#2A3F55' }} />
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[80px]">{match.venue}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
