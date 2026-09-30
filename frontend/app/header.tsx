"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { supabase } from "@/lib/supabase";
import { BaseButton } from "@/components/base";

const NAV_LINK_CLASS =
  "font-mono text-xs tracking-wide text-fg underline underline-offset-4";

/** Shared link list, placed in both the desktop row and the mobile disclosure. */
function HeaderNav({
  role,
  className,
  onNavigate,
}: {
  role: UserRole | null;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main" className={className}>
      <Link href="/" className={NAV_LINK_CLASS} onClick={onNavigate}>
        Home
      </Link>
      <Link href="/podcasts" className={NAV_LINK_CLASS} onClick={onNavigate}>
        Podcasts
      </Link>
      {role === "ADMIN" ? (
        <Link href="/admin" className={NAV_LINK_CLASS} onClick={onNavigate}>
          Admin
        </Link>
      ) : null}
    </nav>
  );
}

/** Three rules when closed, a cross when open. Strokes follow `currentColor`. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {open ? (
        <>
          <line x1="3" y1="3" x2="13" y2="13" />
          <line x1="13" y1="3" x2="3" y2="13" />
        </>
      ) : (
        <>
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="12" x2="14" y2="12" />
        </>
      )}
    </svg>
  );
}

/**
 * One row at `md` and up; below `md` the links collapse into a disclosure that
 * expands in the document flow. The theme toggle stays visible at every width.
 * See docs/DECISIONS.md entry 23.
 */
export default function Header() {
  const { user, role, isLoading, signOut } = useAuth();
  const { mode, toggleMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="border-b border-fg px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="font-mono text-sm tracking-widest text-fg">
          Podplayer
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {isLoading ? null : user ? (
            <>
              <span className="hidden text-sm text-muted md:inline">{user.email}</span>
              <HeaderNav role={role} className="hidden items-center gap-4 md:flex" />
              <BaseButton
                className="hidden md:inline-flex"
                onClick={() => void signOut()}
              >
                Sign out
              </BaseButton>
            </>
          ) : (
            <BaseButton
              className="hidden md:inline-flex"
              onClick={() => void signIn()}
            >
              Sign in with Google
            </BaseButton>
          )}

          <BaseButton variant="outline" size="sm" onClick={toggleMode}>
            {mode === "light" ? "Dark" : "Light"}
          </BaseButton>

          <BaseButton
            variant="outline"
            size="sm"
            className="md:hidden"
            aria-expanded={menuOpen}
            aria-controls="header-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon open={menuOpen} />
          </BaseButton>
        </div>
      </div>

      {menuOpen && !isLoading ? (
        <div id="header-menu" className="mt-3 md:hidden">
          {user ? (
            <div className="flex flex-col items-start gap-3 border-t border-fg pt-3">
              <span className="text-sm break-all text-muted">{user.email}</span>
              <HeaderNav
                role={role}
                className="flex flex-col items-start gap-3"
                onNavigate={closeMenu}
              />
              <BaseButton
                className="w-full"
                onClick={() => {
                  closeMenu();
                  void signOut();
                }}
              >
                Sign out
              </BaseButton>
            </div>
          ) : (
            <div className="border-t border-fg pt-3">
              <BaseButton
                variant="cta"
                className="w-full"
                onClick={() => {
                  closeMenu();
                  void signIn();
                }}
              >
                Sign in with Google
              </BaseButton>
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}