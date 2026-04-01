export interface Participant {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Match {
  id: string;
  match_no: number;
  match_date: string;
  team1: string;
  team2: string;
  venue: string;
  match_time: string;
  stage: string;
  winner: string | null;
  status: 'scheduled' | 'completed' | 'settled';
  team1_score?: string;
  team2_score?: string;
}

export interface MatchBet {
  id: string;
  match_id: string;
  participant_id: string;
  predicted_winner: string;
  amount: number;
  result: 'win' | 'loss' | 'pending';
  profit_loss: number;
}

export interface MiscBet {
  id: string;
  title: string;
  winner_participant_id: string;
  loser_participant_id: string;
  amount: number;
  status: 'pending' | 'settled';
  match_id?: string | null;
  bet_date?: string | null;
}

export interface BetAmountRule {
  id: string;
  teams: string[];
  amount: number;
  priority: number;
  is_default: boolean;
}

export interface LeaderboardEntry {
  participant_id: string;
  name: string;
  total_pl: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_rate: number;
}
