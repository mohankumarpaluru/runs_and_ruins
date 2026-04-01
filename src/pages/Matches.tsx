import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { TeamLogo } from '../components/TeamLogo';

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
    stage: 'Group Stage'
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'settled': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'scheduled') return 'Upcoming';
    if (status === 'completed') return 'Completed';
    if (status === 'settled') return 'Completed';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

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
        status: 'scheduled'
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Matches</h1>
        <Button onClick={() => setIsAdding(!isAdding)} className="bg-primary hover:bg-primary/90 text-white">
          {isAdding ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {isAdding ? 'Cancel' : 'Add Match'}
        </Button>
      </div>

      {isAdding && (
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Add New Match</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Match Number *</label>
                  <Input
                    type="number"
                    placeholder="e.g. 1"
                    value={newMatch.match_no}
                    onChange={(e) => setNewMatch({...newMatch, match_no: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Date *</label>
                  <Input
                    type="date"
                    value={newMatch.match_date}
                    onChange={(e) => setNewMatch({...newMatch, match_date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Team 1 *</label>
                  <Input
                    placeholder="e.g. CSK"
                    value={newMatch.team1}
                    onChange={(e) => setNewMatch({...newMatch, team1: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Team 2 *</label>
                  <Input
                    placeholder="e.g. MI"
                    value={newMatch.team2}
                    onChange={(e) => setNewMatch({...newMatch, team2: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Time</label>
                  <Input
                    type="time"
                    value={newMatch.match_time}
                    onChange={(e) => setNewMatch({...newMatch, match_time: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Venue</label>
                  <Input
                    placeholder="e.g. Wankhede Stadium"
                    value={newMatch.venue}
                    onChange={(e) => setNewMatch({...newMatch, venue: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                  Save Match
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => (
          <Link key={match.id} to={`/matches/${match.id}`} className="block group">
            <Card className="h-full border-border group-hover:border-primary/50 transition-all duration-300">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                    Match {match.match_no}
                  </Badge>
                  <Badge variant="outline" className={cn("font-medium", getStatusColor(match.status))}>
                    {getStatusLabel(match.status)}
                  </Badge>
                </div>

                <div className="flex-1 flex flex-row justify-between items-center py-4 space-x-4">
                  <div className="flex flex-col items-center flex-1">
                    <TeamLogo team={match.team1} className="w-12 h-12 text-lg mb-2" fallbackColorClass="text-primary bg-primary/20" />
                    <div className="text-sm md:text-base font-bold text-center text-foreground line-clamp-2">{match.team1}</div>
                  </div>
                  
                  <div className="px-3 py-1 rounded-full bg-surface border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">VS</div>
                  
                  <div className="flex flex-col items-center flex-1">
                    <TeamLogo team={match.team2} className="w-12 h-12 text-lg mb-2" fallbackColorClass="text-secondary bg-secondary/20" />
                    <div className="text-sm md:text-base font-bold text-center text-foreground line-clamp-2">{match.team2}</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground font-medium">
                  <div>{format(new Date(match.match_date), 'MMM d')} &middot; {match.match_time}</div>
                  <div className="truncate max-w-full">{match.venue}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {matches.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-surface/30 rounded-2xl border border-border border-dashed">
            No matches available
          </div>
        )}
      </div>
    </div>
  );
}
