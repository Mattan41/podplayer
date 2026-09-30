"use client";

import { createContext, useContext, type ReactNode } from "react";
import type {
  EpisodeDto,
  PodcastSummaryDto,
  RefreshResult,
  SubscribeResult,
} from "@/lib/api/podcast";
import { remotePodcastSource } from "@/lib/podcast-source-remote";

/**
 * The four podcast operations, as an interface rather than a set of module
 * functions.
 *
 * Components read the backend through this interface and never import
 * `lib/api/podcast.ts` directly. That indirection is what makes a second
 * implementation possible without touching the components: a guest source that
 * reads localStorage, or a fixture source in a test. The remote source is the
 * default, so nothing changes until a provider supplies something else.
 *
 * The DTO types are imported, not redefined: they mirror the backend field for
 * field and there must be exactly one copy. See ARCHITECTURE.md §5 rule 8.
 */
export interface PodcastSource {
  listSubscriptions(): Promise<PodcastSummaryDto[]>;
  subscribe(feedUrl: string): Promise<SubscribeResult>;
  listEpisodes(podcastId: number): Promise<EpisodeDto[]>;
  refreshPodcast(podcastId: number): Promise<RefreshResult>;
}

/**
 * Defaults to the remote source, so `usePodcastSource()` returns something
 * useful even when no provider is above the caller. A provider exists to
 * override that default, not to establish it.
 */
export const PodcastSourceContext = createContext<PodcastSource>(remotePodcastSource);

export type PodcastSourceProviderProps = {
  source?: PodcastSource;
  children: ReactNode;
};

/** Supplies a {@link PodcastSource} to the tree below it. */
export function PodcastSourceProvider({
  source = remotePodcastSource,
  children,
}: PodcastSourceProviderProps) {
  return (
    <PodcastSourceContext.Provider value={source}>{children}</PodcastSourceContext.Provider>
  );
}

/** @returns the source in scope, or the remote source when none is provided */
export function usePodcastSource(): PodcastSource {
  return useContext(PodcastSourceContext);
}
