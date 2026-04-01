import { useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Receipt, Pencil, Trash2, X, Check } from 'lucide-react';
import { MiscBet } from '../types';
import { cn, getAvatarColor } from '../lib/utils';

type FormState = Partial<MiscBet> & { id?: string };

const emptyForm = (): FormState => ({
  title: '',
  winner_participant_id: '',
  loser_participant_id: '',
  amount: 0,
  match_id: 'none',
  bet_date: '',
});

export function MiscBets() {
  const { miscBets, participants, matches, fetchMiscBets, updateMiscBet, deleteMiscBet } = useStore();
  const [mode, setMode] = useState<'idle' | 'add' | 'edit'>('idle');
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openAdd = () => { setForm(emptyForm()); setMode('add'); };
  const openEdit = (bet: MiscBet) => { setForm({ ...bet, match_id: bet.match_id ?? 'none' }); setMode('edit'); };
  const closeForm = () => { setMode('idle'); setForm(emptyForm()); };

  const handleSave = async () => {
    if (!form.title || !form.winner_participant_id || !form.loser_participant_id || !form.amount) {
      toast.error('Please fill all required fields');
      return;
    }
    if (form.winner_participant_id === form.loser_participant_id) {
      toast.error('Winner and loser cannot be the same person');
      return;
    }
    setIsSaving(true);
    try {
      if (mode === 'add') {
        const { error } = await supabase.from('misc_bets').insert([{
          title: form.title,
          winner_participant_id: form.winner_participant_id,
          loser_participant_id: form.loser_participant_id,
          amount: form.amount,
          status: 'settled',
          match_id: form.match_id === 'none' ? null : form.match_id,
          bet_date: form.bet_date || null,
        }]);
        if (error) throw error;
        toast.success('Side bet added');
        await fetchMiscBets();
      } else if (mode === 'edit' && form.id) {
        await updateMiscBet(form.id, form);
        toast.success('Side bet updated');
      }
      closeForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save side bet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteMiscBet(id);
      toast.success('Side bet deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete side bet');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const handleMatchChange = (v: string) => {
    const updates: Partial<FormState> = { match_id: v };
    if (v !== 'none') {
      const m = matches.find((m) => m.id === v);
      if (m) updates.bet_date = m.match_date;
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const isFormOpen = mode === 'add' || mode === 'edit';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Side Bets</h1>
        {mode === 'idle' && (
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Create Side Bet
          </Button>
        )}
      </div>

      {isFormOpen && (
        <Card className="mb-6 animate-in slide-in-from-top-4 duration-300 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              {mode === 'add' ? 'New Side Bet' : 'Edit Side Bet'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Bet Title / Description</label>
                <Input
                  placeholder="e.g. Most Sixes, Toss Winner"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-background border-border focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Linked Match</label>
                <Select value={form.match_id || 'none'} onValueChange={handleMatchChange}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue>
                      {form.match_id && form.match_id !== 'none'
                        ? (() => {
                            const m = matches.find((m) => m.id === form.match_id);
                            return m ? `Match ${m.match_no}: ${m.team1} vs ${m.team2}` : 'Link to Match';
                          })()
                        : 'No Match Linked (General)'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    <SelectItem value="none">No Match Linked (General)</SelectItem>
                    {matches.map((m) => (
                      <SelectItem key={m.id} value={m.id}>Match {m.match_no}: {m.team1} vs {m.team2}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Bet Date {form.match_id !== 'none' && '(Inferred)'}
                </label>
                <Input
                  type="date"
                  value={form.bet_date || ''}
                  onChange={(e) => setForm({ ...form, bet_date: e.target.value })}
                  disabled={form.match_id !== 'none'}
                  className="bg-background border-border focus-visible:ring-primary disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Winner Participant</label>
                <Select value={form.winner_participant_id} onValueChange={(v) => setForm({ ...form, winner_participant_id: v })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue>{participants.find((p) => p.id === form.winner_participant_id)?.name || 'Select Winner'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    {participants.filter((p) => p.is_active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Loser Participant</label>
                <Select value={form.loser_participant_id} onValueChange={(v) => setForm({ ...form, loser_participant_id: v })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue>{participants.find((p) => p.id === form.loser_participant_id)?.name || 'Select Loser'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    {participants.filter((p) => p.is_active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Wager Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={form.amount || ''}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className="bg-background border-border focus-visible:ring-primary font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="ghost" onClick={closeForm} className="hover:bg-surface" disabled={isSaving}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSaving}>
                <Check className="w-4 h-4 mr-1" />
                {isSaving ? 'Saving...' : mode === 'add' ? 'Save Bet' : 'Update Bet'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {/* Desktop */}
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
                  <th className="px-6 py-4 font-medium text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {miscBets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                      No side bets yet — create one above
                    </td>
                  </tr>
                ) : (
                  miscBets.map((bet) => {
                    const winner = participants.find((p) => p.id === bet.winner_participant_id);
                    const loser = participants.find((p) => p.id === bet.loser_participant_id);
                    const linkedMatch = matches.find((m) => m.id === bet.match_id);
                    const isConfirmingDelete = deletingId === bet.id;
                    return (
                      <tr key={bet.id} className={cn('border-b border-border/50 transition-colors', isConfirmingDelete ? 'bg-danger/5' : 'hover:bg-surface/30')}>
                        <td className="px-6 py-4 font-medium text-foreground">{bet.title}</td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {linkedMatch ? `Match ${linkedMatch.match_no}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {bet.bet_date ? new Date(bet.bet_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0', getAvatarColor(winner?.name || ''))}>
                              {winner?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="text-foreground font-medium">{winner?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0', getAvatarColor(loser?.name || ''))}>
                              {loser?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="text-foreground font-medium">{loser?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold">₹{bet.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="bg-surface text-muted-foreground border-border">
                            {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isConfirmingDelete ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-danger hover:bg-danger/10 text-xs cursor-pointer" onClick={() => handleDelete(bet.id)} disabled={isDeleting}>
                                {isDeleting ? '...' : 'Yes, delete'}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:bg-surface text-xs cursor-pointer" onClick={() => setDeletingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer" onClick={() => { closeForm(); openEdit(bet); }} title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-danger hover:bg-danger/10 cursor-pointer" onClick={() => setDeletingId(bet.id)} title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex flex-col">
            {miscBets.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No side bets yet</div>
            ) : (
              miscBets.map((bet) => {
                const winner = participants.find((p) => p.id === bet.winner_participant_id);
                const loser = participants.find((p) => p.id === bet.loser_participant_id);
                const linkedMatch = matches.find((m) => m.id === bet.match_id);
                const isConfirmingDelete = deletingId === bet.id;
                return (
                  <div key={bet.id} className={cn('flex flex-col p-4 border-b border-border/50 gap-3 transition-colors', isConfirmingDelete && 'bg-danger/5')}>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-foreground">{bet.title}</div>
                        {linkedMatch && <div className="text-xs text-muted-foreground">Match {linkedMatch.match_no}: {linkedMatch.team1} vs {linkedMatch.team2}</div>}
                        {bet.bet_date && <div className="text-xs text-muted-foreground">{new Date(bet.bet_date).toLocaleDateString()}</div>}
                      </div>
                      <Badge variant="outline" className="bg-surface text-muted-foreground border-border text-[10px]">
                        {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-4">W:</span>
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0', getAvatarColor(winner?.name || ''))}>
                            {winner?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-medium">{winner?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-4">L:</span>
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0', getAvatarColor(loser?.name || ''))}>
                            {loser?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-medium">{loser?.name}</span>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-lg">₹{bet.amount.toLocaleString()}</div>
                    </div>
                    {isConfirmingDelete ? (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="ghost" className="flex-1 text-danger hover:bg-danger/10 text-xs cursor-pointer" onClick={() => handleDelete(bet.id)} disabled={isDeleting}>
                          {isDeleting ? '...' : 'Yes, delete'}
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1 text-muted-foreground hover:bg-surface text-xs cursor-pointer" onClick={() => setDeletingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="ghost" className="flex-1 text-primary hover:bg-primary/10 text-xs cursor-pointer" onClick={() => { closeForm(); openEdit(bet); }}>
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1 text-danger hover:bg-danger/10 text-xs cursor-pointer" onClick={() => setDeletingId(bet.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    )}
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
