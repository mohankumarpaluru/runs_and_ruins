-- =============================================================
-- Migration 6: Link app_users to participants
-- Run this in Supabase SQL Editor BEFORE loading the Profile page
-- =============================================================

-- Link sahitya login → Sahitya participant record
UPDATE app_users
SET participant_id = (SELECT id FROM participants WHERE name = 'Sahitya' LIMIT 1)
WHERE username = 'sahitya'
  AND participant_id IS NULL;

-- Link durgesh login → Durgesh participant record
UPDATE app_users
SET participant_id = (SELECT id FROM participants WHERE name = 'Durgesh' LIMIT 1)
WHERE username = 'durgesh'
  AND participant_id IS NULL;

-- Verify (should show 2 rows with participant_id set):
SELECT username, display_name, role, participant_id FROM app_users ORDER BY created_at;
