"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BaseButton, BaseCard } from "@/components/base";

const SIGN_IN_ERROR = "Sign in to see the counter";
const BACKEND_ERROR = "Could not reach the backend.";
const INCREMENT_ERROR = "Could not increment the counter.";

/**
 * The key `public/404.html` uses to hand a path it could not serve back to the
 * app. Both sides must agree on the string; it is a private detail of the two
 * files, not configuration.
 *
 * Note that `public/404.html` does not survive the export: Next writes its own
 * `out/404.html` from the `_not-found` route, so this handshake is currently
 * unreachable in the deployed artifact. See `docs/DECISIONS.md` entry 18.
 */
const SPA_FALLBACK_KEY = "spa-fallback-path";

/** apiFetch throws this exact message when there is no Supabase session. */
function isNotAuthenticated(error: unknown): boolean {
  return error instanceof Error && error.message === "Not authenticated";
}

export default function Home() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIncrementing, setIsIncrementing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchCount = async () => {
      try {
        const response = await apiFetch("/api/counter");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const value = (await response.json()) as number;
        if (!isCancelled) {
          setCount(value);
          setError(null);
        }
      } catch (fetchError) {
        if (!isCancelled) {
          setError(isNotAuthenticated(fetchError) ? SIGN_IN_ERROR : BACKEND_ERROR);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchCount();

    return () => {
      isCancelled = true;
    };
  }, []);

  /*
   * Restores a path that the static host could not serve.
   *
   * A hard reload on a path with no file behind it, /podcasts/42 for instance,
   * is answered by public/404.html, which stores the requested path and redirects
   * to "/". This page is where that redirect lands, so the restore happens here:
   * replaceState rewrites the address bar, and router.replace makes Next render
   * the restored route instead of leaving the counter rendered under a podcast
   * URL.
   *
   * Unreachable as things stand, because the export replaces public/404.html with
   * Next's own not-found shell, so nothing ever writes the key. It is kept
   * because it is the working mechanism the moment the deploy copies that file
   * back over the generated one. See docs/DECISIONS.md entry 18.
   */
  useEffect(() => {
    const stored = window.sessionStorage.getItem(SPA_FALLBACK_KEY);
    if (!stored) {
      return;
    }
    window.sessionStorage.removeItem(SPA_FALLBACK_KEY);
    // Only our own 404.html writes this, and only ever an own-origin path.
    if (!stored.startsWith("/")) {
      return;
    }
    window.history.replaceState(null, "", stored);
    router.replace(stored);
  }, [router]);

  const increment = async () => {
    setIsIncrementing(true);
    setError(null);
    try {
      const response = await apiFetch("/api/counter/increment", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      setCount((await response.json()) as number);
    } catch (incrementError) {
      setError(isNotAuthenticated(incrementError) ? SIGN_IN_ERROR : INCREMENT_ERROR);
    } finally {
      setIsIncrementing(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <BaseCard className="w-full max-w-md p-8">
        <p className="text-xs tracking-widest text-muted">Walking skeleton</p>
        <h1 className="mt-2 font-mono text-2xl">Counter</h1>
        <p className="mt-1 text-sm text-muted">
          Verifies that the frontend, backend and Supabase are connected.
        </p>

        <BaseCard className="mt-8 p-6">
          <span className="text-sm text-muted">Current count</span>
          <p className="mt-1 font-mono text-5xl tabular-nums">
            {isLoading ? "…" : (count ?? "–")}
          </p>
        </BaseCard>

        <BaseButton
          variant="cta"
          size="md"
          onClick={increment}
          disabled={isLoading || isIncrementing}
          className="mt-6 w-full"
        >
          {isIncrementing ? "Incrementing…" : "Increment"}
        </BaseButton>

        {error ? (
          <BaseCard className="mt-4 p-3">
            <p className="text-sm">{error}</p>
          </BaseCard>
        ) : null}

        {/*
         * A discoverable path to the library. The counter stays the landing page
         * and keeps its role as a health check; when it is removed, this link is
         * replaced by the podcast list itself.
         */}
        <Link
          href="/podcasts"
          className="mt-6 inline-block font-mono text-xs tracking-wide text-fg underline underline-offset-4"
        >
          Podcasts
        </Link>
      </BaseCard>
    </main>
  );
}
