  -- Migration 4: Smart Trigger For Completed Matches And Self Heal

  -- 1) Self Heal: Fix existing bets that are stuck as 'pending' for 'completed' matches
  UPDATE match_bets mb
  SET result = CASE WHEN mb.predicted_winner = m.winner THEN 'win' ELSE 'loss' END,
      profit_loss = CASE WHEN mb.predicted_winner = m.winner THEN mb.amount ELSE -mb.amount END
  FROM matches m
  WHERE mb.match_id = m.id AND m.status = 'completed' AND mb.result = 'pending';

  -- 2) Update the auto-fill trigger to be 'smart' (evaluate completed matches instantly)
  CREATE OR REPLACE FUNCTION trg_autofill_opponent_bet()
  RETURNS TRIGGER AS $$
  DECLARE
    v_participant_count INT;
    v_other_participant_id UUID;
    v_opposite_team TEXT;
    v_existing_bet_count INT;
    v_match_status TEXT;
    v_match_winner TEXT;
    v_new_result TEXT;
    v_new_profit BIGINT;
  BEGIN
    SELECT COUNT(id) INTO v_participant_count FROM participants WHERE is_active = true;
    
    IF v_participant_count = 2 THEN
      SELECT id INTO v_other_participant_id FROM participants WHERE id != NEW.participant_id AND is_active = true LIMIT 1;
      
      IF NEW.predicted_winner = 'team1' THEN
        v_opposite_team := 'team2';
      ELSE
        v_opposite_team := 'team1';
      END IF;
      
      SELECT COUNT(*) INTO v_existing_bet_count 
      FROM match_bets 
      WHERE match_id = NEW.match_id AND participant_id = v_other_participant_id;
      
      -- If they don't have a bet, insert the exact opposite bet
      IF v_existing_bet_count = 0 THEN
        -- Grab match info to see if we can resolve it instantly
        SELECT status, winner INTO v_match_status, v_match_winner 
        FROM matches WHERE id = NEW.match_id;

        IF (v_match_status = 'completed' OR v_match_status = 'settled') AND v_match_winner IS NOT NULL THEN
          -- Evaluate instantly
          IF v_opposite_team = v_match_winner THEN
            v_new_result := 'win';
            v_new_profit := NEW.amount;
          ELSE
            v_new_result := 'loss';
            v_new_profit := -NEW.amount;
          END IF;
        ELSE
          -- Default to pending
          v_new_result := 'pending';
          v_new_profit := 0;
        END IF;

        INSERT INTO match_bets (match_id, participant_id, predicted_winner, amount, result, profit_loss)
        VALUES (NEW.match_id, v_other_participant_id, v_opposite_team, NEW.amount, v_new_result, v_new_profit);
      END IF;
    END IF;
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Notification for postgrest just in case
  NOTIFY pgrst, 'reload schema';
