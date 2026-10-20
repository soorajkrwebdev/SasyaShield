import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  checkSupabaseConnection,
  connectionUiLabel,
  type ConnectionUiStatus,
  type SupabaseHealthResult,
} from '../lib/supabaseHealth';
import { UserProfile, FarmingType } from '../types';

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  state?: string;
  district?: string;
  village?: string;
  farmingType?: FarmingType;
}

export interface ConnectionState {
  status: ConnectionUiStatus;
  label: string;
  detail: string;
  code: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  connection: ConnectionState;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const checkingConnection: ConnectionState = {
  status: 'checking',
  label: connectionUiLabel('checking'),
  detail: 'Checking connection...',
  code: 'checking',
};

function healthToConnection(result: SupabaseHealthResult): ConnectionState {
  return {
    status: result.status,
    label: result.label,
    detail: result.message,
    code: result.code,
  };
}

function notConfiguredAuthError(connection: ConnectionState): string {
  if (connection.detail) return connection.detail;
  return 'Configuration missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in .env.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<ConnectionState>(checkingConnection);

  const fetchProfile = async (userId: string, email?: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error.message);
        if (error.code === '42501' || error.message.toLowerCase().includes('permission')) {
          setConnection({
            status: 'permission_error',
            label: connectionUiLabel('permission_error'),
            detail: `Database permission error while loading profile: ${error.message}`,
            code: 'permission_error',
          });
        }
        return;
      }

      if (data) {
        if (data.id !== userId) {
          console.error('[AuthContext] Profile id does not match auth.uid()');
          return;
        }
        setProfile({ ...data, email });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const meta = sessionData.session?.user.user_metadata ?? {};
      const insertPayload = {
        id: userId,
        full_name: (meta.full_name as string) || 'Farmer',
        phone: (meta.phone as string) || null,
        state: (meta.state as string) || null,
        district: (meta.district as string) || null,
        village: (meta.village as string) || null,
        preferred_language: (meta.preferred_language as string) || 'en',
        farming_type: (meta.farming_type as FarmingType) || 'mixed',
      };

      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert(insertPayload)
        .select('*')
        .single();

      if (insertError) {
        console.error('[AuthContext] Profile insert failed:', insertError.message);
        return;
      }

      if (created && created.id === userId) {
        setProfile({ ...created, email });
      }
    } catch (err) {
      console.error('[AuthContext] Failed to load profile:', err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      setConnection(checkingConnection);

      const health = await checkSupabaseConnection();
      if (cancelled) return;

      setConnection(healthToConnection(health));

      if (!isSupabaseConfigured || !supabase || health.code !== 'ok') {
        setLoading(false);
        return;
      }

      const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) {
        setConnection({
          status: 'connection_failed',
          label: connectionUiLabel('connection_failed'),
          detail: `getSession() failed: ${sessionError.message}`,
          code: 'session_error',
        });
        setLoading(false);
        return;
      }

      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        await fetchProfile(initialSession.user.id, initialSession.user.email);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, nextSession) => {
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          if (nextSession?.user) {
            await fetchProfile(nextSession.user.id, nextSession.user.email);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }
      );
      unsubscribe = () => subscription.unsubscribe();
      setLoading(false);
    };

    void init();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: notConfiguredAuthError(connection) };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (data: SignUpData): Promise<{ error: string | null }> => {
    if (!supabase) return { error: notConfiguredAuthError(connection) };

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone ?? null,
          state: data.state ?? null,
          district: data.district ?? null,
          village: data.village ?? null,
          preferred_language: 'en',
          farming_type: data.farmingType ?? 'mixed',
        },
      },
    });

    if (error) return { error: error.message };

    // With email confirmations enabled, signUp creates the user but does not
    // establish a session. Supabase sends a confirmation email containing a
    // link. The user must click that link before they can sign in.
    if (authData.user && authData.session) {
      await fetchProfile(authData.user.id, data.email);
    }

    return { error: null };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: notConfiguredAuthError(connection) };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error ? error.message : null };
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error: string | null }> => {
    if (!supabase || !user) return { error: 'Authentication required' };

    // Defense-in-depth: strip server-managed identity and read-only computed
    // fields so a stale caller cannot swap id or overwrite created_at/email.
    const { id: _id, email: _email, created_at: _ca, ...safe } = updates;
    const { error } = await supabase
      .from('profiles')
      .update({ ...safe, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) return { error: error.message };
    setProfile(prev => (prev ? { ...prev, ...safe } : null));
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isConfigured: connection.status === 'connected',
        connection,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
