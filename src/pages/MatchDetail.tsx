import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trophy, Save, X, Trash2, Undo2, Edit2, ArrowUp, ArrowDown, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { MatchBet, Match } from '../types';
import { cn, getAvatarColor } from '../lib/utils';
import { TeamLogo } from '../components/TeamLogo';

export function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { matches, participants, matchBets, miscBets, betAmountRules, fetchMatchBets, fetchMatches, fetchMiscBets } = useStore();

  const match = matches.find((m) => m.id === id);
  const bets = matchBets.filter((b) => b.match_id === id);
  const sideBets = miscBets.filter((b) => b.match_id === id);

  const [isAddingBet, setIsAddingBet] = useState(false);
  const [isEditingMatch, setIsEditingMatch] = useState(false);
  const [editMatchData, setEditMatchData] = useState<Partial<Match>>({});
  const [newBet, setNewBet] = useState<Partial<MatchBet>>({ participant_id: '', predicted_winner: '', amount: 0 });
  const [editingBetId, setEditingBetId] = useState<string | null>(null);
  const [editBetData, setEditBetData] = useState<Partial<MatchBet>>({});
  const [winner, setWinner] = useState<string>('');
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');

  // Confirmation states
  const [confirmDeleteMatch, setConfirmDeleteMatch] = useState(false);
  const [confirmDeleteBetId, setConfirmDeleteBetId] = useState<string | null>(null);
  const [confirmTimer, setConfirmTimer] = useState<NodeJS.Timeout | null>(null);

  // Collapsible sections
  const [isParticipantBetsExpanded, setIsParticipantBetsExpanded] = useState(true);
  const [isSideBetsExpanded, setIsSideBetsExpanded] = useState(true);

  const suggestedAmount = useMemo(() => {
    if (!match) return 0;
    const applicableRules = betAmountRules.filter(
      (r) => r.teams.includes(match.team1) || r.teams.includes(match.team2)
    );
    if (applicableRules.length > 0) {
      return applicableRules.sort((a, b) => a.priority - b.priority)[0].amount;
    }
    const defaultRule = betAmountRules.find((r) => r.is_default);
    return defaultRule ? defaultRule.amount : 100;
  }, [match, betAmountRules]);

  useEffect(() => {
    if (isAddingBet && newBet.amount === 0) {
      setNewBet((prev) => ({ ...prev, amount: suggestedAmount }));
    }
  }, [isAddingBet, suggestedAmount, newBet.amount]);

  useEffect(() => {
    if (match) {
      setWinner(match.status === 'cancelled' ? 'cancelled' : match.winner || '');
      setTeam1Score(match.team1_score || '');
      setTeam2Score(match.team2_score || '');
      setEditMatchData({
        match_no: match.match_no,
        team1: match.team1,
        team2: match.team2,
        match_date: match.match_date,
        match_time: match.match_time,
        venue: match.venue,
      });
    }
  }, [match]);

  if (!match) return (
    <div className="empty-state mt-12">
      <Trophy className="w-10 h-10" style={{ color: '#2A3F55' }} />
      <p style={{ color: '#4A5F75' }}>Match not found.</p>
    </div>
  );

  const handleAddBet = async () => {
    if (!newBet.participant_id || !newBet.predicted_winner || !newBet.amount) {
      toast.error('Please fill all fields');
      return;
    }
    const existingBet = bets.find((b) => b.participant_id === newBet.participant_id);
    if (existingBet) {
      toast.error('Participant already has a bet for this match');
      return;
    }
    try {
      const isCompleted = match.status === 'completed' || match.status === 'settled';
      const result = isCompleted && match.winner ? (newBet.predicted_winner === match.winner ? 'win' : 'loss') : 'pending';
      const profit_loss = result === 'pending' ? 0 : (result === 'win' ? newBet.amount! : -newBet.amount!);

      const { error } = await supabase.from('match_bets').insert([{
        match_id: match.id,
        participant_id: newBet.participant_id,
        predicted_winner: newBet.predicted_winner,
        amount: newBet.amount,
        result,
        profit_loss,
      }]);
      if (error) throw error;
      toast.success('Bet added successfully');
      setIsAddingBet(false);
      setNewBet({ participant_id: '', predicted_winner: '', amount: suggestedAmount });
      await fetchMatchBets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add bet');
    }
  };

  const handleSetWinner = async () => {
    if (!winner) { toast.error('Please select a winner'); return; }

    const hasPendingSideBets = sideBets.some(sb => sb.status === 'pending');
    if (hasPendingSideBets) {
      toast.error('You have unresolved side bets for this match. Please settle them in the Side Bets tab before finalizing the match result.');
      return;
    }

    const isCancelled = winner === 'cancelled';
    const finalStatus = isCancelled ? 'cancelled' : 'completed';

    try {
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          winner: isCancelled ? null : winner,
          status: finalStatus,
          team1_score: team1Score || null,
          team2_score: team2Score || null
        })
        .eq('id', match.id);
      if (matchError) throw matchError;

      const updates = bets.map((bet) => {
        if (isCancelled) {
          return { ...bet, result: 'pending', profit_loss: 0 };
        }
        const isWin = bet.predicted_winner === winner;
        return { ...bet, result: isWin ? 'win' : 'loss', profit_loss: isWin ? bet.amount : -bet.amount };
      });
      if (updates.length > 0) {
        const { error: betsError } = await supabase.from('match_bets').upsert(updates);
        if (betsError) throw betsError;
      }
      toast.success(isCancelled ? 'Match marked as No Result' : 'Match settled successfully');
      await Promise.all([fetchMatches(), fetchMatchBets()]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to settle match');
    }
  };

  const handleReopenMatch = async () => {
    try {
      const { error: matchError } = await supabase
        .from('matches')
        .update({ winner: null, status: 'scheduled', team1_score: null, team2_score: null })
        .eq('id', match.id);
      if (matchError) throw matchError;

      const updates = bets.map((bet) => ({ ...bet, result: 'pending', profit_loss: 0 }));
      if (updates.length > 0) {
        const { error: betsError } = await supabase.from('match_bets').upsert(updates);
        if (betsError) throw betsError;
      }
      toast.success('Match reopened successfully');
      setWinner(''); setTeam1Score(''); setTeam2Score('');
      await Promise.all([fetchMatches(), fetchMatchBets()]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reopen match');
    }
  };

  const handleUpdateBet = async () => {
    if (!editingBetId || !editBetData.predicted_winner || !editBetData.amount) return;
    try {
      const isCompleted = match.status === 'completed' || match.status === 'settled';
      const result = isCompleted && match.winner ? (editBetData.predicted_winner === match.winner ? 'win' : 'loss') : 'pending';
      const profit_loss = result === 'pending' ? 0 : (result === 'win' ? editBetData.amount : -editBetData.amount);

      const { error } = await supabase.from('match_bets').update({
        predicted_winner: editBetData.predicted_winner,
        amount: editBetData.amount,
        result,
        profit_loss
      }).eq('id', editingBetId);

      if (error) throw error;
      toast.success('Bet updated');
      setEditingBetId(null);
      await fetchMatchBets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update bet');
    }
  };

  const handleDeleteBet = async (betId: string) => {
    if (confirmDeleteBetId !== betId) {
      setConfirmDeleteBetId(betId);
      if (confirmTimer) clearTimeout(confirmTimer);
      const timer = setTimeout(() => setConfirmDeleteBetId(null), 3000);
      setConfirmTimer(timer);
      return;
    }

    try {
      const betToDelete = bets.find(b => b.id === betId);
      let query = supabase.from('match_bets').delete();

      if (betToDelete) {
        query = query.eq('match_id', betToDelete.match_id);
      } else {
        query = query.eq('id', betId);
      }

      const { error } = await query;
      if (error) throw error;
      toast.success('Bets deleted');
      setConfirmDeleteBetId(null);
      await fetchMatchBets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete bet');
    }
  };

  const handleDeleteMatch = async () => {
    if (!confirmDeleteMatch) {
      setConfirmDeleteMatch(true);
      if (confirmTimer) clearTimeout(confirmTimer);
      const timer = setTimeout(() => setConfirmDeleteMatch(false), 3000);
      setConfirmTimer(timer);
      return;
    }

    try {
      const { error } = await supabase.from('matches').delete().eq('id', match.id);
      if (error) throw error;
      toast.success('Match deleted');
      navigate('/matches');
      await fetchMatches();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete match');
    }
  };

  const handleUpdateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('matches').update(editMatchData).eq('id', match.id);
      if (error) throw error;
      toast.success('Match updated');
      setIsEditingMatch(false);
      await fetchMatches();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update match');
    }
  };

  const isCompleted = match.status === 'completed' || match.status === 'settled' || match.status === 'cancelled';

  return (
    <div className="space-y-6 page-enter">
      {/* Back nav + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/matches')}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#7A90A8' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="section-header text-2xl md:text-3xl">Match {match.match_no}</h1>
            <p className="section-meta">{match.team1} vs {match.team2}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEditingMatch(!isEditingMatch)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#7A90A8' }}
            title="Edit match"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDeleteMatch}
            className={cn(
              "h-8 rounded-full flex items-center justify-center transition-all duration-200 px-2 gap-1.5",
              confirmDeleteMatch
                ? "bg-red-500 text-white w-auto"
                : "w-8 bg-white/[0.04] text-[#7A90A8]"
            )}
            style={!confirmDeleteMatch ? {
              background: 'rgba(255,255,255,0.04)',
              color: '#7A90A8'
            } : undefined}
            onMouseEnter={e => { if (!confirmDeleteMatch) { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#EF4444'; } }}
            onMouseLeave={e => { if (!confirmDeleteMatch) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#7A90A8'; } }}
            title={confirmDeleteMatch ? "Confirm Delete" : "Delete match"}
          >
            {confirmDeleteMatch ? (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Confirm?</span>
              </>
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Edit Match Form */}
      {isEditingMatch && (
        <div className="form-action-card p-5 animate-in slide-in-from-top-4 duration-300">
          <h2 className="section-header text-sm mb-4">Edit Match</h2>
          <form onSubmit={handleUpdateMatch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Match Number', type: 'number', field: 'match_no', val: editMatchData.match_no, onChange: (v: string) => setEditMatchData({ ...editMatchData, match_no: parseInt(v) }) },
              { label: 'Date', type: 'date', field: 'match_date', val: editMatchData.match_date, onChange: (v: string) => setEditMatchData({ ...editMatchData, match_date: v }) },
              { label: 'Team 1', type: 'text', field: 'team1', val: editMatchData.team1, onChange: (v: string) => setEditMatchData({ ...editMatchData, team1: v }) },
              { label: 'Team 2', type: 'text', field: 'team2', val: editMatchData.team2, onChange: (v: string) => setEditMatchData({ ...editMatchData, team2: v }) },
              { label: 'Time', type: 'time', field: 'match_time', val: editMatchData.match_time, onChange: (v: string) => setEditMatchData({ ...editMatchData, match_time: v }) },
              { label: 'Venue', type: 'text', field: 'venue', val: editMatchData.venue, onChange: (v: string) => setEditMatchData({ ...editMatchData, venue: v }) },
            ].map(({ label, type, field, val, onChange }) => (
              <div key={field} className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#4A5F75', fontFamily: 'var(--font-heading)' }}>{label}</label>
                <Input type={type} required value={val || ''} onChange={(e) => onChange(e.target.value)} className="bg-surface-light border-border/60 focus-visible:ring-primary/40 h-10" />
              </div>
            ))}
            <div className="md:col-span-2 flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setIsEditingMatch(false)} className="text-muted-foreground">Cancel</Button>
              <button type="submit" className="action-btn-primary px-5 py-2 text-sm">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* Match Header + Settle Panel */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Rivalry Header */}
        <div className="lg:col-span-2 rr-card overflow-hidden">
          {/* Status bar */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className="section-meta">Match {match.match_no}</span>
            <span className={isCompleted ? 'status-pill status-pill--completed' : 'status-pill status-pill--upcoming'}>
              {match.status.toUpperCase()}
            </span>
          </div>

          {/* Teams */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
              {/* Team 1 */}
              <div
                className={cn('flex flex-col items-center flex-1 gap-3', isCompleted && match.winner === 'team2' && 'opacity-40')}
              >
                <div className="relative">
                  <TeamLogo team={match.team1} className="w-16 h-16 text-2xl" fallbackColorClass="text-primary bg-primary/10" />
                  {match.winner === 'team1' && (
                    <div
                      className="absolute -top-1 -right-1 p-1 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.5)' }}
                    >
                      <Trophy className="w-3 h-3" style={{ color: '#22C55E' }} />
                    </div>
                  )}
                </div>
                <div
                  className="text-2xl md:text-3xl font-bold text-center"
                  style={{ fontFamily: 'var(--font-heading)', color: match.winner === 'team1' ? '#22C55E' : '#E8EDF5' }}
                >
                  {match.team1}
                </div>
                {match.team1_score && (
                  <div
                    className="scoreboard-num text-base px-4 py-1.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E8EDF5' }}
                  >
                    {match.team1_score}
                  </div>
                )}
              </div>

              {/* VS */}
              <div className="vs-divider shrink-0">
                <div className="vs-badge text-xs">VS</div>
              </div>

              {/* Team 2 */}
              <div
                className={cn('flex flex-col items-center flex-1 gap-3', isCompleted && match.winner === 'team1' && 'opacity-40')}
              >
                <div className="relative">
                  <TeamLogo team={match.team2} className="w-16 h-16 text-2xl" fallbackColorClass="text-secondary bg-secondary/10" />
                  {match.winner === 'team2' && (
                    <div
                      className="absolute -top-1 -right-1 p-1 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.5)' }}
                    >
                      <Trophy className="w-3 h-3" style={{ color: '#22C55E' }} />
                    </div>
                  )}
                </div>
                <div
                  className="text-2xl md:text-3xl font-bold text-center"
                  style={{ fontFamily: 'var(--font-heading)', color: match.winner === 'team2' ? '#22C55E' : '#E8EDF5' }}
                >
                  {match.team2}
                </div>
                {match.team2_score && (
                  <div
                    className="scoreboard-num text-base px-4 py-1.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E8EDF5' }}
                  >
                    {match.team2_score}
                  </div>
                )}
              </div>
            </div>

            {/* Match meta */}
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 pt-4 text-xs"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#4A5F75' }}
            >
              <span>{new Date(match.match_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {match.match_time}</span>
              <span
                className="px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {match.venue}
              </span>
            </div>
          </div>
        </div>

        {/* Settle Panel */}
        <div className="form-action-card overflow-hidden" style={{ borderLeft: '4px solid #F5A524', borderColor: 'rgba(245,165,36,0.4)' }}>
          <div
            className="px-5 py-3 flex items-center gap-2"
            style={{ background: 'rgba(245,165,36,0.04)', borderBottom: '1px solid rgba(245,165,36,0.1)' }}
          >
            <Trophy className="w-4 h-4" style={{ color: '#F5A524' }} />
            <span className="section-header text-base">Settle Match</span>
          </div>
          <div className="p-5 space-y-4">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#4A5F75', fontFamily: 'var(--font-heading)' }}>
                  {match.team1} Score
                </label>
                <Input
                  placeholder="e.g. 185/4"
                  value={team1Score}
                  onChange={(e) => setTeam1Score(e.target.value)}
                  disabled={isCompleted}
                  className="bg-surface-light border-border/60 focus-visible:ring-primary/40 h-10 scoreboard-num"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#4A5F75', fontFamily: 'var(--font-heading)' }}>
                  {match.team2} Score
                </label>
                <Input
                  placeholder="e.g. 180/8"
                  value={team2Score}
                  onChange={(e) => setTeam2Score(e.target.value)}
                  disabled={isCompleted}
                  className="bg-surface-light border-border/60 focus-visible:ring-primary/40 h-10 scoreboard-num"
                />
              </div>
            </div>

            {/* Select winner */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#4A5F75', fontFamily: 'var(--font-heading)' }}>
                Winner
              </label>
              <Select value={winner} onValueChange={setWinner} disabled={isCompleted}>
                <SelectTrigger className="bg-surface-light border-border/60 focus:ring-primary/40 h-10">
                  <SelectValue placeholder="Select winning team">
                    {winner === 'team1' ? match.team1 : winner === 'team2' ? match.team2 : winner === 'cancelled' ? 'No Result (Cancelled)' : 'Select winning team'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border/60">
                  <SelectItem value="team1" className="focus:bg-primary/10 focus:text-primary">{match.team1}</SelectItem>
                  <SelectItem value="team2" className="focus:bg-primary/10 focus:text-primary">{match.team2}</SelectItem>
                  <SelectItem value="cancelled" className="focus:bg-primary/10 focus:text-amber-500">No Result (Cancelled)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action button */}
            {isCompleted ? (
              <button
                onClick={handleReopenMatch}
                className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#7A90A8',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                <Undo2 className="w-4 h-4" />
                Reopen Match
              </button>
            ) : (
              <button
                onClick={handleSetWinner}
                disabled={!winner}
                className="action-btn-amber w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Settle Bets
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Participant Bets */}
      <div className="rr-card overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsParticipantBetsExpanded(v => !v)}
          className="w-full px-5 py-3.5 flex items-center justify-between cursor-pointer transition-colors duration-200 text-left"
          style={{ background: isParticipantBetsExpanded ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-3">
            <span className="section-header text-lg">Participant Bets</span>
            {!isParticipantBetsExpanded && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: '#7A90A8' }}>
                {bets.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {match.status === 'scheduled' && isParticipantBetsExpanded && (
              <div
                onClick={(e) => { e.stopPropagation(); setIsAddingBet(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{
                  background: 'rgba(0,212,200,0.08)',
                  border: '1px solid rgba(0,212,200,0.2)',
                  color: '#00D4C8',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Bet
              </div>
            )}
            <div className="w-6 h-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }}>
              {isParticipantBetsExpanded ? <ChevronUp size={14} style={{ color: '#4A5F75' }} /> : <ChevronDown size={14} style={{ color: '#4A5F75' }} />}
            </div>
          </div>
        </button>

        {isParticipantBetsExpanded && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            {/* Add Bet form */}
            {isAddingBet && (
              <div
                className="p-4 animate-in slide-in-from-top-2 duration-200"
                style={{ background: 'rgba(0,212,200,0.03)', borderBottom: '1px solid rgba(0,212,200,0.1)' }}
              >
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="space-y-1.5 flex-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#4A5F75', fontFamily: 'var(--font-heading)' }}>Participant</label>
                    <Select value={newBet.participant_id} onValueChange={(v) => setNewBet({ ...newBet, participant_id: v })}>
                      <SelectTrigger className="bg-surface-light border-border/60 h-9 text-sm">
                        <SelectValue placeholder="Select participant">
                          {participants.find(p => p.id === newBet.participant_id)?.name || 'Select participant'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-surface-raised border-border/60">
                        {participants.filter(p => p.is_active).map((p) => (
                          <SelectItem key={p.id} value={p.id} className="focus:bg-primary/10 focus:text-primary">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#4A5F75', fontFamily: 'var(--font-heading)' }}>Predicted Winner</label>
                    <Select value={newBet.predicted_winner} onValueChange={(v) => setNewBet({ ...newBet, predicted_winner: v })}>
                      <SelectTrigger className="bg-surface-light border-border/60 h-9 text-sm">
                        <SelectValue placeholder="Select team">
                          {newBet.predicted_winner === 'team1' ? match.team1 : newBet.predicted_winner === 'team2' ? match.team2 : 'Select team'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-surface-raised border-border/60">
                        <SelectItem value="team1" className="focus:bg-primary/10 focus:text-primary">{match.team1}</SelectItem>
                        <SelectItem value="team2" className="focus:bg-primary/10 focus:text-primary">{match.team2}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 w-full sm:w-28">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#4A5F75', fontFamily: 'var(--font-heading)' }}>Amount (₹)</label>
                    <Input
                      type="number"
                      value={newBet.amount || ''}
                      onChange={(e) => setNewBet({ ...newBet, amount: Number(e.target.value) })}
                      className="bg-surface-light border-border/60 h-9 scoreboard-num"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddBet} className="action-btn-primary px-4 py-2 text-sm rounded-lg">Save</button>
                    <button
                      onClick={() => setIsAddingBet(false)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#7A90A8' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bets list */}
            {bets.length === 0 ? (
              <div className="empty-state m-4">
                <Trophy className="w-8 h-8" style={{ color: '#2A3F55' }} />
                <p className="text-sm" style={{ color: '#4A5F75' }}>No bets placed yet.</p>
              </div>
            ) : (
              <div>
                {/* Desktop header row */}
                <div
                  className="hidden md:grid grid-cols-[1fr_1fr_100px_80px_100px_48px] px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: '#4A5F75', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-heading)' }}
                >
                  <span>Participant</span>
                  <span>Predicted</span>
                  <span className="text-right">Amount</span>
                  <span className="text-center">Result</span>
                  <span className="text-right">P/L</span>
                  <span />
                </div>

                {bets.map((bet) => {
                  const participant = participants.find((p) => p.id === bet.participant_id);
                  const stripClass = bet.result === 'win' ? 'bet-strip--win' : bet.result === 'loss' ? 'bet-strip--loss' : 'bet-strip--pending';

                  return (
                    <div key={bet.id} className={cn('bet-strip p-4', stripClass)}>
                      {/* Desktop */}
                      <div className="hidden md:grid grid-cols-[1fr_1fr_100px_80px_100px_80px] items-center gap-3 w-full">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0', getAvatarColor(participant?.name || ''))}>
                            {participant?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="text-base font-semibold truncate" style={{ color: '#E8EDF5' }}>{participant?.name}</span>
                        </div>
                        {editingBetId === bet.id ? (
                          <Select value={editBetData.predicted_winner} onValueChange={(v) => setEditBetData({ ...editBetData, predicted_winner: v })}>
                            <SelectTrigger className="bg-surface-light border-border/60 h-8 text-sm px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface-raised border-border/60">
                              <SelectItem value="team1">{match.team1}</SelectItem>
                              <SelectItem value="team2">{match.team2}</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-base truncate" style={{ color: '#7A90A8' }}>
                            {bet.predicted_winner === 'team1' ? match.team1 : bet.predicted_winner === 'team2' ? match.team2 : bet.predicted_winner}
                          </span>
                        )}

                        {editingBetId === bet.id ? (
                          <Input
                            type="number"
                            value={editBetData.amount || ''}
                            onChange={(e) => setEditBetData({ ...editBetData, amount: Number(e.target.value) })}
                            className="bg-surface-light border-border/60 h-8 scoreboard-num px-2"
                          />
                        ) : (
                          <span className="text-right scoreboard-num text-base" style={{ color: '#E8EDF5' }}>₹{bet.amount}</span>
                        )}
                        <div className="flex justify-center">
                          <span className={cn('status-pill text-[10px]', `status-pill--${bet.result}`)}>
                            {bet.result.toUpperCase()}
                          </span>
                        </div>
                        <div className={cn('text-right scoreboard-num text-base font-bold', bet.profit_loss > 0 ? 'pl-positive' : bet.profit_loss < 0 ? 'pl-negative' : 'pl-neutral')}>
                          {bet.profit_loss > 0 ? '+' : ''}{bet.profit_loss}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          {editingBetId === bet.id ? (
                            <>
                              <button onClick={handleUpdateBet} className="action-btn-primary px-3 py-1.5 text-xs rounded-md">Save</button>
                              <button onClick={() => setEditingBetId(null)} className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 text-subtle ml-1">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setEditingBetId(bet.id); setEditBetData(bet); }}
                                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                                style={{ color: '#4A5F75' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#00D4C8'; e.currentTarget.style.background = 'rgba(0,212,200,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#4A5F75'; e.currentTarget.style.background = 'transparent'; }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteBet(bet.id)}
                                className={cn(
                                  "h-7 rounded-full flex items-center justify-center transition-all duration-200 px-2 gap-1.5",
                                  confirmDeleteBetId === bet.id
                                    ? "bg-red-500 text-white w-auto"
                                    : "w-7 text-[#4A5F75]"
                                )}
                                onMouseEnter={e => { if (confirmDeleteBetId !== bet.id) { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; } }}
                                onMouseLeave={e => { if (confirmDeleteBetId !== bet.id) { e.currentTarget.style.color = '#4A5F75'; e.currentTarget.style.background = 'transparent'; } }}
                              >
                                {confirmDeleteBetId === bet.id ? (
                                  <>
                                    <Trash2 className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase">Delete?</span>
                                  </>
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="md:hidden space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0', getAvatarColor(participant?.name || ''))}>
                              {participant?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="font-semibold" style={{ color: '#E8EDF5' }}>{participant?.name}</span>
                          </div>
                          <span className={cn('status-pill text-[10px]', `status-pill--${bet.result}`)}>
                            {bet.result.toUpperCase()}
                          </span>
                        </div>
                        {editingBetId === bet.id ? (
                          <div className="flex gap-2 w-full mt-2">
                            <Select value={editBetData.predicted_winner} onValueChange={(v) => setEditBetData({ ...editBetData, predicted_winner: v })}>
                              <SelectTrigger className="bg-surface-light border-border/60 h-8 text-xs flex-1 px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-surface-raised border-border/60">
                                <SelectItem value="team1">{match.team1}</SelectItem>
                                <SelectItem value="team2">{match.team2}</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={editBetData.amount || ''}
                              onChange={(e) => setEditBetData({ ...editBetData, amount: Number(e.target.value) })}
                              className="bg-surface-light border-border/60 h-8 scoreboard-num px-2 w-24"
                            />
                          </div>
                        ) : (
                          <div className="flex justify-between items-center text-xs w-full" style={{ color: '#7A90A8' }}>
                            <span>Predicted: <span style={{ color: '#E8EDF5' }}>{bet.predicted_winner === 'team1' ? match.team1 : bet.predicted_winner === 'team2' ? match.team2 : bet.predicted_winner}</span></span>
                            <span className="scoreboard-num">₹{bet.amount}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <span className="text-xs" style={{ color: '#4A5F75' }}>P/L</span>
                          <div className="flex items-center gap-3">
                            <span className={cn('scoreboard-num font-bold', bet.profit_loss > 0 ? 'pl-positive' : bet.profit_loss < 0 ? 'pl-negative' : 'pl-neutral')}>
                              {bet.profit_loss > 0 ? '+' : ''}{bet.profit_loss}
                            </span>
                            {editingBetId === bet.id ? (
                              <>
                                <button onClick={handleUpdateBet} className="action-btn-primary px-3 py-1 text-[10px] rounded flex-1">Save</button>
                                <button onClick={() => setEditingBetId(null)} className="px-3 py-1 text-[10px] rounded bg-white/5 text-subtle">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingBetId(bet.id); setEditBetData(bet); }} className="text-xs" style={{ color: '#00D4C8' }}>
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBet(bet.id)}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded transition-all",
                                    confirmDeleteBetId === bet.id ? "bg-red-500 text-white" : "text-[#EF4444]"
                                  )}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {confirmDeleteBetId === bet.id && <span className="text-[10px] font-bold uppercase">Confirm?</span>}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Linked Side Bets */}
      {sideBets.length > 0 && (
        <div className="rr-card overflow-hidden">
          <div
            className="px-5 py-3.5"
            style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className="section-header text-base">Linked Side Bets</span>
          </div>
          {sideBets.map((bet) => {
            const winner = participants.find((p) => p.id === bet.winner_participant_id);
            const loser = participants.find((p) => p.id === bet.loser_participant_id);
            return (
              <div key={bet.id} className="bet-strip bet-strip--win">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: '#E8EDF5' }}>{bet.title}</div>
                    <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: '#4A5F75' }}>
                      {bet.bet_date && <span>{new Date(bet.bet_date).toLocaleDateString()}</span>}
                      <span>
                        W: <span style={{ color: '#22C55E', fontWeight: 600 }}>{winner?.name}</span>
                      </span>
                      <span>
                        L: <span style={{ color: '#EF4444', fontWeight: 600 }}>{loser?.name}</span>
                      </span>
                    </div>
                  </div>
                  <span className="scoreboard-num text-sm font-bold shrink-0" style={{ color: '#E8EDF5' }}>
                    ₹{bet.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
