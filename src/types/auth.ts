// Auth-specific TypeScript types

export type UserRole = 'admin' | 'participant' | 'readonly';

export interface AppUser {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  participant_id: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at?: string;
}

export interface AppUserWithHash extends AppUser {
  password_hash: string;
}

export interface AuthSession {
  user: AppUser;
  loggedInAt: number;  // Unix timestamp
  rememberMe: boolean;
}

export interface LoginResult {
  success: boolean;
  user?: AppUser;
  error?: string;
}
