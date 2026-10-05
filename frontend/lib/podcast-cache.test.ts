import { afterEach, beforeEach, expect, it } from "vitest";

import { getCached, setCached } from "@/lib/podcast-cache";

/*
 * jsdom provides `localStorage`; each test starts and ends with an empty one so
 * the cases cannot leak into each other.
 */
beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

it("returns the value that was written, stamped with the time it was written", () => {
  setCached("podplayer.test.roundtrip", { id: 7, title: "Episode One" });

  const entry = getCached<{ id: number; title: string }>("podplayer.test.roundtrip");

  expect(entry?.value).toEqual({ id: 7, title: "Episode One" });
  expect(typeof entry?.storedAt).toBe("number");
});

it("returns null for a key that was never written", () => {
  expect(getCached("podplayer.test.missing")).toBeNull();
});

it("returns null, rather than throwing, for a value that is not valid JSON", () => {
  window.localStorage.setItem("podplayer.test.broken", "<html>not a cache entry</html>");

  expect(() => getCached("podplayer.test.broken")).not.toThrow();
  expect(getCached("podplayer.test.broken")).toBeNull();
});
