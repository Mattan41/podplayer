import { afterEach, describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "@/lib/service-worker";

/*
 * The registration path is the one thing about the worker that is testable
 * without a browser: that it points at `/sw.js`, that a browser without the API
 * is left alone, and that a rejected registration is swallowed rather than
 * thrown into the app. The worker's caching behaviour is verified on a device,
 * per the phase's acceptance criteria.
 */
describe("registerServiceWorker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers the app-shell worker from the site root", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { serviceWorker: { register } });

    await registerServiceWorker();

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("does nothing when service workers are unavailable", async () => {
    vi.stubGlobal("navigator", {});

    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it("does not throw when registration fails", async () => {
    const register = vi.fn().mockRejectedValue(new Error("blocked"));
    vi.stubGlobal("navigator", { serviceWorker: { register } });

    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });
});
