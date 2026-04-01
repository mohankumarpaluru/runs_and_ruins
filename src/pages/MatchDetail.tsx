import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trophy, Save, X, Trash2, Undo2, Edit2 } from 'lucide-react';
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
  const [newBet, setNewBet] = useState<Partial<MatchBet>>({
    participant_id: '',
    predicted_winner: '',
    amount: 0,
  });
  const [winner, setWinner] = useState<string>('');
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');

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
      setWinner(match.winner || '');
      setTeam1Score(match.team1_score || '');
      setTeam2Score(match.team2_score || '');
    }
    if (match) {
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

  if (!match) return <div className="text-muted-foreground text-center py-12">Match not found.</div>;

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
      const { error } = await supabase.from('match_bets').insert([
        {
          match_id: match.id,
          participant_id: newBet.participant_id,
          predicted_winner: newBet.predicted_winner,
          amount: newBet.amount,
          result: 'pending',
          profit_loss: 0,
        },
      ]);

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
    if (!winner) {
      toast.error('Please select a winner');
      return;
    }

    try {
      // 1. Update match winner and status
      const { error: matchError } = await supabase
        .from('matches')
        .update({ winner, status: 'completed', team1_score: team1Score || null, team2_score: team2Score || null })
        .eq('id', match.id);

      if (matchError) throw matchError;

      // 2. Update all bets for this match
      const updates = bets.map((bet) => {
        const isWin = bet.predicted_winner === winner;
        return {
          ...bet,
          result: isWin ? 'win' : 'loss',
          profit_loss: isWin ? bet.amount : -bet.amount,
        };
      });

      if (updates.length > 0) {
        const { error: betsError } = await supabase.from('match_bets').upsert(updates);
        if (betsError) throw betsError;
      }

      toast.success('Match settled successfully');
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

      const updates = bets.map((bet) => ({
        ...bet,
        result: 'pending',
        profit_loss: 0,
      }));

      if (updates.length > 0) {
        const { error: betsError } = await supabase.from('match_bets').upsert(updates);
        if (betsError) throw betsError;
      }

      toast.success('Match reopened successfully');
      setWinner('');
      setTeam1Score('');
      setTeam2Score('');
      await Promise.all([fetchMatches(), fetchMatchBets()]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reopen match');
    }
  };

  const handleDeleteBet = async (betId: string) => {
    if (!window.confirm('Are you sure you want to delete this bet?')) return;
    try {
      const { error } = await supabase.from('match_bets').delete().eq('id', betId);
      if (error) throw error;
      toast.success('Bet deleted successfully');
      await fetchMatchBets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete bet');
    }
  };

  const handleDeleteMatch = async () => {
    if (!window.confirm('Are you sure you want to delete this match? All associated bets will also be deleted.')) return;
    try {
      const { error } = await supabase.from('matches').delete().eq('id', match.id);
      if (error) throw error;
      toast.success('Match deleted successfully');
      navigate('/matches');
      await fetchMatches();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete match');
    }
  };

  const handleUpdateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('matches')
        .update(editMatchData)
        .eq('id', match.id);

      if (error) throw error;
      toast.success('Match updated successfully');
      setIsEditingMatch(false);
      await fetchMatches();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update match');
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-success bg-success/10 border-success/20';
      case 'loss': return 'text-danger bg-danger/10 border-danger/20';
      default: return 'text-muted-foreground bg-surface border-white/10';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/matches')} className="hover:bg-white/5 text-muted-foreground hover:text-foreground rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Match Details</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsEditingMatch(!isEditingMatch)} className="hover:bg-white/10 text-muted-foreground hover:text-foreground rounded-full">
            <Edit2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDeleteMatch} className="hover:bg-danger/10 text-muted-foreground hover:text-danger rounded-full">
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {isEditingMatch && (
        <Card className="glass-card overflow-hidden border-primary/20">
          <CardHeader className="bg-surface/30 border-b border-white/5">
            <CardTitle className="text-lg font-medium text-foreground">Edit Match</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleUpdateMatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Match Number</label>
                  <Input
                    type="number"
                    required
                    value={editMatchData.match_no || ''}
                    onChange={(e) => setEditMatchData({ ...editMatchData, match_no: parseInt(e.target.value) })}
                    className="bg-surface border-white/5 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <Input
                    type="date"
                    required
                    value={editMatchData.match_date || ''}
                    onChange={(e) => setEditMatchData({ ...editMatchData, match_date: e.target.value })}
                    className="bg-surface border-white/5 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Team 1</label>
                  <Input
                    required
                    value={editMatchData.team1 || ''}
                    onChange={(e) => setEditMatchData({ ...editMatchData, team1: e.target.value })}
                    className="bg-surface border-white/5 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Team 2</label>
                  <Input
                    required
                    value={editMatchData.team2 || ''}
                    onChange={(e) => setEditMatchData({ ...editMatchData, team2: e.target.value })}
                    className="bg-surface border-white/5 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Time</label>
                  <Input
                    type="time"
                    value={editMatchData.match_time || ''}
                    onChange={(e) => setEditMatchData({ ...editMatchData, match_time: e.target.value })}
                    className="bg-surface border-white/5 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Venue</label>
                  <Input
                    value={editMatchData.venue || ''}
                    onChange={(e) => setEditMatchData({ ...editMatchData, venue: e.target.value })}
                    className="bg-surface border-white/5 focus-visible:ring-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsEditingMatch(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Match Info */}
        <Card className="lg:col-span-2 glass-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-surface/30 border-b border-white/5">
            <CardTitle className="text-lg font-medium text-foreground">Match {match.match_no}</CardTitle>
            <Badge variant="outline" className={`border-transparent ${match.status === 'completed' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
              {match.status.toUpperCase()}
            </Badge>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 py-6">
              <div className="flex flex-col items-center flex-1">
                <TeamLogo team={match.team1} className="w-16 h-16 text-2xl mb-3" fallbackColorClass="text-primary bg-primary/20" />
                <div className="text-2xl md:text-3xl font-bold text-center text-foreground">{match.team1}</div>
                {match.team1_score && <div className="mt-2 font-mono text-lg text-foreground bg-surface/50 border border-white/5 px-3 py-1 rounded-md">{match.team1_score}</div>}
              </div>
              
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="text-sm font-bold text-muted-foreground bg-surface px-4 py-2 rounded-full border border-white/5 uppercase tracking-widest">VS</div>
              </div>
              
              <div className="flex flex-col items-center flex-1">
                <TeamLogo team={match.team2} className="w-16 h-16 text-2xl mb-3" fallbackColorClass="text-secondary bg-secondary/20" />
                <div className="text-2xl md:text-3xl font-bold text-center text-foreground">{match.team2}</div>
                {match.team2_score && <div className="mt-2 font-mono text-lg text-foreground bg-surface/50 border border-white/5 px-3 py-1 rounded-md">{match.team2_score}</div>}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground mt-6 pt-6 border-t border-white/5 gap-2">
              <div className="flex items-center gap-2">
                <span>{new Date(match.match_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span>•</span>
                <span>{match.match_time}</span>
              </div>
              <span className="bg-surface/50 px-3 py-1 rounded-full border border-white/5">{match.venue}</span>
            </div>
          </CardContent>
        </Card>

        {/* Settlement Panel */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="bg-surface/30 border-b border-white/5">
            <CardTitle className="text-lg font-medium flex items-center gap-2 text-foreground">
              <Trophy className="w-5 h-5 text-warning" />
              Settle Match
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">{match.team1} Score (Optional)</label>
                <Input
                  placeholder="e.g. 185/4 (20.0)"
                  value={team1Score}
                  onChange={(e) => setTeam1Score(e.target.value)}
                  disabled={match.status === 'completed'}
                  className="bg-surface/50 border-white/5 focus-visible:ring-primary h-12"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">{match.team2} Score (Optional)</label>
                <Input
                  placeholder="e.g. 180/8 (20.0)"
                  value={team2Score}
                  onChange={(e) => setTeam2Score(e.target.value)}
                  disabled={match.status === 'completed'}
                  className="bg-surface/50 border-white/5 focus-visible:ring-primary h-12"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Select Winner</label>
              <Select value={winner} onValueChange={setWinner} disabled={match.status === 'completed'}>
                <SelectTrigger className="bg-surface/50 border-white/5 focus:ring-primary h-12">
                  <SelectValue placeholder="Select winning team">
                    {winner === 'team1' ? match.team1 : winner === 'team2' ? match.team2 : "Select winning team"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-surface border-white/10">
                  <SelectItem value="team1" className="focus:bg-primary/20 focus:text-primary">{match.team1}</SelectItem>
                  <SelectItem value="team2" className="focus:bg-primary/20 focus:text-primary">{match.team2}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              {match.status === 'completed' ? (
                <Button 
                  variant="outline"
                  className="w-full border-white/10 hover:bg-white/5 text-muted-foreground h-12 text-base font-medium" 
                  onClick={handleReopenMatch}
                >
                  <Undo2 className="w-5 h-5 mr-2" />
                  Reopen Match
                </Button>
              ) : (
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-medium" 
                  onClick={handleSetWinner}
                  disabled={!winner}
                >
                  <Save className="w-5 h-5 mr-2" />
                  Settle Bets
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bets List */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-surface/30 border-b border-white/5">
          <CardTitle className="text-lg font-medium text-foreground">Participant Bets</CardTitle>
          {match.status === 'scheduled' && (
            <Button onClick={() => setIsAddingBet(true)} size="sm" className="bg-surface hover:bg-white/10 text-foreground border border-white/10">
              <Plus className="w-4 h-4 mr-2" />
              Add Bet
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isAddingBet && (
            <div className="p-4 bg-surface/50 border-b border-white/5">
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="space-y-2 w-full sm:flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Participant</label>
                  <Select value={newBet.participant_id} onValueChange={(v) => setNewBet({ ...newBet, participant_id: v })}>
                    <SelectTrigger className="bg-surface border-white/5 focus:ring-primary">
                      <SelectValue placeholder="Select participant">
                        {participants.find(p => p.id === newBet.participant_id)?.name || "Select participant"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-white/10">
                      {participants.filter(p => p.is_active).map((p) => (
                        <SelectItem key={p.id} value={p.id} className="focus:bg-primary/20 focus:text-primary">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 w-full sm:flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Predicted Winner</label>
                  <Select value={newBet.predicted_winner} onValueChange={(v) => setNewBet({ ...newBet, predicted_winner: v })}>
                    <SelectTrigger className="bg-surface border-white/5 focus:ring-primary">
                      <SelectValue placeholder="Select team">
                        {newBet.predicted_winner === 'team1' ? match.team1 : newBet.predicted_winner === 'team2' ? match.team2 : "Select team"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-white/10">
                      <SelectItem value="team1" className="focus:bg-primary/20 focus:text-primary">{match.team1}</SelectItem>
                      <SelectItem value="team2" className="focus:bg-primary/20 focus:text-primary">{match.team2}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 w-full sm:w-32">
                  <label className="text-xs font-medium text-muted-foreground">Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newBet.amount || ''}
                    onChange={(e) => setNewBet({ ...newBet, amount: Number(e.target.value) })}
                    className="bg-surface border-white/5 focus-visible:ring-primary"
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                  <Button onClick={handleAddBet} className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white">Save</Button>
                  <Button variant="outline" size="icon" onClick={() => setIsAddingBet(false)} className="border-white/10 hover:bg-white/5 text-muted-foreground">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-surface/50">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">Participant</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Predicted Team</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Amount</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">Result</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">P/L</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bets.length === 0 ? (
                  <TableRow className="border-white/5">
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No bets placed yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  bets.map((bet) => {
                    const participant = participants.find((p) => p.id === bet.participant_id);
                    return (
                      <TableRow key={bet.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0", getAvatarColor(participant?.name || ''))}>
                              {participant?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            {participant?.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {bet.predicted_winner === 'team1' ? match.team1 : bet.predicted_winner === 'team2' ? match.team2 : bet.predicted_winner}
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">₹{bet.amount}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={getResultColor(bet.result)}>
                            {bet.result.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-bold font-mono ${bet.profit_loss > 0 ? 'text-success' : bet.profit_loss < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                          {bet.profit_loss > 0 ? '+' : ''}{bet.profit_loss}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteBet(bet.id)} className="hover:bg-danger/10 text-muted-foreground hover:text-danger h-8 w-8 rounded-full">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {bets.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No bets placed yet.
              </div>
            ) : (
              bets.map((bet) => {
                const participant = participants.find((p) => p.id === bet.participant_id);
                return (
                  <div key={bet.id} className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0", getAvatarColor(participant?.name || ''))}>
                          {participant?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        {participant?.name}
                      </div>
                      <Badge variant="outline" className={getResultColor(bet.result)}>
                        {bet.result.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-muted-foreground">
                        Predicted: <span className="text-foreground font-medium">
                          {bet.predicted_winner === 'team1' ? match.team1 : bet.predicted_winner === 'team2' ? match.team2 : bet.predicted_winner}
                        </span>
                      </div>
                      <div className="font-mono text-foreground">Amount: ₹{bet.amount}</div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-sm text-muted-foreground">P/L</span>
                      <div className="flex items-center gap-4">
                        <span className={`font-bold font-mono ${bet.profit_loss > 0 ? 'text-success' : bet.profit_loss < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                          {bet.profit_loss > 0 ? '+' : ''}{bet.profit_loss}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBet(bet.id)} className="hover:bg-danger/10 text-muted-foreground hover:text-danger h-8 w-8 rounded-full">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Side Bets Section */}
      {sideBets.length > 0 && (
        <Card className="bg-surface/50 border-white/10 overflow-hidden mt-6">
          <CardHeader className="border-b border-white/5 bg-surface/80">
            <CardTitle className="text-lg font-medium text-foreground">Linked Side Bets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-surface/50">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium">Bet Title</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Date</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Winner</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Loser</TableHead>
                    <TableHead className="text-right text-muted-foreground font-medium">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sideBets.map((bet) => {
                    const winner = participants.find((p) => p.id === bet.winner_participant_id);
                    const loser = participants.find((p) => p.id === bet.loser_participant_id);
                    return (
                      <TableRow key={bet.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="font-medium text-foreground">{bet.title}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {bet.bet_date ? new Date(bet.bet_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-success font-medium">{winner?.name}</TableCell>
                        <TableCell className="text-danger font-medium">{loser?.name}</TableCell>
                        <TableCell className="text-right font-mono font-bold">₹{bet.amount}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col divide-y divide-white/5">
              {sideBets.map((bet) => {
                const winner = participants.find((p) => p.id === bet.winner_participant_id);
                const loser = participants.find((p) => p.id === bet.loser_participant_id);
                return (
                  <div key={bet.id} className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-col gap-1">
                      <div className="font-bold text-foreground">{bet.title}</div>
                      {bet.bet_date && (
                        <div className="text-xs text-muted-foreground">Date: {new Date(bet.bet_date).toLocaleDateString()}</div>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-muted-foreground">
                        Winner: <span className="text-success font-medium">{winner?.name}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Loser: <span className="text-danger font-medium">{loser?.name}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="font-bold font-mono text-foreground">₹{bet.amount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
