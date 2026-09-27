"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export type UserRole = "USER" | "ADMIN";

export type AuthUser = {
  email: string;
  role: UserRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const loadUser = async (nextSession: Session | null) => {
      if (!nextSession) {
        if (!isCancelled) {
          setUser(null);
        }
        return;
      }

      try {
        const response = await apiFetch("/api/me");
        const nextUser = response.ok ? ((await response.json()) as AuthUser) : null;
        if (!isCancelled) {
          setUser(nextUser);
        }
      } catch {
        if (!isCancelled) {
          setUser(null);
        }
      }
    };

    const initialise = async () => {
      const { data } = await supabase.auth.getSession();
      if (isCancelled) {
        return;
      }
      setSession(data.session);
      await loadUser(data.session);
      if (!isCancelled) {
        setIsLoading(false);
      }
    };

    void initialise();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isCancelled) {
        return;
      }
      setSession(nextSession);
      // Deviates deliberately from the naive form: supabase-js documents that
      // calling its auth API synchronously inside this callback can deadlock,
      // and apiFetch reads the session. Deferring leaves that lock scope.
      window.setTimeout(() => {
        void loadUser(nextSession);
      }, 0);
    });

    return () => {
      isCancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      role: user?.role ?? null,
      isLoading,
      signOut,
    }),
    [user, session, isLoading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
