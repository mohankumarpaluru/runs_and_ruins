import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabaseClient';
import { verifyPassword } from '../lib/auth';
import type { AppUser, AuthSession, LoginResult } from '../types/auth';

// ─── Session storage keys ──────────────────────────────────────
const SESSION_KEY_PERSIST = 'rr_auth_session';    // localStorage — survives close
const SESSION_KEY_TEMP    = 'rr_auth_session_tmp'; // sessionStorage — clears on close

// ─── Context shape ─────────────────────────────────────────────
interface AuthContextValue {
  currentUser: AppUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helper: read session from storage ─────────────────────────
function readSession(): AuthSession | null {
  try {
    const raw =
      localStorage.getItem(SESSION_KEY_PERSIST) ||
      sessionStorage.getItem(SESSION_KEY_TEMP);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

// ─── Helper: persist session ────────────────────────────────────
function saveSession(session: AuthSession): void {
  const raw = JSON.stringify(session);
  if (session.rememberMe) {
    localStorage.setItem(SESSION_KEY_PERSIST, raw);
    sessionStorage.removeItem(SESSION_KEY_TEMP);
  } else {
    sessionStorage.setItem(SESSION_KEY_TEMP, raw);
    localStorage.removeItem(SESSION_KEY_PERSIST);
  }
}

// ─── Helper: clear session ──────────────────────────────────────
function clearSession(): void {
  localStorage.removeItem(SESSION_KEY_PERSIST);
  sessionStorage.removeItem(SESSION_KEY_TEMP);
}

// ─── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading]     = useState(true);

  // Rehydrate session on mount
  useEffect(() => {
    const session = readSession();
    if (!session) {
      setIsLoading(false);
      return;
    }

    // Verify the user still exists and is active in DB
    supabase
      .from('app_users')
      .select('id, username, display_name, role, participant_id, is_active')
      .eq('id', session.user.id)
      .eq('is_active', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          clearSession();
          setCurrentUser(null);
        } else {
          setCurrentUser(data as AppUser);
        }
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean): Promise<LoginResult> => {
      // Fetch user by username
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, display_name, role, participant_id, is_active, password_hash')
        .eq('username', username.toLowerCase().trim())
        .single();

      if (error || !data) {
        return { success: false, error: 'Invalid username or password.' };
      }

      if (!data.is_active) {
        return { success: false, error: 'Your account has been deactivated. Contact admin.' };
      }

      const ok = await verifyPassword(password, data.password_hash);
      if (!ok) {
        return { success: false, error: 'Invalid username or password.' };
      }

      const user: AppUser = {
        id:             data.id,
        username:       data.username,
        display_name:   data.display_name,
        role:           data.role,
        participant_id: data.participant_id,
        is_active:      data.is_active,
      };

      const session: AuthSession = { user, loggedInAt: Date.now(), rememberMe };
      saveSession(session);
      setCurrentUser(user);

      // Update last_login_at (best-effort, no await)
      supabase
        .from('app_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {});

      return { success: true, user };
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
    setCurrentUser(null);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
