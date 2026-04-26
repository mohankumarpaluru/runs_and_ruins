-- =============================================================
-- Migration 7: Add 'cancelled' match status + fix created_at
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. Allow 'cancelled' as a match status
ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_status_check;

ALTER TABLE matches
  ADD CONSTRAINT matches_status_check
    CHECK (status IN ('scheduled', 'completed', 'settled', 'cancelled'));

-- 2. Fix app_users created_at dates to 4th April 2026
--    (adjust timestamps to match when the app actually started)
UPDATE app_users
SET created_at = '2026-04-04T00:00:00+00:00'
WHERE created_at > '2026-04-04T00:00:00+00:00';

-- 3. Verify
SELECT username, role, created_at FROM app_users ORDER BY created_at;
SELECT match_no, team1, team2, status FROM matches ORDER BY match_no LIMIT 5;
