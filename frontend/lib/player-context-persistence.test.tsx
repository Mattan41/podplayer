import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import type { PlaybackStateDto } from "@/lib/api/playback";
import type { EpisodeDto } from "@/lib/api/podcast";
import { PlayerProvider, usePlayer, type PlayerContextValue } from "@/lib/player-context";
import { PlaybackSourceProvider, type PlaybackSource } from "@/lib/playback-source";

/*
 * Phase E: the provider persists position on four events and restores it when an
 * episode starts. The provider is driven through `usePlayer` and a fake `<audio>`
 * element attached to the shared `audioRef`; a mocked `PlaybackSource` stands in
 * for the network, so no request is made and the captured writes are exact.
 */
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** `HTMLMediaElement.HAVE_METADATA`. */
const HAVE_METADATA = 1;

function makeEpisode(id: number): EpisodeDto {
  return {
    id,
    guid: `guid-${id}`,
    title: `Episode ${id}`,
    description: null,
    audioUrl: `https://example.org/audio/${id}.mp3`,
    publishedAt: null,
    durationSeconds: 600,
    imageUrl: null,
  };
}

function storedDto(positionSeconds: number, completed: boolean): PlaybackStateDto {
  return {
    episodeId: 7,
    positionSeconds,
    playedAt: "2026-10-05T19:31:07Z",
    completed,
  };
}

/** The bare surface the provider touches on the element; no real one is needed. */
type FakeAudio = {
  src: string;
  currentTime: number;
  duration: number;
  readyState: number;
  paused: boolean;
  currentSrc: string;
  play: () => Promise<void>;
  pause: () => void;
  load: () => void;
  removeAttribute: (name: string) => void;
};

function makeAudio(overrides: Partial<FakeAudio> = {}): HTMLAudioElement {
  const audio: FakeAudio = {
    src: "",
    currentTime: 0,
    duration: 600,
    readyState: HAVE_METADATA,
    paused: true,
    currentSrc: "",
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    ...overrides,
  };
  return audio as unknown as HTMLAudioElement;
}

function makeSource(stored: PlaybackStateDto | null = null) {
  return {
    getPosition: vi.fn<PlaybackSource["getPosition"]>().mockResolvedValue(stored),
    savePosition: vi
      .fn<PlaybackSource["savePosition"]>()
      .mockResolvedValue(storedDto(0, false)),
  };
}

function renderPlayer(source: PlaybackSource): () => PlayerContextValue {
  let player: PlayerContextValue | undefined;

  function Capture() {
    player = usePlayer();
    return null;
  }

  render(
    <PlaybackSourceProvider source={source}>
      <PlayerProvider>
        <Capture />
      </PlayerProvider>
    </PlaybackSourceProvider>,
  );

  return () => {
    if (!player) {
      throw new Error("PlayerProvider did not render its context");
    }
    return player;
  };
}

/*
 * The resume rule, three branches and no others. Each test starts the element at
 * 50 s so a value of 0 proves the read was applied rather than the initial value.
 */
it("resumes at the stored position when one is stored and not completed", async () => {
  const source = makeSource(storedDto(120, false));
  const getPlayer = renderPlayer(source);
  const audio = makeAudio({ currentTime: 50 });
  getPlayer().audioRef.current = audio;

  await act(async () => getPlayer().playEpisode(makeEpisode(7)));

  expect(audio.currentTime).toBe(120);
});

it("starts at 0 when the stored state is completed", async () => {
  const source = makeSource(storedDto(120, true));
  const getPlayer = renderPlayer(source);
  const audio = makeAudio({ currentTime: 50 });
  getPlayer().audioRef.current = audio;

  await act(async () => getPlayer().playEpisode(makeEpisode(7)));

  expect(audio.currentTime).toBe(0);
});

it("starts at 0 when no position is stored", async () => {
  const source = makeSource(null);
  const getPlayer = renderPlayer(source);
  const audio = makeAudio({ currentTime: 50 });
  getPlayer().audioRef.current = audio;

  await act(async () => getPlayer().playEpisode(makeEpisode(7)));

  expect(audio.currentTime).toBe(0);
});

it("writes exactly once on pause, with the paused position", async () => {
  const source = makeSource();
  const getPlayer = renderPlayer(source);
  const audio = makeAudio();
  getPlayer().audioRef.current = audio;

  await act(async () => getPlayer().playEpisode(makeEpisode(1)));
  audio.currentTime = 42;
  act(() => getPlayer().handlePause());

  expect(source.savePosition).toHaveBeenCalledTimes(1);
  expect(source.savePosition).toHaveBeenCalledWith(1, 42, false);
});

it("writes during playback at most once every 30 seconds", () => {
  vi.useFakeTimers();
  const source = makeSource();
  const getPlayer = renderPlayer(source);
  const audio = makeAudio();
  getPlayer().audioRef.current = audio;

  act(() => getPlayer().playEpisode(makeEpisode(1)));

  for (let seconds = 10; seconds <= 90; seconds += 10) {
    vi.advanceTimersByTime(10_000);
    audio.currentTime = seconds;
    act(() => getPlayer().handleTimeUpdate());
  }

  // Ticks at 30 s, 60 s and 90 s pass the gate; the seven between them do not.
  expect(source.savePosition).toHaveBeenCalledTimes(3);
});

it("writes the episode being left under its own id, before the next loads", async () => {
  const source = makeSource();
  const getPlayer = renderPlayer(source);
  const audio = makeAudio();
  getPlayer().audioRef.current = audio;

  await act(async () => getPlayer().playEpisode(makeEpisode(1)));
  audio.currentTime = 25;
  act(() => getPlayer().playEpisode(makeEpisode(2)));

  expect(source.savePosition).toHaveBeenCalledTimes(1);
  expect(source.savePosition).toHaveBeenCalledWith(1, 25, false);
  expect(getPlayer().state.episode?.id).toBe(2);
});

it("writes completed: true when playback ends", async () => {
  const source = makeSource();
  const getPlayer = renderPlayer(source);
  const audio = makeAudio({ duration: 600 });
  getPlayer().audioRef.current = audio;

  await act(async () => getPlayer().playEpisode(makeEpisode(1)));
  // The position is deliberately below `duration - 1`: a browser that does not
  // report the end exactly at the duration (Safari) must still store the flag as
  // true. The computed rule alone would write false here.
  audio.currentTime = 590;
  act(() => getPlayer().handleEnded());

  expect(source.savePosition).toHaveBeenCalledTimes(1);
  expect(source.savePosition).toHaveBeenCalledWith(1, 590, true);
});

it("starts over when play is pressed on a completed episode", async () => {
  const source = makeSource();
  const getPlayer = renderPlayer(source);
  const audio = makeAudio({
    duration: 600,
    paused: true,
    currentSrc: "https://example.org/audio/1.mp3",
  });
  getPlayer().audioRef.current = audio;

  await act(async () => getPlayer().playEpisode(makeEpisode(1)));
  audio.currentTime = 600;
  act(() => getPlayer().toggle());

  expect(audio.currentTime).toBe(0);
});
