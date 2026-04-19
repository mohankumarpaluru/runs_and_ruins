-- Migration 3: Auto-fill opponent bets and relax side bets constraints

-- 1) Relax constraints on misc_bets so side bets can be 'pending' without a winner
ALTER TABLE misc_bets ALTER COLUMN winner_participant_id DROP NOT NULL;
ALTER TABLE misc_bets ALTER COLUMN loser_participant_id DROP NOT NULL;
ALTER TABLE misc_bets ALTER COLUMN status SET DEFAULT 'pending';

-- 2) Create a trigger function to auto-fill the opposing bet for match_bets (when exactly 2 participants exist)
CREATE OR REPLACE FUNCTION trg_autofill_opponent_bet()
RETURNS TRIGGER AS $$
DECLARE
  v_participant_count INT;
  v_other_participant_id UUID;
  v_opposite_team TEXT;
  v_existing_bet_count INT;
BEGIN
  -- We ONLY perform autofill if there are exactly 2 active participants total
  SELECT COUNT(id) INTO v_participant_count FROM participants WHERE is_active = true;
  
  IF v_participant_count = 2 THEN
    -- Find the *other* participant's ID
    SELECT id INTO v_other_participant_id FROM participants WHERE id != NEW.participant_id AND is_active = true LIMIT 1;
    
    -- Determine the opposite predicted team
    IF NEW.predicted_winner = 'team1' THEN
      v_opposite_team := 'team2';
    ELSE
      v_opposite_team := 'team1';
    END IF;
    
    -- Check if the OTHER participant already has a bet for this match (to prevent infinite recursion loop or duplicates)
    SELECT COUNT(*) INTO v_existing_bet_count 
    FROM match_bets 
    WHERE match_id = NEW.match_id AND participant_id = v_other_participant_id;
    
    -- If they don't have a bet, insert the exact opposite bet for the same amount
    IF v_existing_bet_count = 0 THEN
      INSERT INTO match_bets (match_id, participant_id, predicted_winner, amount, result, profit_loss)
      VALUES (NEW.match_id, v_other_participant_id, v_opposite_team, NEW.amount, 'pending', 0);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Attach the trigger to match_bets
DROP TRIGGER IF EXISTS trg_match_bets_autofill ON match_bets;
CREATE TRIGGER trg_match_bets_autofill
AFTER INSERT ON match_bets
FOR EACH ROW
EXECUTE FUNCTION trg_autofill_opponent_bet();

-- 4) Backfill missing opponent bets for existing exactly-two-participant configurations
DO $$
DECLARE
  v_participant_count INT;
  v_p1_id UUID;
  v_p2_id UUID;
BEGIN
  SELECT COUNT(id) INTO v_participant_count FROM participants WHERE is_active = true;
  IF v_participant_count = 2 THEN
    -- Get both participants
    SELECT id INTO v_p1_id FROM participants WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO v_p2_id FROM participants WHERE is_active = true ORDER BY created_at ASC OFFSET 1 LIMIT 1;
    
    -- Insert for p2 where p1 has a bet but p2 doesn't
    INSERT INTO match_bets (match_id, participant_id, predicted_winner, amount, result, profit_loss)
    SELECT mb.match_id, v_p2_id, 
           CASE WHEN mb.predicted_winner = 'team1' THEN 'team2' ELSE 'team1' END,
           mb.amount, 'pending', 0
    FROM match_bets mb
    WHERE mb.participant_id = v_p1_id
      AND NOT EXISTS (
        SELECT 1 FROM match_bets opponent_bet 
        WHERE opponent_bet.match_id = mb.match_id AND opponent_bet.participant_id = v_p2_id
      );

    -- Insert for p1 where p2 has a bet but p1 doesn't
    INSERT INTO match_bets (match_id, participant_id, predicted_winner, amount, result, profit_loss)
    SELECT mb.match_id, v_p1_id, 
           CASE WHEN mb.predicted_winner = 'team1' THEN 'team2' ELSE 'team1' END,
           mb.amount, 'pending', 0
    FROM match_bets mb
    WHERE mb.participant_id = v_p2_id
      AND NOT EXISTS (
        SELECT 1 FROM match_bets opponent_bet 
        WHERE opponent_bet.match_id = mb.match_id AND opponent_bet.participant_id = v_p1_id
      );
  END IF;
END $$;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
