/**
 * Seed default app_users into Supabase on app boot.
 * Idempotent — skips rows that already exist.
 *
 * Default accounts:
 *   admin    / runs2026  → role: admin
 *   sahitya  / runs2026  → role: participant
 *   durgesh  / durgesh   → role: participant
 */

import { supabase } from './supabaseClient';
import { hashPassword } from './auth';

interface SeedUser {
  username: string;
  display_name: string;
  password: string;
  role: 'admin' | 'participant' | 'readonly';
}

const SEED_USERS: SeedUser[] = [
  { username: 'admin',   display_name: 'Admin',   password: 'runs2026', role: 'admin' },
  { username: 'sahitya', display_name: 'Sahitya', password: 'runs2026', role: 'participant' },
  { username: 'durgesh', display_name: 'Durgesh', password: 'durgesh',  role: 'participant' },
];

export async function seedDefaultUsers(): Promise<void> {
  try {
    // Fetch existing usernames to avoid duplicates
    const { data: existing } = await supabase
      .from('app_users')
      .select('username');

    const existingUsernames = new Set((existing ?? []).map((u: { username: string }) => u.username));

    const toInsert = await Promise.all(
      SEED_USERS
        .filter((u) => !existingUsernames.has(u.username))
        .map(async (u) => ({
          username: u.username,
          display_name: u.display_name,
          password_hash: await hashPassword(u.password),
          role: u.role,
        }))
    );

    if (toInsert.length === 0) return;

    const { error } = await supabase.from('app_users').insert(toInsert);
    if (error) console.error('[seedUsers] Insert failed:', error.message);
  } catch (err) {
    console.error('[seedUsers] Unexpected error:', err);
  }
}
