"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/service-worker";

/**
 * Registers the service worker after the first paint, and renders nothing.
 *
 * Mounted once in `frontend/app/layout.tsx`. Registration is limited to
 * production: a caching worker in `next dev` would serve stale shells while
 * editing, which is a well-known source of confusing local bugs, and the
 * deployment is the only place the worker is wanted.
 *
 * It is a client component because it holds an effect; the layout that renders
 * it is a server component.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    void registerServiceWorker();
  }, []);

  return null;
}
