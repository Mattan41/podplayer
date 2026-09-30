"use client";

import { useEffect, useState } from "react";
import HatmanWaking from "@/components/hatman-waking";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const SHOW_AFTER_MS = 2000;
const HIDE_AFTER_MS = 30000;

/*
 * One warm-up request per page load, however many times the effect runs.
 * React StrictMode mounts effects twice in development; memoizing the promise
 * keeps the backend from seeing a second call for a purely client-side reason.
 * The promise is not the result: the response body is discarded.
 */
let warmUpRequest: Promise<unknown> | null = null;

function warmUpBackend(): Promise<unknown> {
  if (warmUpRequest === null) {
    warmUpRequest = fetch(`${API_URL}/health`, { cache: "no-store" });
  }
  return warmUpRequest;
}

/**
 * A notice shown while the backend is cold-starting.
 *
 * Cloud Run runs with `--min-instances=0`, so the first request after idle can
 * block for 20+ seconds. This component fires the warm-up request to `/health`
 * on mount. If the request has not settled within two seconds the hatman
 * appears; it disappears the moment the request settles, or after thirty
 * seconds, whichever comes first. A warm backend answers in milliseconds, so
 * the notice never paints in that case.
 *
 * The warm-up lives here rather than in `layout.tsx` because the layout is a
 * server component and cannot hold an effect; this is the small client child
 * the layout renders.
 */
export default function WakingNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const showTimer = setTimeout(() => setIsVisible(true), SHOW_AFTER_MS);
    const hideTimer = setTimeout(() => setIsVisible(false), HIDE_AFTER_MS);
    const clearTimers = () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };

    const warmUp = async () => {
      try {
        await warmUpBackend();
      } catch {
        /*
         * Swallowed on purpose: a failed warm-up is not the notice's business.
         * The component's own requests surface their errors where they belong,
         * and the notice simply goes away.
         */
      } finally {
        if (!isCancelled) {
          clearTimers();
          setIsVisible(false);
        }
      }
    };

    void warmUp();

    return () => {
      isCancelled = true;
      clearTimers();
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 border border-fg bg-bg px-4 py-3 rounded-base"
    >
      <HatmanWaking className="h-10 w-10 text-fg hatman-hover" />
      <p className="text-sm">Waking up the server — this may take a minute. Sit tight.</p>
    </div>
  );
}
