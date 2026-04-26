-- =============================================================
-- Migration 5: App Users (Authentication)
-- Custom auth table — no Supabase Auth required
-- Passwords stored as SHA-256 hex strings (hashed client-side)
-- =============================================================

create table if not exists app_users (
  id            uuid        primary key default gen_random_uuid(),
  username      text        not null unique,
  display_name  text        not null,
  password_hash text        not null,  -- SHA-256 hex digest
  role          text        not null default 'participant'
                              check (role in ('admin', 'participant', 'readonly')),
  participant_id uuid       references participants(id) on delete set null,
  is_active     boolean     not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default timezone('utc', now())
);

-- Index for fast login lookups
create index if not exists idx_app_users_username on app_users (username);
create index if not exists idx_app_users_role     on app_users (role);

-- NOTE: Default users are seeded by the app at runtime (seedUsers.ts)
-- because password hashing happens in the browser (crypto.subtle).
-- The app checks on load and inserts only if they don't exist.
