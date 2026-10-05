import { afterEach, describe, expect, it, vi } from "vitest";

import { PodcastApiError, subscribe } from "@/lib/api/podcast";

/*
 * The Supabase client is the only reason `apiFetch` needs a session, and the
 * session is not what these tests are about, so it is replaced with one that
 * always resolves. The fetch itself is stubbed per test: no server runs.
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

/*
 * `messageFrom` is module-private, so it is exercised through a public wrapper
 * (`subscribe`), which is how the app reaches it. These two tests pin the two
 * branches a response can take: a JSON problem body, and a body that is not
 * JSON at all.
 */
describe("the message a refused request produces", () => {
  it("uses the backend's problem detail as the error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: "A feed URL must be an absolute http or https URL" }),
      }),
    );

    const error = await subscribe("notaurl").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PodcastApiError);
    expect(error).toMatchObject({
      status: 400,
      message: "A feed URL must be an absolute http or https URL",
    });
  });

  it("names the status when the body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new SyntaxError("Unexpected token '<'");
        },
      }),
    );

    const error = await subscribe("https://example.org/feed.xml").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PodcastApiError);
    expect(error).toMatchObject({ status: 500, message: "Request failed with status 500" });
  });
});
