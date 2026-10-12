import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  MEDIA_SESSION_SEEK_STEP_SECONDS,
  useMediaSession,
  type MediaSessionControls,
} from "@/lib/media-session";

/*
 * jsdom has no Media Session implementation, so the API is stubbed here. The
 * assertions are the three things the phase promises: metadata on episode
 * change, the four action handlers wired to the player's controls, and the
 * position state on the scrubber cadence.
 */

type ActionHandler = (details: MediaSessionActionDetails) => void;

class MediaMetadataStub {
  constructor(public readonly init: MediaMetadataInit) {}
}

function createMediaSessionStub() {
  const handlers = new Map<string, ActionHandler | null>();
  return {
    metadata: null as MediaMetadata | null,
    setActionHandler: vi.fn((action: string, handler: ActionHandler | null) => {
      handlers.set(action, handler);
    }),
    setPositionState: vi.fn(),
    handlers,
  };
}

type Stub = ReturnType<typeof createMediaSessionStub>;

let stub: Stub;

function mount(overrides: Partial<MediaSessionControls> = {}) {
  stub = createMediaSessionStub();
  Object.defineProperty(navigator, "mediaSession", {
    value: stub as unknown as MediaSession,
    configurable: true,
    writable: true,
  });
  vi.stubGlobal("MediaMetadata", MediaMetadataStub);

  const play = vi.fn();
  const pause = vi.fn();
  const seekRelative = vi.fn();

  function Harness() {
    useMediaSession({
      title: "Episode one",
      artwork: "https://example.test/cover.png",
      currentTime: 10,
      duration: 100,
      play,
      pause,
      seekRelative,
      ...overrides,
    });
    return null;
  }

  const view = render(<Harness />);
  return { view, play, pause, seekRelative };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useMediaSession", () => {
  it("sets the lock-screen metadata from the episode", () => {
    mount();

    const metadata = stub.metadata as unknown as MediaMetadataStub;
    expect(metadata.init.title).toBe("Episode one");
    expect(metadata.init.artwork).toEqual([{ src: "https://example.test/cover.png" }]);
  });

  it("clears the metadata when there is no episode", () => {
    mount({ title: null, artwork: null });

    expect(stub.metadata).toBeNull();
  });

  it("registers the four transport handlers", () => {
    mount();

    for (const action of ["play", "pause", "seekbackward", "seekforward"]) {
      expect(stub.setActionHandler).toHaveBeenCalledWith(action, expect.any(Function));
    }
  });

  it("routes play, pause and skip through the player controls", () => {
    const { play, pause, seekRelative } = mount();

    stub.handlers.get("play")?.({ action: "play" } as MediaSessionActionDetails);
    stub.handlers.get("pause")?.({ action: "pause" } as MediaSessionActionDetails);
    stub.handlers.get("seekforward")?.({ action: "seekforward" } as MediaSessionActionDetails);
    stub.handlers.get("seekbackward")?.({ action: "seekbackward" } as MediaSessionActionDetails);

    expect(play).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(seekRelative).toHaveBeenCalledWith(MEDIA_SESSION_SEEK_STEP_SECONDS);
    expect(seekRelative).toHaveBeenCalledWith(-MEDIA_SESSION_SEEK_STEP_SECONDS);
  });

  it("publishes the position state on the scrubber cadence", () => {
    mount();

    expect(stub.setPositionState).toHaveBeenCalledWith({
      duration: 100,
      playbackRate: 1,
      position: 10,
    });
  });

  it("does nothing when the Media Session API is absent", () => {
    delete (navigator as unknown as { mediaSession?: unknown }).mediaSession;

    expect(() => render(<HarnessWithoutSession />)).not.toThrow();
  });
});

function HarnessWithoutSession() {
  useMediaSession({
    title: "Episode one",
    artwork: null,
    currentTime: 0,
    duration: 0,
    play: () => {},
    pause: () => {},
    seekRelative: () => {},
  });
  return null;
}
