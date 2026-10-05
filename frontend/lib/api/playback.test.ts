import { afterEach, describe, expect, it, vi } from "vitest";

import { getPosition, PlaybackApiError, savePosition } from "@/lib/api/playback";

/*
 * `apiFetch` needs a session, so the Supabase client is replaced with one that
 * always resolves. The network itself is stubbed per test: no server runs.
 */
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPosition", () => {
  it("returns null on 404 without reading the body", async () => {
    const json = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json }));

    await expect(getPosition(7)).resolves.toBeNull();
    expect(json).not.toHaveBeenCalled();
  });

  it("throws PlaybackApiError with the status and the detail on 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: "positionSeconds must not be negative" }),
      }),
    );

    const error = await getPosition(7).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PlaybackApiError);
    expect(error).toMatchObject({
      status: 400,
      message: "positionSeconds must not be negative",
    });
  });
});

describe("savePosition", () => {
  it("sends the body as JSON with the right headers and returns the DTO", async () => {
    const dto = {
      episodeId: 7,
      positionSeconds: 30,
      playedAt: "2026-10-05T19:31:07Z",
      completed: false,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => dto,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(savePosition(7, 30, false)).resolves.toEqual(dto);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/playback\/7$/);
    expect(init).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ positionSeconds: 30, completed: false }),
    });
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });
});
