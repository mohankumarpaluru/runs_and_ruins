-- If needed in Supabase
create extension if not exists pgcrypto;

-- 1) Participants
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

-- 2) Match schedule / match state
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  match_no int not null unique,
  match_date date not null,
  team1 text not null,
  team2 text not null,
  venue text,
  match_time time,
  stage text not null default 'League',
  winner text check (winner in ('team1', 'team2')) default null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'settled')),
  team1_score text default null,
  team2_score text default null,
  is_completed boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 3) Per-match participant bets
create table if not exists match_bets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  predicted_winner text not null check (predicted_winner in ('team1', 'team2')),
  amount numeric(10,2) not null check (amount > 0),
  result text not null default 'pending'
    check (result in ('win', 'loss', 'pending')),
  profit_loss numeric(10,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (match_id, participant_id)
);

-- 4) Miscellaneous manual bets / side bets
-- Use this for ad-hoc entries not tied to a specific IPL match.
create table if not exists misc_bets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  winner_participant_id uuid not null references participants(id) on delete restrict,
  loser_participant_id uuid not null references participants(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'settled'
    check (status in ('pending', 'settled', 'void')),
  match_id uuid references matches(id) on delete set null,
  bet_date date not null default current_date,
  settled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- 5) Editable preset bet rules
-- The app should auto-suggest the bet amount by looking at team membership.
-- Priority 1 = more specific rules, higher number = fallback.
create table if not exists bet_amount_rules (
  id uuid primary key default gen_random_uuid(),
  rule_name text not null,
  teams text[] not null default '{}'::text[],
  amount numeric(10,2) not null check (amount > 0),
  priority int not null default 100,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Helpful indexes
create index if not exists idx_matches_match_date on matches (match_date desc);
create index if not exists idx_matches_status on matches (status);
create index if not exists idx_match_bets_match_id on match_bets (match_id);
create index if not exists idx_match_bets_participant_id on match_bets (participant_id);
create index if not exists idx_misc_bets_bet_date on misc_bets (bet_date desc);
create index if not exists idx_bet_amount_rules_active on bet_amount_rules (is_active, priority);


-- Step 1: Add the missing column
ALTER TABLE misc_bets
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES matches(id) ON DELETE SET NULL;
-- Step 2: Add the index (matches what's in your migration file)
CREATE INDEX IF NOT EXISTS idx_misc_bets_match_id ON misc_bets (match_id);
-- Step 3: Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';