"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  listSubscriptions,
  subscribe,
  PodcastApiError,
  type PodcastSummaryDto,
} from "@/lib/api/podcast";
import { BaseButton, BaseCard, BaseField, BaseInput } from "@/components/base";

const SIGN_IN_ERROR = "Sign in to see your podcasts.";
const LOAD_ERROR = "Could not load your podcasts.";
const ADD_ERROR = "Could not add the podcast.";
const BLANK_FEED_URL_ERROR = "Paste the URL of an RSS or Atom feed first.";

/** apiFetch throws this exact message when there is no Supabase session. */
function isNotAuthenticated(error: unknown): boolean {
  return error instanceof Error && error.message === "Not authenticated";
}

/**
 * One sentence for a failed call.
 *
 * The backend's own reason wins when there is one: `PodcastApiError` carries
 * `ProblemDetail.detail`, which for a rejected feed is why the feed could not be
 * read. A missing session and a network that never answered get a sentence of
 * their own, because neither produces a response to read.
 */
function describeError(error: unknown, fallback: string): string {
  if (isNotAuthenticated(error)) {
    return SIGN_IN_ERROR;
  }
  if (error instanceof PodcastApiError) {
    return error.message;
  }
  return fallback;
}

function formatEpisodeCount(count: number): string {
  return count === 1 ? "1 episode" : `${count} episodes`;
}

function formatLastFetched(value: string | null): string {
  return value ? `Last refreshed ${new Date(value).toLocaleDateString()}` : "Never refreshed";
}

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<PodcastSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [feedUrl, setFeedUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const loaded = await listSubscriptions();
        if (!isCancelled) {
          setPodcasts(loaded);
          setError(null);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(describeError(loadError, LOAD_ERROR));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [reloadToken]);

  const addPodcast = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = feedUrl.trim();
    if (url === "") {
      setError(BLANK_FEED_URL_ERROR);
      return;
    }

    setIsAdding(true);
    setError(null);
    setNotice(null);
    try {
      const result = await subscribe(url);
      setFeedUrl("");
      setNotice(
        result.alreadySubscribed
          ? `Already following ${result.podcast.title}. The feed was read again.`
          : `Added ${result.podcast.title} with ${formatEpisodeCount(result.podcast.episodeCount)}.`,
      );
      setIsLoading(true);
      setReloadToken((token) => token + 1);
    } catch (addError) {
      setError(describeError(addError, ADD_ERROR));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <BaseCard className="p-6">
        <p className="text-xs tracking-widest text-muted">Library</p>
        <h1 className="mt-2 font-mono text-2xl">Podcasts</h1>
        <p className="mt-1 text-sm text-muted">
          Paste the URL of a podcast feed to follow it. Its episodes are imported as soon as the feed
          is read.
        </p>

        <form onSubmit={addPodcast} className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <BaseField label="Feed URL" className="flex-1">
            <BaseInput
              type="text"
              inputMode="url"
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value)}
            />
          </BaseField>
          <BaseButton variant="cta" type="submit" disabled={isAdding}>
            {isAdding ? "Adding…" : "Add podcast"}
          </BaseButton>
        </form>

        {error ? <p className="mt-4 text-sm">{error}</p> : null}
        {notice && !error ? <p className="mt-4 text-sm text-muted">{notice}</p> : null}
      </BaseCard>

      <BaseCard>
        <div className="flex items-center justify-between border-b border-fg px-6 py-3">
          <h2 className="font-mono text-lg">Your podcasts</h2>
          {isLoading ? <span className="text-xs text-muted">Loading…</span> : null}
        </div>

        {podcasts.length === 0 && !isLoading ? (
          <p className="px-6 py-6 text-sm text-muted">
            No podcasts yet. Paste a feed URL above to add one.
          </p>
        ) : (
          <ul>
            {podcasts.map((podcast) => (
              <li key={podcast.podcastId} className="border-b border-fg last:border-b-0">
                <Link
                  href={`/podcasts/view?id=${podcast.podcastId}`}
                  className="flex items-center gap-4 px-6 py-4 focus:outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cta"
                >
                  {/*
                   * A plain <img>, not next/image: the artwork lives on whichever
                   * host publishes the feed, so there is no host list to declare,
                   * and the optimizer is unavailable under output: 'export'. The
                   * thumbnail is decorative because the title sits next to it,
                   * hence the empty alt.
                   */}
                  {podcast.imageUrl ? (
                    <img
                      src={podcast.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-base border border-fg object-cover"
                    />
                  ) : null}

                  <div className="min-w-0">
                    <p className="truncate">{podcast.title}</p>
                    {podcast.author ? (
                      <p className="mt-1 truncate text-sm text-muted">{podcast.author}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted">
                      {formatEpisodeCount(podcast.episodeCount)} ·{" "}
                      {formatLastFetched(podcast.lastFetchedAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </BaseCard>
    </main>
  );
}
