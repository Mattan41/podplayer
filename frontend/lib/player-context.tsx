"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import type { EpisodeDto } from "@/lib/api/podcast";
import { usePlaybackSource } from "@/lib/playback-source";

/**
 * Playback state for the one episode the app can play at a time.
 *
 * `status` is a small state machine rather than a pair of booleans:
 * `idle` (nothing loaded), `loading` (source attached, waiting for playback),
 * `playing`, `paused`, and `error` (the source could not be played).
 */
export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type PlayerState = {
  /** The episode the player is on. `null` when nothing is loaded. */
  episode: EpisodeDto | null;
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  /** One sentence describing why playback stopped, when `status` is `error`. */
  error: string | null;
  isFullPlayerOpen: boolean;
};

/**
 * Shown when the media element reports a failure, which is what a `404` on the
 * episode's `audioUrl` produces. Kept as one sentence because the element's
 * `MediaError` code is not worth translating for the user.
 */
const AUDIO_ERROR_MESSAGE = "This episode's audio could not be played.";

/**
 * The periodic write interval, in milliseconds.
 *
 * `timeupdate` fires roughly four times a second; writing on every tick would be
 * four database writes a second per active listener. The provider writes at most
 * once per interval instead. Thirty seconds is a decision, not a measurement:
 * losing 30 seconds of position is cheap, a write every few seconds across the
 * user base is not. See docs/roadmap/playback-state.md.
 *
 * The pause write is exempt. A pause is an explicit signal that the user is
 * about to leave, so it writes however recently the last periodic write was.
 */
const PERIODIC_WRITE_MS = 30_000;

/** `HTMLMediaElement.HAVE_METADATA`: `currentTime` is ignored before this. */
const HAVE_METADATA = 1;

type Action =
  | { type: "load"; episode: EpisodeDto }
  | { type: "metadata"; duration: number }
  | { type: "time"; currentTime: number }
  | { type: "playing" }
  | { type: "paused" }
  | { type: "ended" }
  | { type: "seek"; currentTime: number }
  | { type: "error"; message: string }
  | { type: "stop" }
  | { type: "full"; open: boolean };

const INITIAL_STATE: PlayerState = {
  episode: null,
  status: "idle",
  currentTime: 0,
  duration: 0,
  error: null,
  isFullPlayerOpen: false,
};

/**
 * Reduces one media event onto the state.
 *
 * Every action that the media element produces is ignored once `episode` is
 * `null`. `stop` removes the source and then the browser emits `pause` (and
 * sometimes `error`) asynchronously for the element that no longer belongs to
 * an episode, which must not resurrect a mini player that was just closed.
 */
function reducer(state: PlayerState, action: Action): PlayerState {
  if (state.episode === null && action.type !== "load") {
    if (action.type === "stop") {
      return INITIAL_STATE;
    }
    if (action.type === "full") {
      return { ...state, isFullPlayerOpen: action.open };
    }
    return state;
  }

  switch (action.type) {
    case "load":
      return {
        ...state,
        episode: action.episode,
        status: "loading",
        currentTime: 0,
        // The feed's stated duration paints the scrubber until metadata
        // arrives, so the bar is not empty for the first second.
        duration: action.episode.durationSeconds ?? 0,
        error: null,
      };
    case "metadata":
      return { ...state, duration: action.duration > 0 ? action.duration : state.duration };
    case "time":
      return { ...state, currentTime: action.currentTime };
    case "playing":
      return { ...state, status: "playing" };
    case "paused":
      return { ...state, status: "paused" };
    case "ended":
      return { ...state, status: "paused", currentTime: state.duration };
    case "seek":
      return { ...state, currentTime: action.currentTime };
    case "error":
      // The episode is dropped so the mini player closes, while the message
      // stays behind for the notice. See docs/DECISIONS.md entry 26.
      return {
        ...INITIAL_STATE,
        status: "error",
        error: action.message,
      };
    case "stop":
      return INITIAL_STATE;
    case "full":
      return { ...state, isFullPlayerOpen: action.open };
  }
}

export type PlayerContextValue = {
  state: PlayerState;
  /** Loads an episode and starts it, or toggles when it is already the current one. */
  playEpisode: (episode: EpisodeDto) => void;
  /** Plays or pauses the loaded episode. */
  toggle: () => void;
  /** Moves playback to `seconds` in the loaded episode. */
  seek: (seconds: number) => void;
  /** Stops playback and closes the player, clearing any error message. */
  stop: () => void;
  /** Opens or closes the full player view. */
  setFullPlayerOpen: (open: boolean) => void;
  /**
   * The shared media element. `AudioElement` attaches it; the provider drives
   * `src` and playback through it. Exposed so both live on the same ref.
   */
  audioRef: RefObject<HTMLAudioElement | null>;
  handleLoadedMetadata: () => void;
  handleTimeUpdate: () => void;
  handlePlaying: () => void;
  handlePause: () => void;
  handleEnded: () => void;
  handleError: () => void;
};

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

/** A rejected `play()` is either an autoplay block or a source that failed. */
function describePlayFailure(error: unknown): string {
  if (error instanceof Error && error.name === "NotAllowedError") {
    return "Playback was blocked by the browser.";
  }
  return AUDIO_ERROR_MESSAGE;
}

/**
 * Owns the playback state machine and the single media element.
 *
 * The element itself is rendered by `AudioElement` in the layout, so a route
 * change cannot unmount it and interrupt playback. This provider holds the ref
 * and drives `src` imperatively; the element pipes its native events back in
 * through the handlers below. See docs/DECISIONS.md entries 26 and 29.
 *
 * Context plus `useReducer` is deliberate for this phase: the state is consumed
 * only by the two player views and the episode rows, so a store library would
 * add a dependency and a mental model without removing any prop drilling. That
 * is revisited in Phase E, when playback position is persisted.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /*
   * Mirrors `state.isFullPlayerOpen` for the `popstate` listener, which is
   * registered once and cannot close over a fresh value. See `setFullPlayerOpen`
   * and the history effect below.
   */
  const isFullPlayerOpenRef = useRef(false);

  const { episode } = state;
  const playbackSource = usePlaybackSource();

  /*
   * The resume position resolved for the current episode, applied once the
   * element knows its duration. `null` means no position is pending.
   */
  const resumeRef = useRef<{ episodeId: number; seconds: number } | null>(null);
  /* The episode the player is on, so a read that resolves late is ignored. */
  const activeEpisodeIdRef = useRef<number | null>(null);
  /* When the last periodic write fired; `null` until the current episode loads. */
  const lastPeriodicWriteAtRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !episode) {
      return;
    }
    audio.src = episode.audioUrl;
    audio.play().catch((error: unknown) => {
      dispatch({ type: "error", message: describePlayFailure(error) });
    });
  }, [episode]);

  /*
   * Back closes the full player, through the history API rather than a route.
   *
   * Dismissing an open modal with the system back control is a platform
   * expectation; the full player stays a Dialog (docs/DECISIONS.md entry 27) and
   * gains no route. Opening pushes one entry (see `setFullPlayerOpen`); backing
   * into it fires `popstate`, which closes the dialog here. The listener only
   * ever closes — it never calls `history.back()` — so a back that dismisses the
   * player cannot pop a second entry. That is the double-close guard.
   */
  useEffect(() => {
    const handlePopState = () => {
      if (!isFullPlayerOpenRef.current) {
        return;
      }
      isFullPlayerOpenRef.current = false;
      dispatch({ type: "full", open: false });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /*
   * Keeps the pushed entry honest when the player closes for a reason other than
   * back, Escape or the Close button — `stop`, or the media element erroring and
   * dropping the episode. Those dispatch a closed state directly, so the ref is
   * still `true`; popping the entry here cleans up history, and the `popstate` it
   * causes is ignored because the ref is already `false`. When the close came
   * through `popstate` the ref is `false`, so this effect is a no-op.
   */
  useEffect(() => {
    if (state.isFullPlayerOpen) {
      isFullPlayerOpenRef.current = true;
      return;
    }
    if (!isFullPlayerOpenRef.current) {
      return;
    }
    isFullPlayerOpenRef.current = false;
    window.history.back();
  }, [state.isFullPlayerOpen]);

  /**
   * Stores the current position of `target`.
   *
   * A failed save is dropped: no retry, no queue, no user-visible error. The next
   * time a write event fires, the then-current position is stored. Do not add a
   * queue here; see docs/roadmap/playback-state.md.
   */
  const writeCurrentPosition = useCallback(
    (target: EpisodeDto, forceCompleted = false) => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }
      const positionSeconds = Math.max(0, Math.floor(audio.currentTime));
      const duration = audio.duration;
      // The roadmap's rule for the flag: playback reached the end when the
      // position is within a second of the duration. `forceCompleted` is for the
      // `ended` event, the completion signal whether or not the browser also
      // fires `pause` (Safari does not always).
      const completed =
        forceCompleted ||
        (Number.isFinite(duration) && duration > 0 && positionSeconds >= duration - 1);
      void playbackSource.savePosition(target.id, positionSeconds, completed).catch(() => {
        // Dropped on purpose. See the docstring.
      });
    },
    [playbackSource],
  );

  /**
   * Applies a resolved resume position to the element, when both the read and the
   * metadata have arrived. `currentTime` is ignored before `HAVE_METADATA`, so
   * this is a no-op until then, and the `loadedmetadata` handler calls it again.
   */
  const applyResume = useCallback(() => {
    const audio = audioRef.current;
    const pending = resumeRef.current;
    if (!audio || !pending || audio.readyState < HAVE_METADATA) {
      return;
    }
    resumeRef.current = null;
    // A stored position past the duration is a data error, not a user state:
    // start at 0 rather than at the end, and never throw.
    audio.currentTime = pending.seconds > audio.duration ? 0 : pending.seconds;
  }, []);

  /**
   * Reads the stored position for an episode and, when it is still the current
   * one, records where to start. A failed read is not a reason to refuse to play:
   * the position falls back to 0 and nothing is logged.
   */
  const resolveResume = useCallback(
    async (episodeId: number) => {
      let seconds = 0;
      try {
        const stored = await playbackSource.getPosition(episodeId);
        if (stored && !stored.completed) {
          seconds = stored.positionSeconds;
        }
      } catch {
        // Start at 0. The write path is the one that matters.
        seconds = 0;
      }
      if (activeEpisodeIdRef.current !== episodeId) {
        return;
      }
      resumeRef.current = { episodeId, seconds };
      applyResume();
    },
    [playbackSource, applyResume],
  );

  /*
   * Writes the position on `pagehide` and `beforeunload`, so a closing tab keeps
   * its place. `pagehide` is the reliable one on mobile; `beforeunload` is kept
   * because desktop Chrome fires it and nothing else. Both call the same write.
   * Re-registered when the episode changes so it closes over the current one.
   */
  useEffect(() => {
    const writeOnExit = () => {
      if (episode) {
        writeCurrentPosition(episode);
      }
    };
    window.addEventListener("pagehide", writeOnExit);
    window.addEventListener("beforeunload", writeOnExit);
    return () => {
      window.removeEventListener("pagehide", writeOnExit);
      window.removeEventListener("beforeunload", writeOnExit);
    };
  }, [episode, writeCurrentPosition]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.currentSrc) {
      return;
    }
    if (audio.paused) {
      // A finished episode starts over. The roadmap's "cleared when the user
      // presses play on a completed episode": the position is at (or within a
      // second of) the end, and pressing play means hear it again from the top.
      // The state is local, so no read is needed.
      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0 &&
        audio.currentTime >= audio.duration - 1
      ) {
        audio.currentTime = 0;
        dispatch({ type: "seek", currentTime: 0 });
      }
      audio.play().catch((error: unknown) => {
        dispatch({ type: "error", message: describePlayFailure(error) });
      });
    } else {
      audio.pause();
    }
  }, []);

  const playEpisode = useCallback(
    (next: EpisodeDto) => {
      if (episode?.id === next.id) {
        toggle();
        return;
      }
      if (episode) {
        // Store the episode being left under its own id, before the new one loads.
        writeCurrentPosition(episode);
      }
      activeEpisodeIdRef.current = next.id;
      resumeRef.current = null;
      lastPeriodicWriteAtRef.current = Date.now();
      dispatch({ type: "load", episode: next });
      // The stored position is read in parallel and applied once metadata is known.
      void resolveResume(next.id);
    },
    [episode, toggle, writeCurrentPosition, resolveResume],
  );

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.currentTime = seconds;
    dispatch({ type: "seek", currentTime: seconds });
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    activeEpisodeIdRef.current = null;
    resumeRef.current = null;
    dispatch({ type: "stop" });
  }, []);

  /**
   * Opens the full player, or asks history to close it.
   *
   * Opening pushes one entry so the back control has something to pop, and is the
   * only place the `full` action is dispatched with `true`. Closing does not
   * dispatch directly: it calls `history.back()`, and the `popstate` listener
   * above is the single writer of the closed state. Escape and the Close button
   * both arrive here, so they clean up the entry the same way back does.
   */
  const setFullPlayerOpen = useCallback((open: boolean) => {
    if (open) {
      if (isFullPlayerOpenRef.current) {
        return;
      }
      isFullPlayerOpenRef.current = true;
      window.history.pushState({ player: true }, "");
      dispatch({ type: "full", open: true });
      return;
    }
    if (!isFullPlayerOpenRef.current) {
      return;
    }
    window.history.back();
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      dispatch({ type: "metadata", duration: audio.duration });
    }
    // The read may have resolved before the metadata; apply it now if so.
    applyResume();
  }, [applyResume]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    dispatch({ type: "time", currentTime: audio.currentTime });
    if (!episode) {
      return;
    }
    // The periodic write, gated to at most one per interval. The pause write is a
    // separate path and is not gated.
    const now = Date.now();
    const last = lastPeriodicWriteAtRef.current;
    if (last === null || now - last >= PERIODIC_WRITE_MS) {
      lastPeriodicWriteAtRef.current = now;
      writeCurrentPosition(episode);
    }
  }, [episode, writeCurrentPosition]);

  const handlePlaying = useCallback(() => dispatch({ type: "playing" }), []);
  const handlePause = useCallback(() => {
    dispatch({ type: "paused" });
    // The pause write: exactly one, immediately, regardless of the debounce.
    if (episode) {
      writeCurrentPosition(episode);
    }
  }, [episode, writeCurrentPosition]);
  const handleEnded = useCallback(() => {
    dispatch({ type: "ended" });
    // The end is written here with the flag forced, rather than waiting for a
    // later write to notice the position is at the duration: Safari does not
    // always fire `pause` at a natural end.
    if (episode) {
      writeCurrentPosition(episode, true);
    }
  }, [episode, writeCurrentPosition]);
  const handleError = useCallback(
    () => dispatch({ type: "error", message: AUDIO_ERROR_MESSAGE }),
    [],
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      state,
      playEpisode,
      toggle,
      seek,
      stop,
      setFullPlayerOpen,
      audioRef,
      handleLoadedMetadata,
      handleTimeUpdate,
      handlePlaying,
      handlePause,
      handleEnded,
      handleError,
    }),
    [
      state,
      playEpisode,
      toggle,
      seek,
      stop,
      setFullPlayerOpen,
      handleLoadedMetadata,
      handleTimeUpdate,
      handlePlaying,
      handlePause,
      handleEnded,
      handleError,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
