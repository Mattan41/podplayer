"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { supabase } from "@/lib/supabase";
import { BaseButton } from "@/components/base";

/**
 * Link in the desktop row: inline, underlined, no box.
 */
const INLINE_LINK_CLASS =
  "font-mono text-xs tracking-wide text-fg underline underline-offset-4";

/**
 * Route in the menu overlay: a full-width row that inverts on hover and on
 * keyboard focus, the same inversion `BaseButton`'s `outline` variant uses, so a
 * row reads as the same kind of control.
 *
 * The focus ring that the base controls share is deliberately not reused here.
 * An offset ring around a full-bleed row would collide with the panel border and
 * with the dividers between rows. Inversion is the restyle instead, and it is
 * high contrast: `fg` on `bg` measures 13.95:1 in light mode and 14.88:1 in
 * dark, per docs/DECISIONS.md entry 3.
 */
const MENU_ROW_CLASS =
  "block px-4 py-3 font-mono text-xs tracking-wide text-fg transition-colors hover:bg-fg hover:text-bg focus:outline-none focus-visible:bg-fg focus-visible:text-bg";

/**
 * The library routes, defined once and placed twice: inline in the desktop row,
 * and as rows inside the menu overlay. One list rather than two copies that can
 * drift apart. The caller owns the container layout and the link treatment.
 */
function HeaderNav({
  role,
  className,
  linkClassName,
  onNavigate,
}: {
  role: UserRole | null;
  className?: string;
  linkClassName: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main" className={className}>
      <Link href="/" className={linkClassName} onClick={onNavigate}>
        Home
      </Link>
      <Link href="/podcasts" className={linkClassName} onClick={onNavigate}>
        Podcasts
      </Link>
      {role === "ADMIN" ? (
        <Link href="/admin" className={linkClassName} onClick={onNavigate}>
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
 * Site header.
 *
 * One row at `md` and above: brand, e-mail, the routes inline, the session
 * action and the theme toggle. Below `md` the routes move into an overlay menu
 * opened by the icon button, while the session action and the theme toggle stay
 * in the row — the two shapes `[ Log in ] [ Dark ] [ ≡ ]` and
 * `[ Log out ] [ Light ] [ ≡ ]`. Short labels are what make that row fit: the
 * former "Sign in with Google" label measured 169 px, more than a 375 px
 * viewport can spare next to the toggle.
 *
 * The menu is a small overlay anchored under its own button rather than a panel
 * in the document flow: it holds only the routes, so opening it does not push
 * the page down, and it dismisses on an outside pointer press and on Escape.
 * See docs/DECISIONS.md entry 24, which supersedes entry 23.
 *
 * The overlay surface is opaque: `bg-bg`, a 2 px `border-fg` and sharp corners.
 * That is how this design language expresses "above" — separation is the thicker
 * line, never a shadow or a translucent blur (docs/STYLEGUIDE.md §6).
 */
export default function Header() {
  const { user, role, isLoading, signOut } = useAuth();
  const { mode, toggleMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // While the overlay is open: an outside pointer press or Escape closes it.
  // The listeners only exist while the menu is open.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="border-b border-fg px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="font-mono text-sm tracking-widest text-fg">
          Podplayer
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {!isLoading && user ? (
            <>
              <span className="hidden text-sm text-muted md:inline">{user.email}</span>
              <HeaderNav
                role={role}
                className="hidden items-center gap-4 md:flex"
                linkClassName={INLINE_LINK_CLASS}
              />
            </>
          ) : null}

          {isLoading ? null : user ? (
            <BaseButton onClick={() => void signOut()}>Log out</BaseButton>
          ) : (
            <BaseButton onClick={() => void signIn()}>Log in</BaseButton>
          )}

          <BaseButton variant="outline" size="sm" onClick={toggleMode}>
            {mode === "light" ? "Dark" : "Light"}
          </BaseButton>

          {/*
            The routes are the only thing that needs a menu, and they exist only
            for a signed-in user, so the trigger renders exactly when it has
            content. The wrapper anchors the overlay under the button.
          */}
          {!isLoading && user ? (
            <div ref={menuRef} className="relative md:hidden">
              <BaseButton
                variant="outline"
                size="sm"
                aria-expanded={menuOpen}
                aria-controls="header-menu"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MenuIcon open={menuOpen} />
              </BaseButton>

              {menuOpen ? (
                <div
                  id="header-menu"
                  className="absolute right-0 top-full z-20 mt-2 w-48 rounded-base border-2 border-fg bg-bg"
                >
                  <HeaderNav
                    role={role}
                    className="flex flex-col divide-y divide-fg"
                    linkClassName={MENU_ROW_CLASS}
                    onNavigate={closeMenu}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}