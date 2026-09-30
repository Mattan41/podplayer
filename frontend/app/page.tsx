"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { BaseButton, BaseCard } from "@/components/base";

const SIGN_IN_ERROR = "Sign in to see the counter";
const BACKEND_ERROR = "Could not reach the backend.";
const INCREMENT_ERROR = "Could not increment the counter.";

/** apiFetch throws this exact message when there is no Supabase session. */
function isNotAuthenticated(error: unknown): boolean {
  return error instanceof Error && error.message === "Not authenticated";
}

export default function Home() {
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
