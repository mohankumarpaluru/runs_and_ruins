import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useMemo } from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { CountUp } from '../components/ui/count-up';

interface SettlementTransaction {
  from: string;
  to: string;
  amount: number;
}

export function Settlement() {
  const { participants, matchBets, miscBets } = useStore();

  const { balances, transactions } = useMemo<{ balances: Record<string, number>, transactions: SettlementTransaction[] }>(() => {
    const balances: Record<string, number> = {};

    participants.forEach((p) => {
      balances[p.id] = 0;
    });

    matchBets.forEach((bet) => {
      if (balances[bet.participant_id] !== undefined && bet.result !== 'pending') {
        balances[bet.participant_id] += bet.profit_loss;
      }
    });

    miscBets.forEach((bet) => {
      if (bet.status === 'settled') {
        if (balances[bet.winner_participant_id] !== undefined) {
          balances[bet.winner_participant_id] += bet.amount;
        }
        if (balances[bet.loser_participant_id] !== undefined) {
          balances[bet.loser_participant_id] -= bet.amount;
        }
      }
    });

    // Calculate settlements
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];

    Object.entries(balances).forEach(([id, amount]) => {
      if (amount < 0) debtors.push({ id, amount: Math.abs(amount) });
      else if (amount > 0) creditors.push({ id, amount });
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: SettlementTransaction[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0) {
        transactions.push({
          from: debtor.id,
          to: creditor.id,
          amount,
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }

    return { balances, transactions };
  }, [participants, matchBets, miscBets]);

  const getParticipantName = (id: string) => participants.find((p) => p.id === id)?.name || 'Unknown';

  const totalOutstanding = useMemo(() => {
    return (Object.values(balances) as number[]).reduce((acc, val) => (val > 0 ? acc + val : acc), 0);
  }, [balances]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Payouts</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Final Balances */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="bg-surface/30 border-b border-white/5">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Wallet className="w-5 h-5 text-primary" />
              Final Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-surface/50">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium">Participant</TableHead>
                    <TableHead className="text-right text-muted-foreground font-medium">Net Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Object.entries(balances) as [string, number][])
                    .sort(([, a], [, b]) => b - a)
                    .map(([id, amount]) => (
                      <TableRow key={id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {getParticipantName(id).charAt(0).toUpperCase()}
                            </div>
                            {getParticipantName(id)}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {amount > 0 ? <ArrowUpRight className="w-4 h-4" /> : amount < 0 ? <ArrowDownRight className="w-4 h-4" /> : null}
                            ₹{Math.abs(amount).toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col divide-y divide-white/5">
              {(Object.entries(balances) as [string, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([id, amount]) => (
                  <div key={id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {getParticipantName(id).charAt(0).toUpperCase()}
                      </div>
                      <div className="font-medium text-foreground">{getParticipantName(id)}</div>
                    </div>
                    <div className={`font-mono font-bold text-lg flex items-center gap-1 ${amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                      {amount > 0 ? <ArrowUpRight className="w-4 h-4" /> : amount < 0 ? <ArrowDownRight className="w-4 h-4" /> : null}
                      ₹{Math.abs(amount).toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Settlement Plan */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-surface/30 border-b border-white/5">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <AlertCircle className="w-5 h-5 text-warning" />
              Who Owes Whom
            </CardTitle>
            <Badge variant="outline" className="border-white/10 text-muted-foreground bg-surface/50">
              Total: <CountUp value={totalOutstanding} prefix="₹" />
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-surface/50">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium">From</TableHead>
                    <TableHead className="text-center text-muted-foreground font-medium"></TableHead>
                    <TableHead className="text-muted-foreground font-medium">To</TableHead>
                    <TableHead className="text-right text-muted-foreground font-medium">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow className="border-white/5">
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-success opacity-50" />
                          <p>All settled up! No transactions needed.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t, i) => (
                      <TableRow key={i} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="font-medium text-danger">{getParticipantName(t.from)}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          <ArrowRight className="w-4 h-4 mx-auto" />
                        </TableCell>
                        <TableCell className="font-medium text-success">{getParticipantName(t.to)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">
                          ₹{t.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col divide-y divide-white/5">
              {transactions.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-success opacity-50" />
                    <p>All settled up! No transactions needed.</p>
                  </div>
                </div>
              ) : (
                transactions.map((t, i) => (
                  <div key={i} className="p-4 flex flex-col gap-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-danger font-medium">
                        <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center text-danger text-sm">
                          {getParticipantName(t.from).charAt(0).toUpperCase()}
                        </div>
                        {getParticipantName(t.from)}
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      <div className="flex items-center gap-2 text-success font-medium">
                        {getParticipantName(t.to)}
                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success text-sm">
                          {getParticipantName(t.to).charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="outline" className="bg-surface/50 border-white/10 text-foreground font-mono text-base px-4 py-1">
                        ₹{t.amount.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
