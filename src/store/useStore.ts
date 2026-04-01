import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { Participant, Match, MatchBet, MiscBet, BetAmountRule } from '../types';

interface AppState {
  participants: Participant[];
  matches: Match[];
  matchBets: MatchBet[];
  miscBets: MiscBet[];
  betAmountRules: BetAmountRule[];
  isLoading: boolean;
  error: string | null;
  
  fetchParticipants: () => Promise<void>;
  fetchMatches: () => Promise<void>;
  fetchMatchBets: () => Promise<void>;
  fetchMiscBets: () => Promise<void>;
  fetchBetAmountRules: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  participants: [],
  matches: [],
  matchBets: [],
  miscBets: [],
  betAmountRules: [],
  isLoading: false,
  error: null,

  fetchParticipants: async () => {
    const { data, error } = await supabase.from('participants').select('*').order('name');
    if (error) set({ error: error.message });
    else set({ participants: data as Participant[] });
  },

  fetchMatches: async () => {
    const { data, error } = await supabase.from('matches').select('*').order('match_no');
    if (error) set({ error: error.message });
    else set({ matches: data as Match[] });
  },

  fetchMatchBets: async () => {
    const { data, error } = await supabase.from('match_bets').select('*');
    if (error) set({ error: error.message });
    else set({ matchBets: data as MatchBet[] });
  },

  fetchMiscBets: async () => {
    const { data, error } = await supabase.from('misc_bets').select('*').order('created_at', { ascending: false });
    if (error) set({ error: error.message });
    else set({ miscBets: data as MiscBet[] });
  },

  fetchBetAmountRules: async () => {
    const { data, error } = await supabase.from('bet_amount_rules').select('*').order('priority');
    if (error) set({ error: error.message });
    else set({ betAmountRules: data as BetAmountRule[] });
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        useStore.getState().fetchParticipants(),
        useStore.getState().fetchMatches(),
        useStore.getState().fetchMatchBets(),
        useStore.getState().fetchMiscBets(),
        useStore.getState().fetchBetAmountRules(),
      ]);
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  }
}));
