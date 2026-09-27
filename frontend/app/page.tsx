"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

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
      <section className="w-full max-w-md rounded-none border border-fg bg-bg p-8">
        <p className="text-xs tracking-widest text-fg/70">Walking skeleton</p>
        <h1 className="mt-2 font-mono text-2xl">Counter</h1>
        <p className="mt-1 text-sm text-fg/70">
          Verifies that the frontend, backend and Supabase are connected.
        </p>

        <div className="mt-8 rounded-none border border-fg p-6">
          <span className="text-sm text-fg/70">Current count</span>
          <p className="mt-1 font-mono text-5xl tabular-nums">
            {isLoading ? "…" : (count ?? "–")}
          </p>
        </div>

        <button
          type="button"
          onClick={increment}
          disabled={isLoading || isIncrementing}
          className="mt-6 w-full cursor-pointer rounded-none border-2 border-cta bg-cta px-6 py-3 font-mono text-sm tracking-wide text-bg transition-colors hover:bg-bg hover:text-cta focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isIncrementing ? "Incrementing…" : "Increment"}
        </button>

        {error ? (
          <p className="mt-4 rounded-none border border-fg p-3 text-sm text-fg">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
