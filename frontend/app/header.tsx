"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const BUTTON_CLASS =
  "cursor-pointer rounded-none border border-fg px-3 py-1.5 font-mono text-xs tracking-wide text-fg transition-colors hover:bg-fg hover:text-bg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

export default function Header() {
  const { user, role, isLoading, signOut } = useAuth();

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
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
            <span className="hidden text-sm text-fg/70 sm:inline">{user.email}</span>
            {role === "ADMIN" ? (
              <Link
                href="/admin"
                className="font-mono text-xs tracking-wide text-fg underline underline-offset-4"
              >
                Admin
              </Link>
            ) : null}
            <button type="button" onClick={() => void signOut()} className={BUTTON_CLASS}>
              Sign out
            </button>
          </>
        ) : (
          <button type="button" onClick={() => void signIn()} className={BUTTON_CLASS}>
            Sign in with Google
          </button>
        )}
      </div>
    </header>
  );
}
