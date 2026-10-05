"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PlaybackStateDto } from "@/lib/api/playback";
import { remotePlaybackSource } from "@/lib/playback-source-remote";

/**
 * The two playback-state operations, as an interface rather than a set of
 * module functions.
 *
 * It is deliberately separate from `PodcastSource`. That interface answers
 * "how do I read podcast data", which a guest source can implement from
 * localStorage. Playback state is per-user state keyed on an episode, written
 * by the player rather than read by a list, and unreadable without a signed-in
 * user — so it does not belong on `PodcastSource`, and a guest source that
 * cannot persist progress simply does not supply this one.
 *
 * The DTO type is imported, not redefined: it mirrors the backend field for
 * field and there must be exactly one copy. See ARCHITECTURE.md §5 rule 8.
 */
export interface PlaybackSource {
  getPosition(episodeId: number): Promise<PlaybackStateDto | null>;
  savePosition(
    episodeId: number,
    positionSeconds: number,
    completed: boolean,
  ): Promise<PlaybackStateDto>;
}

/**
 * Defaults to the remote source, so `usePlaybackSource()` returns something
 * useful even when no provider is above the caller. A provider exists to
 * override that default, not to establish it.
 */
export const PlaybackSourceContext = createContext<PlaybackSource>(remotePlaybackSource);

export type PlaybackSourceProviderProps = {
  source?: PlaybackSource;
  children: ReactNode;
};

/** Supplies a {@link PlaybackSource} to the tree below it. */
export function PlaybackSourceProvider({
  source = remotePlaybackSource,
  children,
}: PlaybackSourceProviderProps) {
  return (
    <PlaybackSourceContext.Provider value={source}>{children}</PlaybackSourceContext.Provider>
  );
}

/** @returns the source in scope, or the remote source when none is provided */
export function usePlaybackSource(): PlaybackSource {
  return useContext(PlaybackSourceContext);
}
