import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { getPosition, savePosition } from "@/lib/api/playback";
import { PlaybackSourceProvider, usePlaybackSource, type PlaybackSource } from "@/lib/playback-source";
import { remotePlaybackSource } from "@/lib/playback-source-remote";

/*
 * Importing the API functions pulls in `lib/supabase`, which builds a client
 * from environment variables this test does not have. The client is not used
 * here, so it is replaced before the module graph loads.
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

afterEach(cleanup);

/*
 * A wiring test only. It checks that the source the player will consume is the
 * API layer's two functions and that the provider hands it to the hook. The
 * functions themselves are covered in lib/api/playback.test.ts.
 */
it("wires the API functions through the source the hook exposes", () => {
  expect(remotePlaybackSource.getPosition).toBe(getPosition);
  expect(remotePlaybackSource.savePosition).toBe(savePosition);

  let seen: PlaybackSource | undefined;
  function Probe() {
    seen = usePlaybackSource();
    return null;
  }

  render(
    <PlaybackSourceProvider source={remotePlaybackSource}>
      <Probe />
    </PlaybackSourceProvider>,
  );

  expect(seen).toBe(remotePlaybackSource);
});
