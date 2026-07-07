import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type UserRole = "pending" | "approved" | "admin" | "denied";

export interface UserProfile {
  user_id: string;
  email: string | null;
  role: UserRole;
  token_budget: number;
  tokens_consumed: number;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);


const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function fetchProfile(_userId: string, accessToken: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error("fetchProfile /api/auth/me", res.status);
      return null;
    }
    const data = await res.json();
    return {
      user_id: data.user_id,
      email: data.email,
      role: data.role as UserRole,
      token_budget: data.token_budget ?? 50000,
      tokens_consumed: data.tokens_consumed ?? 0,
    };
  } catch (e) {
    console.error("fetchProfile exception:", e);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (sess: Session | null) => {
    if (!sess?.user?.id || !sess?.access_token) {
      setProfile(null);
      return;
    }
    const p = await fetchProfile(sess.user.id, sess.access_token);
    setProfile(p);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadProfile(sess).finally(() => setLoading(false));
      } else if (event === "INITIAL_SESSION") {
        loadProfile(sess).finally(() => setLoading(false));
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Handle implicit flow: parse access_token from URL hash directly
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token") ?? "";
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data }) => {
            if (data.session) {
              setSession(data.session);
              setUser(data.session.user);
              loadProfile(data.session).finally(() => setLoading(false));
              window.history.replaceState({}, "", window.location.pathname);
            }
          });
        return;
      }
    }

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (sess) {
        setSession(sess);
        setUser(sess.user);
        loadProfile(sess).finally(() => setLoading(false));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
  };

  const signInWithPassword = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signUpWithPassword = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return error?.message ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session) await loadProfile(session);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signInWithGoogle, signInWithGitHub, signInWithPassword, signUpWithPassword, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
