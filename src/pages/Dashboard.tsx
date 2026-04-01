import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Trophy, TrendingUp, Users, Activity, CalendarDays, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LeaderboardEntry } from '../types';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { CountUp } from '../components/ui/count-up';
import { TeamLogo } from '../components/TeamLogo';

export function Dashboard() {
  const { participants, matches, matchBets, miscBets } = useStore();
  const [isWinnersTableOpen, setIsWinnersTableOpen] = useState(false);

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
          matchWinnerName,
          participantName: participant?.name || 'Unknown',
          amountWon: bet.profit_loss,
        };
      })
      .sort((a, b) => b.match_no - a.match_no);
  }, [matchBets, matches, participants]);

  const leaderboard = useMemo(() => {
    const stats: Record<string, LeaderboardEntry> = {};

    participants.forEach((p) => {
      stats[p.id] = {
        participant_id: p.id,
        name: p.name,
        total_pl: 0,
        matches_played: 0,
        wins: 0,
        losses: 0,
        win_rate: 0,
      };
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
        if (stats[bet.winner_participant_id]) {
          stats[bet.winner_participant_id].total_pl += bet.amount;
        }
        if (stats[bet.loser_participant_id]) {
          stats[bet.loser_participant_id].total_pl -= bet.amount;
        }
      }
    });

    return Object.values(stats)
      .map((stat) => {
        stat.win_rate = stat.matches_played > 0 ? (stat.wins / stat.matches_played) * 100 : 0;
        return stat;
      })
      .sort((a, b) => b.total_pl - a.total_pl);
  }, [participants, matchBets, miscBets]);

  const nextMatch = useMemo(() => {
    return matches.find((m) => m.status === 'scheduled');
  }, [matches]);

  const totalPool = useMemo(() => {
    return matchBets.reduce((acc, bet) => acc + bet.amount, 0) + miscBets.reduce((acc, bet) => acc + bet.amount, 0);
  }, [matchBets, miscBets]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Overview</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Participants</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              <CountUp value={participants.length} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Matches Completed</CardTitle>
            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              <CountUp value={matches.filter((m) => m.status === 'completed' || m.status === 'settled').length} /> <span className="text-muted-foreground text-lg">/ {matches.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Bets</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Activity className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              <CountUp value={matchBets.length + miscBets.length} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Amount</CardTitle>
            <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold font-mono text-foreground">
              <CountUp value={totalPool} prefix="₹" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Standings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-warning" />
              Standings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden md:block">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-surface/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium text-center w-16">Rank</th>
                    <th className="px-6 py-4 font-medium">Participant</th>
                    <th className="px-6 py-4 font-medium text-right">P/L</th>
                    <th className="px-6 py-4 font-medium text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        No activity yet — place your first bet to get started
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((entry, index) => (
                      <tr key={entry.participant_id} className="border-b border-border/50 hover:bg-surface/30 transition-colors group">
                        <td className="px-6 py-4 text-center">
                          {index === 0 ? (
                            <div className="flex justify-center"><Crown className="w-5 h-5 text-warning" /></div>
                          ) : (
                            <span className="text-muted-foreground font-medium">{index + 1}</span>
                          )}
                        </td>
                        <td className={cn("px-6 py-4 font-bold", index === 0 ? "text-warning" : "text-foreground")}>
                          {entry.name}
                        </td>
                        <td className={cn("px-6 py-4 text-right font-mono font-bold", entry.total_pl > 0 ? 'text-success' : entry.total_pl < 0 ? 'text-danger' : 'text-muted-foreground')}>
                          {entry.total_pl > 0 ? '+' : ''}{entry.total_pl.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-muted-foreground">{entry.win_rate.toFixed(1)}%</span>
                            <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${entry.win_rate}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Standings View */}
            <div className="md:hidden flex flex-col">
              {leaderboard.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No activity yet — place your first bet to get started
                </div>
              ) : (
                leaderboard.map((entry, index) => (
                  <div key={entry.participant_id} className="flex items-center justify-between p-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-6 flex justify-center">
                        {index === 0 ? <Crown className="w-4 h-4 text-warning" /> : <span className="text-muted-foreground text-sm font-medium">{index + 1}</span>}
                      </div>
                      <div className="font-bold text-foreground">{entry.name}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={cn("font-mono font-bold text-sm", entry.total_pl > 0 ? 'text-success' : entry.total_pl < 0 ? 'text-danger' : 'text-muted-foreground')}>
                        {entry.total_pl > 0 ? '+' : ''}{entry.total_pl.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">{entry.win_rate.toFixed(1)}% win</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Match */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Upcoming Match
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextMatch ? (
                <Link to={`/matches/${nextMatch.id}`} className="block group">
                  <div className="p-5 rounded-xl bg-surface border border-border group-hover:border-primary/50 transition-all duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <Badge variant="outline" className="border-border text-muted-foreground font-medium">Match {nextMatch.match_no}</Badge>
                      <span className="text-xs font-medium text-muted-foreground">{format(new Date(nextMatch.match_date), 'MMM d')}</span>
                    </div>
                    <div className="flex flex-row justify-between items-center py-4 space-x-4">
                      <div className="flex flex-col items-center flex-1">
                        <TeamLogo team={nextMatch.team1} className="w-10 h-10 text-sm mb-2" fallbackColorClass="text-primary bg-primary/20" />
                        <div className="text-sm font-bold text-center text-foreground line-clamp-2">{nextMatch.team1}</div>
                      </div>
                      
                      <div className="px-2 py-1 rounded-full bg-background border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">VS</div>
                      
                      <div className="flex flex-col items-center flex-1">
                        <TeamLogo team={nextMatch.team2} className="w-10 h-10 text-sm mb-2" fallbackColorClass="text-secondary bg-secondary/20" />
                        <div className="text-sm font-bold text-center text-foreground line-clamp-2">{nextMatch.team2}</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/50 text-xs text-center text-muted-foreground font-medium flex items-center justify-center gap-2">
                      <span>{nextMatch.match_time}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{nextMatch.venue}</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No matches available</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Winning Bets Table (Collapsible) */}
      <Card className="overflow-hidden">
        <CardHeader 
          className="flex flex-row items-center justify-between cursor-pointer hover:bg-surface/30 transition-colors py-4 bg-surface/10"
          onClick={() => setIsWinnersTableOpen(!isWinnersTableOpen)}
        >
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Winning Bets Summary
          </CardTitle>
          <button className="p-1 rounded-md hover:bg-white/10 text-muted-foreground transition-colors">
            {isWinnersTableOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </CardHeader>
        {isWinnersTableOpen && (
          <CardContent className="p-0 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-surface/30 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Match No</th>
                    <th className="px-6 py-4 font-medium">Teams (Team 1 vs Team 2)</th>
                    <th className="px-6 py-4 font-medium">Match Winner</th>
                    <th className="px-6 py-4 font-medium">Bet Winner</th>
                    <th className="px-6 py-4 font-medium text-right">Amount Won</th>
                  </tr>
                </thead>
                <tbody>
                  {winningBets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No winning bets have been settled yet.
                      </td>
                    </tr>
                  ) : (
                    winningBets.map((bet) => (
                      <tr key={bet.id} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-muted-foreground">Match {bet.match_no}</td>
                        <td className="px-6 py-4 text-foreground font-medium">{bet.team1} <span className="text-muted-foreground px-1 text-xs">vs</span> {bet.team2}</td>
                        <td className="px-6 py-4 text-foreground">{bet.matchWinnerName}</td>
                        <td className="px-6 py-4 font-bold text-foreground flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                            {bet.participantName.charAt(0)}
                          </div>
                          {bet.participantName}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-success">
                          +₹{bet.amountWon.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
