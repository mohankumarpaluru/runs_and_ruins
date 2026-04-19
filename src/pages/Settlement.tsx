import { useStore } from '../store/useStore';
import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  HandCoins,
} from 'lucide-react';
import { cn, getAvatarColor } from '../lib/utils';
import { CountUp } from '../components/ui/count-up';

interface SettlementTransaction {
  from: string;
  to: string;
  amount: number;
}

export function Settlement() {
  const { participants, matchBets, miscBets } = useStore();

  const { balances, transactions } = useMemo<{
    balances: Record<string, number>;
    transactions: SettlementTransaction[];
  }>(() => {
    const balances: Record<string, number> = {};
    participants.forEach((p) => { balances[p.id] = 0; });

    matchBets.forEach((bet) => {
      if (balances[bet.participant_id] !== undefined && bet.result !== 'pending') {
        balances[bet.participant_id] += bet.profit_loss;
      }
    });

    miscBets.forEach((bet) => {
      if (bet.status === 'settled') {
        if (balances[bet.winner_participant_id] !== undefined)
          balances[bet.winner_participant_id] += bet.amount;
        if (balances[bet.loser_participant_id] !== undefined)
          balances[bet.loser_participant_id] -= bet.amount;
      }
    });

    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];

    Object.entries(balances).forEach(([id, amount]) => {
      if (amount < 0) debtors.push({ id, amount: Math.abs(amount) });
      else if (amount > 0) creditors.push({ id, amount });
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: SettlementTransaction[] = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);
      if (amount > 0) transactions.push({ from: debtor.id, to: creditor.id, amount });
      debtor.amount -= amount;
      creditor.amount -= amount;
      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }

    return { balances, transactions };
  }, [participants, matchBets, miscBets]);

  const getName = (id: string) => participants.find((p) => p.id === id)?.name || 'Unknown';

  const totalOutstanding = useMemo(
    () => (Object.values(balances) as number[]).reduce((acc, val) => (val > 0 ? acc + val : acc), 0),
    [balances]
  );

  const allSettled = transactions.length === 0;

  const sortedBalances = (Object.entries(balances) as [string, number][]).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div className="space-y-7 page-enter">
      {/* Header */}
      <div>
        <h1 className="section-header text-3xl md:text-4xl">Settlement</h1>
        <p className="section-meta mt-1.5">Season-end payouts & balances</p>
      </div>

      {/* All settled banner */}
      {allSettled && participants.length > 0 && (
        <div
          className="flex items-center gap-4 p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(0,212,200,0.05) 100%)',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <CheckCircle2 className="w-6 h-6" style={{ color: '#22C55E' }} />
          </div>
          <div>
            <div className="font-bold text-base" style={{ fontFamily: 'var(--font-heading)', color: '#22C55E' }}>
              All Settled Up
            </div>
            <div className="text-sm mt-0.5" style={{ color: '#4A5F75' }}>
              No pending transactions — everyone's square.
            </div>
          </div>
        </div>
      )}

      {/* Two-col grid */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* ── Final Balances ── */}
        <div className="rr-card overflow-hidden">
          {/* Card header */}
          <div
            className="px-5 py-4 flex items-center gap-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}
          >
            <Wallet className="w-5 h-5" style={{ color: '#00D4C8' }} />
            <span className="section-header text-lg">Final Balances</span>
          </div>

          {sortedBalances.length === 0 ? (
            <div className="empty-state m-4">
              <Wallet className="w-10 h-10" style={{ color: '#2A3F55' }} />
              <p className="text-base" style={{ color: '#4A5F75' }}>No balance data yet</p>
            </div>
          ) : (
            <div>
              {sortedBalances.map(([id, amount], idx) => {
                const name = getName(id);
                const isPos = amount > 0;
                const isNeg = amount < 0;
                return (
                  <div
                    key={id}
                    className={cn(
                      'flex items-center gap-4 px-5 py-4 transition-colors',
                      idx < sortedBalances.length - 1 ? 'border-b' : ''
                    )}
                    style={{
                      borderColor: 'rgba(255,255,255,0.04)',
                      borderLeft: `3px solid ${isPos ? 'rgba(34,197,94,0.5)' : isNeg ? 'rgba(239,68,68,0.45)' : 'transparent'}`,
                      background: isPos ? 'rgba(34,197,94,0.02)' : isNeg ? 'rgba(239,68,68,0.02)' : 'transparent',
                    }}
                  >
                    {/* Avatar */}
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0', getAvatarColor(name))}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    {/* Name */}
                    <div
                      className="flex-1 font-semibold text-base"
                      style={{ fontFamily: 'var(--font-heading)', color: '#E8EDF5' }}
                    >
                      {name}
                    </div>
                    {/* Balance */}
                    <div className="flex items-center gap-1.5">
                      {isPos
                        ? <ArrowUpRight className="w-4 h-4" style={{ color: '#22C55E' }} />
                        : isNeg
                        ? <ArrowDownRight className="w-4 h-4" style={{ color: '#EF4444' }} />
                        : null}
                      <span
                        className={cn(
                          'scoreboard-num text-lg font-bold',
                          isPos ? 'pl-positive' : isNeg ? 'pl-negative' : 'pl-neutral'
                        )}
                      >
                        {isPos ? '+' : isNeg ? '-' : ''}₹{Math.abs(amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Who Owes Whom ── */}
        <div className="rr-card overflow-hidden">
          {/* Card header */}
          <div
            className="px-5 py-4 flex items-center justify-between gap-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}
          >
            <div className="flex items-center gap-3">
              <HandCoins className="w-5 h-5" style={{ color: '#F5A524' }} />
              <span className="section-header text-lg">Who Owes Whom</span>
            </div>
            {totalOutstanding > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(245,165,36,0.08)', border: '1px solid rgba(245,165,36,0.15)' }}
              >
                <span className="field-label" style={{ color: '#4A5F75' }}>Outstanding</span>
                <span className="scoreboard-num text-sm font-bold" style={{ color: '#F5A524' }}>
                  ₹<CountUp value={totalOutstanding} />
                </span>
              </div>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="empty-state m-4">
              <CheckCircle2 className="w-10 h-10" style={{ color: '#22C55E', opacity: 0.6 }} />
              <p className="font-bold text-base" style={{ color: '#22C55E' }}>All cleared!</p>
              <p className="text-sm" style={{ color: '#4A5F75' }}>No transactions needed</p>
            </div>
          ) : (
            <div>
              {/* Desktop header */}
              <div
                className="hidden md:grid grid-cols-[1fr_32px_1fr_120px] px-5 py-3 text-xs font-black uppercase tracking-widest"
                style={{ color: '#2A3F55', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-heading)' }}
              >
                <span>Owes</span>
                <span />
                <span>To</span>
                <span className="text-right">Amount</span>
              </div>

              {transactions.map((t, i) => {
                const fromName = getName(t.from);
                const toName = getName(t.to);
                return (
                  <div
                    key={i}
                    className={cn(
                      'px-5 py-4 transition-colors hover:bg-white/[0.02]',
                      i < transactions.length - 1 ? 'border-b' : ''
                    )}
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  >
                    {/* Desktop row */}
                    <div className="hidden md:grid grid-cols-[1fr_32px_1fr_120px] items-center gap-3">
                      {/* From */}
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0', getAvatarColor(fromName))}>
                          {fromName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-base font-semibold" style={{ color: '#EF4444', fontFamily: 'var(--font-heading)' }}>
                          {fromName}
                        </span>
                      </div>
                      {/* Arrow */}
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4" style={{ color: '#2A3F55' }} />
                      </div>
                      {/* To */}
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0', getAvatarColor(toName))}>
                          {toName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-base font-semibold" style={{ color: '#22C55E', fontFamily: 'var(--font-heading)' }}>
                          {toName}
                        </span>
                      </div>
                      {/* Amount */}
                      <div className="text-right scoreboard-num text-lg font-bold" style={{ color: '#E8EDF5' }}>
                        ₹{t.amount.toLocaleString()}
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0', getAvatarColor(fromName))}>
                            {fromName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-base font-semibold" style={{ color: '#EF4444', fontFamily: 'var(--font-heading)' }}>
                            {fromName}
                          </span>
                        </div>
                        <ArrowRight className="w-5 h-5" style={{ color: '#2A3F55' }} />
                        <div className="flex items-center gap-2.5">
                          <span className="text-base font-semibold" style={{ color: '#22C55E', fontFamily: 'var(--font-heading)' }}>
                            {toName}
                          </span>
                          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0', getAvatarColor(toName))}>
                            {toName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <span
                          className="scoreboard-num text-xl font-bold px-5 py-2 rounded-xl inline-block"
                          style={{ background: 'rgba(245,165,36,0.08)', border: '1px solid rgba(245,165,36,0.15)', color: '#F5A524' }}
                        >
                          ₹{t.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
