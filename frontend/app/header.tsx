"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { supabase } from "@/lib/supabase";
import { BaseButton } from "@/components/base";

export default function Header() {
  const { user, role, isLoading, signOut } = useAuth();
  const { mode, toggleMode } = useTheme();

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b border-fg px-6 py-3">
      <Link href="/" className="font-mono text-sm tracking-widest text-fg">
        Podplayer
      </Link>

      <div className="flex items-center gap-4">
        {isLoading ? null : user ? (
          <>
            <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
            <Link
              href="/"
              className="font-mono text-xs tracking-wide text-fg underline underline-offset-4"
            >
              Home
            </Link>
            <Link
              href="/podcasts"
              className="font-mono text-xs tracking-wide text-fg underline underline-offset-4"
            >
              Podcasts
            </Link>
            {role === "ADMIN" ? (
              <Link
                href="/admin"
                className="font-mono text-xs tracking-wide text-fg underline underline-offset-4"
              >
                Admin
              </Link>
            ) : null}
            <BaseButton onClick={() => void signOut()}>Sign out</BaseButton>
          </>
        ) : (
          <BaseButton onClick={() => void signIn()}>Sign in with Google</BaseButton>
        )}
        <BaseButton variant="outline" size="sm" onClick={toggleMode}>
          {mode === "light" ? "Dark" : "Light"}
        </BaseButton>
      </div>
    </header>
  );
}
