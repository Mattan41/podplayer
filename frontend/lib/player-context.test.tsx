import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import type { EpisodeDto } from "@/lib/api/podcast";
import { PlayerProvider, usePlayer, type PlayerContextValue } from "@/lib/player-context";

/*
 * The provider is exercised through `usePlayer`, the way a consumer uses it,
 * not by reaching into the reducer. No `<audio>` element is rendered: the
 * provider only touches one when a ref is attached, so the state transitions
 * below run without a media element.
 */
afterEach(cleanup);

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

function renderPlayer(): () => PlayerContextValue {
  let player: PlayerContextValue | undefined;

  function Capture() {
    player = usePlayer();
    return null;
  }

  render(
    <PlayerProvider>
      <Capture />
    </PlayerProvider>,
  );

  return () => {
    if (!player) {
      throw new Error("PlayerProvider did not render its context");
    }
    return player;
  };
}

it("stop navigates off the history entry that opening the full player pushed", async () => {
  /*
   * `history.length` counts session-history entries and `back()` moves the
   * pointer without removing the entry, so length does NOT return to its
   * pre-open value (in jsdom or in a browser). The observable that does reflect
   * the cleanup is the current entry's state: opening makes `{ player: true }`
   * current, and closing navigates back until the pre-open state is current
   * again.
   */
  const beforeLength = window.history.length;
  const beforeState = window.history.state;
  const getPlayer = renderPlayer();

  act(() => getPlayer().playEpisode(makeEpisode(1)));
  act(() => getPlayer().setFullPlayerOpen(true));

  expect(getPlayer().state.isFullPlayerOpen).toBe(true);
  expect(window.history.length).toBe(beforeLength + 1);
  expect(window.history.state).toEqual({ player: true });

  act(() => getPlayer().stop());

  expect(getPlayer().state.isFullPlayerOpen).toBe(false);
  await waitFor(() => expect(window.history.state).toEqual(beforeState));
});

it("a second episode replaces the first, and stop returns to the initial state", () => {
  const getPlayer = renderPlayer();
  const initial = getPlayer().state;

  const first = makeEpisode(1);
  const second = makeEpisode(2);
  act(() => getPlayer().playEpisode(first));
  act(() => getPlayer().playEpisode(second));

  expect(getPlayer().state.episode).toBe(second);
  expect(getPlayer().state.currentTime).toBe(0);

  act(() => getPlayer().stop());

  expect(getPlayer().state).toEqual(initial);
});
