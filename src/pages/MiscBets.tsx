import { useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Receipt } from 'lucide-react';
import { MiscBet } from '../types';
import { cn } from '../lib/utils';

export function MiscBets() {
  const { miscBets, participants, matches, fetchMiscBets } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newBet, setNewBet] = useState<Partial<MiscBet>>({
    title: '',
    winner_participant_id: '',
    loser_participant_id: '',
    amount: 0,
    match_id: 'none',
    bet_date: '',
  });

  const handleAddBet = async () => {
    if (!newBet.title || !newBet.winner_participant_id || !newBet.loser_participant_id || !newBet.amount) {
      toast.error('Please fill all fields');
      return;
    }

    if (newBet.winner_participant_id === newBet.loser_participant_id) {
      toast.error('Winner and loser cannot be the same');
      return;
    }

    try {
      const { error } = await supabase.from('misc_bets').insert([
        {
          title: newBet.title,
          winner_participant_id: newBet.winner_participant_id,
          loser_participant_id: newBet.loser_participant_id,
          amount: newBet.amount,
          status: 'settled',
          match_id: newBet.match_id === 'none' ? null : newBet.match_id,
          bet_date: newBet.bet_date || null,
        },
      ]);

      if (error) throw error;
      toast.success('Side bet added successfully');
      setIsAdding(false);
      setNewBet({ title: '', winner_participant_id: '', loser_participant_id: '', amount: 0, match_id: 'none', bet_date: '' });
      await fetchMiscBets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add side bet');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Side Bets</h1>
        <Button onClick={() => setIsAdding(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Side Bet
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-6 animate-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              New Side Bet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Bet Title / Description"
                value={newBet.title}
                onChange={(e) => setNewBet({ ...newBet, title: e.target.value })}
                className="bg-background border-border"
              />
              <Select value={newBet.match_id || 'none'} onValueChange={(v) => setNewBet({ ...newBet, match_id: v })}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Link to Match (Optional)">
                    {newBet.match_id && newBet.match_id !== 'none' 
                      ? (() => {
                          const m = matches.find(m => m.id === newBet.match_id);
                          return m ? `Match ${m.match_no}: ${m.team1} vs ${m.team2}` : "Link to Match (Optional)";
                        })()
                      : "No Match Linked (General)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="none">No Match Linked (General)</SelectItem>
                  {matches.map((m) => (
                    <SelectItem key={m.id} value={m.id}>Match {m.match_no}: {m.team1} vs {m.team2}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={newBet.bet_date || ''}
                onChange={(e) => setNewBet({ ...newBet, bet_date: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={newBet.winner_participant_id} onValueChange={(v) => setNewBet({ ...newBet, winner_participant_id: v })}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Winner">
                    {participants.find(p => p.id === newBet.winner_participant_id)?.name || "Winner"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {participants.filter(p => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={newBet.loser_participant_id} onValueChange={(v) => setNewBet({ ...newBet, loser_participant_id: v })}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Loser">
                    {participants.find(p => p.id === newBet.loser_participant_id)?.name || "Loser"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {participants.filter(p => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Amount"
                value={newBet.amount || ''}
                onChange={(e) => setNewBet({ ...newBet, amount: Number(e.target.value) })}
                className="bg-background border-border"
              />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="ghost" onClick={() => setIsAdding(false)} className="hover:bg-surface">Cancel</Button>
              <Button onClick={handleAddBet} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Bet</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-surface/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Bet Title</th>
                  <th className="px-6 py-4 font-medium">Match</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Winner</th>
                  <th className="px-6 py-4 font-medium">Loser</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {miscBets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No side bets yet
                    </td>
                  </tr>
                ) : (
                  miscBets.map((bet) => {
                    const winner = participants.find((p) => p.id === bet.winner_participant_id);
                    const loser = participants.find((p) => p.id === bet.loser_participant_id);
                    const linkedMatch = matches.find((m) => m.id === bet.match_id);
                    return (
                      <tr key={bet.id} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{bet.title}</td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {linkedMatch ? `Match ${linkedMatch.match_no}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {bet.bet_date ? new Date(bet.bet_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-success font-medium">{winner?.name}</td>
                        <td className="px-6 py-4 text-danger font-medium">{loser?.name}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold">₹{bet.amount}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="bg-surface text-muted-foreground border-border">
                            {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden flex flex-col">
            {miscBets.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No side bets yet
              </div>
            ) : (
              miscBets.map((bet) => {
                const winner = participants.find((p) => p.id === bet.winner_participant_id);
                const loser = participants.find((p) => p.id === bet.loser_participant_id);
                const linkedMatch = matches.find((m) => m.id === bet.match_id);
                return (
                  <div key={bet.id} className="flex flex-col p-4 border-b border-border/50 gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-foreground">{bet.title}</div>
                        {linkedMatch && (
                          <div className="text-xs text-muted-foreground">Match {linkedMatch.match_no}: {linkedMatch.team1} vs {linkedMatch.team2}</div>
                        )}
                        {bet.bet_date && (
                          <div className="text-xs text-muted-foreground">Date: {new Date(bet.bet_date).toLocaleDateString()}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-surface text-muted-foreground border-border text-[10px]">
                        {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-success font-medium flex items-center gap-1">
                          <span className="text-muted-foreground text-xs w-4">W:</span> {winner?.name}
                        </span>
                        <span className="text-danger font-medium flex items-center gap-1">
                          <span className="text-muted-foreground text-xs w-4">L:</span> {loser?.name}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-lg">₹{bet.amount}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
