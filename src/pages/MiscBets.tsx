import { useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Receipt, Pencil, Trash2, X, Check, CalendarDays } from 'lucide-react';
import { MiscBet } from '../types';
import { cn, getAvatarColor } from '../lib/utils';
import { format } from 'date-fns';

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
    if (!form.title || !form.amount) {
      toast.error('Please fill all required fields');
      return;
    }
    if ((form.winner_participant_id || form.loser_participant_id) && (!form.winner_participant_id || !form.loser_participant_id)) {
      toast.error('If selecting a winner, you must also select a loser');
      return;
    }
    if (form.winner_participant_id && form.winner_participant_id === form.loser_participant_id) {
      toast.error('Winner and loser cannot be the same person');
      return;
    }
    
    const isSettled = !!form.winner_participant_id && !!form.loser_participant_id;

    setIsSaving(true);
    try {
      if (mode === 'add') {
        const { error } = await supabase.from('misc_bets').insert([{
          title: form.title,
          winner_participant_id: form.winner_participant_id || null,
          loser_participant_id: form.loser_participant_id || null,
          amount: form.amount,
          status: isSettled ? 'settled' : 'pending',
          match_id: form.match_id === 'none' ? null : form.match_id,
          bet_date: form.bet_date || null,
        }]);
        if (error) throw error;
        toast.success(isSettled ? 'Settled side bet added' : 'Pending side bet added');
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
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="section-header text-3xl md:text-4xl">Side Bets</h1>
          <p className="section-meta mt-1.5">{miscBets.length} total · {miscBets.filter(b => b.status === 'settled').length} settled</p>
        </div>
        {mode === 'idle' && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[0.9375rem] font-bold transition-all w-full sm:w-auto justify-center cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #00D4C8, #00B8AE)',
              color: '#001312',
              fontFamily: 'var(--font-heading)',
              boxShadow: '0 2px 8px rgba(0,212,200,0.25)',
            }}
          >
            <Plus className="w-4 h-4" />
            Create Side Bet
          </button>
        )}
      </div>

      {/* Form Card */}
      {isFormOpen && (
        <div className="form-action-card p-5 md:p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-5">
            <Receipt className="w-5 h-5" style={{ color: '#00D4C8' }} />
            <h2 className="section-header text-lg">
              {mode === 'add' ? 'New Side Bet' : 'Edit Side Bet'}
            </h2>
          </div>

          {/* Fields in 3 logical clusters */}
          <div className="space-y-5">
            {/* Cluster 1: Title + Match */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="field-label" style={{ color: '#4A5F75' }}>
                  Bet Title / Description *
                </label>
                <Input
                  placeholder="e.g. Most Sixes, Toss Winner"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-surface-light border-border/60 focus-visible:ring-primary/40 h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="field-label" style={{ color: '#4A5F75' }}>
                  Linked Match
                </label>
                <Select value={form.match_id || 'none'} onValueChange={handleMatchChange}>
                  <SelectTrigger className="bg-surface-light border-border/60 h-10">
                    <SelectValue>
                      {form.match_id && form.match_id !== 'none'
                        ? (() => {
                            const m = matches.find((m) => m.id === form.match_id);
                            return m ? `Match ${m.match_no}: ${m.team1} vs ${m.team2}` : 'Link to Match';
                          })()
                        : 'No Match Linked (General)'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-surface-raised border-border/60">
                    <SelectItem value="none">No Match Linked (General)</SelectItem>
                    {matches.map((m) => (
                      <SelectItem key={m.id} value={m.id}>Match {m.match_no}: {m.team1} vs {m.team2}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cluster 2: Winner + Loser */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#22C55E', fontFamily: 'var(--font-heading)', opacity: 0.8 }}>
                  Winner <span style={{ color: '#4A5F75', textTransform: 'none' }}>(Optional until settled)</span>
                </label>
                <Select value={form.winner_participant_id || 'none'} onValueChange={(v) => setForm({ ...form, winner_participant_id: v === 'none' ? '' : v })}>
                  <SelectTrigger className="bg-surface-light border-border/60 h-10" style={{ borderColor: 'rgba(34,197,94,0.15)' }}>
                    <SelectValue>{participants.find((p) => p.id === form.winner_participant_id)?.name || 'Pending...'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-surface-raised border-border/60">
                    <SelectItem value="none">Pending / Undecided</SelectItem>
                    {participants.filter((p) => p.is_active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#EF4444', fontFamily: 'var(--font-heading)', opacity: 0.8 }}>
                  Loser <span style={{ color: '#4A5F75', textTransform: 'none' }}>(Optional until settled)</span>
                </label>
                <Select value={form.loser_participant_id || 'none'} onValueChange={(v) => setForm({ ...form, loser_participant_id: v === 'none' ? '' : v })}>
                  <SelectTrigger className="bg-surface-light border-border/60 h-10" style={{ borderColor: 'rgba(239,68,68,0.12)' }}>
                    <SelectValue>{participants.find((p) => p.id === form.loser_participant_id)?.name || 'Pending...'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-surface-raised border-border/60">
                    <SelectItem value="none">Pending / Undecided</SelectItem>
                    {participants.filter((p) => p.is_active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cluster 3: Amount + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="field-label" style={{ color: '#F5A524', opacity: 0.9 }}>
                  Wager Amount (₹) *
                </label>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={form.amount || ''}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className="bg-surface-light border-border/60 focus-visible:ring-primary/40 h-10 scoreboard-num"
                  style={{ borderColor: 'rgba(245,165,36,0.15)' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="field-label" style={{ color: '#4A5F75' }}>
                  Bet Date {form.match_id !== 'none' && <span style={{ color: '#2A3F55' }}>(inferred)</span>}
                </label>
                <Input
                  type="date"
                  value={form.bet_date || ''}
                  onChange={(e) => setForm({ ...form, bet_date: e.target.value })}
                  disabled={form.match_id !== 'none' && form.match_id !== undefined}
                  className="bg-surface-light border-border/60 focus-visible:ring-primary/40 h-10 disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 justify-end mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={closeForm}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#7A90A8',
                fontFamily: 'var(--font-heading)',
              }}
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="action-btn-primary flex items-center gap-1.5 px-5 py-2 text-sm rounded-lg disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : mode === 'add' ? 'Save Bet' : 'Update Bet'}
            </button>
          </div>
        </div>
      )}

      {/* Bets List */}
      <div className="rr-card overflow-hidden">
        {miscBets.length === 0 ? (
          <div className="empty-state m-4">
            <Receipt className="w-10 h-10" style={{ color: '#2A3F55' }} />
            <p className="font-semibold" style={{ color: '#4A5F75', fontFamily: 'var(--font-heading)' }}>No side bets yet</p>
            <p className="text-sm" style={{ color: '#2A3F55' }}>First move decides the game.</p>
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <div
              className="hidden md:grid grid-cols-[1fr_100px_90px_1fr_1fr_90px_90px_100px] px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: '#4A5F75', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-heading)', background: 'rgba(255,255,255,0.01)' }}
            >
              <span>Bet Title</span>
              <span>Match</span>
              <span>Date</span>
              <span>Winner</span>
              <span>Loser</span>
              <span className="text-right">Amount</span>
              <span className="text-center">Status</span>
              <span className="text-center">Actions</span>
            </div>

            {miscBets.map((bet) => {
              const winner = participants.find((p) => p.id === bet.winner_participant_id);
              const loser = participants.find((p) => p.id === bet.loser_participant_id);
              const linkedMatch = matches.find((m) => m.id === bet.match_id);
              const isConfirmingDelete = deletingId === bet.id;
              const edgeClass = bet.status === 'settled' ? 'bet-strip--win' : 'bet-strip--pending';

              return (
                <div key={bet.id} className={cn('bet-strip', edgeClass, isConfirmingDelete && 'bg-danger/5')}>
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_100px_90px_1fr_1fr_90px_90px_100px] items-center gap-3">
                    <span className="text-base font-semibold truncate" style={{ color: '#E8EDF5' }}>{bet.title}</span>
                    <span className="text-xs scoreboard-num" style={{ color: '#4A5F75' }}>
                      {linkedMatch ? `Match ${linkedMatch.match_no}` : '—'}
                    </span>
                    <span className="text-xs" style={{ color: '#4A5F75' }}>
                      {bet.bet_date ? format(new Date(bet.bet_date), 'MMM d') : '—'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0', winner ? getAvatarColor(winner.name) : 'bg-surface-light text-subtle')}>
                        {winner?.name?.charAt(0).toUpperCase() || '-'}
                      </div>
                      <span className="text-xs font-semibold truncate" style={{ color: winner ? '#22C55E' : '#7A90A8' }}>{winner?.name || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 opacity-60', loser ? getAvatarColor(loser.name) : 'bg-surface-light text-subtle')}>
                        {loser?.name?.charAt(0).toUpperCase() || '-'}
                      </div>
                      <span className="text-xs truncate" style={{ color: '#7A90A8' }}>{loser?.name || 'TBD'}</span>
                    </div>
                    <span className="text-right scoreboard-num text-sm font-bold" style={{ color: '#E8EDF5' }}>
                      ₹{bet.amount.toLocaleString()}
                    </span>
                    <div className="flex justify-center">
                      <span className={`status-pill ${bet.status === 'settled' ? 'status-pill--settled' : 'status-pill--pending'}`}>
                        {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      {isConfirmingDelete ? (
                        <>
                          <button
                            onClick={() => handleDelete(bet.id)}
                            disabled={isDeleting}
                            className="px-2 py-1 rounded text-[11px] font-semibold transition-colors"
                            style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}
                          >
                            {isDeleting ? '...' : 'Delete'}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-1 rounded text-[11px] font-semibold transition-colors"
                            style={{ color: '#7A90A8', background: 'rgba(255,255,255,0.04)' }}
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { closeForm(); openEdit(bet); }}
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                            style={{ color: '#4A5F75' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#00D4C8'; e.currentTarget.style.background = 'rgba(0,212,200,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#4A5F75'; e.currentTarget.style.background = 'transparent'; }}
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(bet.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                            style={{ color: '#4A5F75' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#4A5F75'; e.currentTarget.style.background = 'transparent'; }}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className={cn('md:hidden space-y-3', isConfirmingDelete && 'opacity-80')}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1 min-w-0 pr-3">
                        <div className="font-semibold text-sm truncate" style={{ color: '#E8EDF5' }}>{bet.title}</div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#4A5F75' }}>
                          {linkedMatch && <span>Match {linkedMatch.match_no}</span>}
                          {bet.bet_date && (
                            <>
                              {linkedMatch && <span>·</span>}
                              <CalendarDays className="w-3 h-3" />
                              <span>{format(new Date(bet.bet_date), 'MMM d')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`status-pill status-pill--${bet.status === 'settled' ? 'settled' : 'pending'} shrink-0`}>
                        {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0', winner ? getAvatarColor(winner.name) : 'bg-surface-light text-subtle')}>
                            {winner?.name?.charAt(0).toUpperCase() || '-'}
                          </div>
                          <span className="text-xs font-semibold truncate" style={{ color: winner ? '#22C55E' : '#7A90A8' }}>{winner?.name || 'TBD'}</span>
                        </div>
                        <span className="text-xs" style={{ color: '#2A3F55' }}>vs</span>
                        <div className="flex items-center gap-1.5">
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 opacity-60', loser ? getAvatarColor(loser.name) : 'bg-surface-light text-subtle')}>
                            {loser?.name?.charAt(0).toUpperCase() || '-'}
                          </div>
                          <span className="text-xs truncate" style={{ color: '#7A90A8' }}>{loser?.name || 'TBD'}</span>
                        </div>
                      </div>
                      <span className="scoreboard-num text-lg font-bold" style={{ color: '#E8EDF5' }}>₹{bet.amount.toLocaleString()}</span>
                    </div>

                    {isConfirmingDelete ? (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleDelete(bet.id)}
                          disabled={isDeleting}
                          className="flex-1 py-1.5 rounded-lg text-sm font-semibold"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontFamily: 'var(--font-heading)' }}
                        >
                          {isDeleting ? '...' : 'Yes, delete'}
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="flex-1 py-1.5 rounded-lg text-sm font-semibold"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#7A90A8', fontFamily: 'var(--font-heading)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => { closeForm(); openEdit(bet); }}
                          className="flex-1 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
                          style={{ background: 'rgba(0,212,200,0.08)', color: '#00D4C8', fontFamily: 'var(--font-heading)' }}
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => setDeletingId(bet.id)}
                          className="flex-1 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontFamily: 'var(--font-heading)' }}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
