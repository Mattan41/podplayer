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

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.currentSrc) {
      return;
    }
    if (audio.paused) {
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
      dispatch({ type: "load", episode: next });
    },
    [episode, toggle],
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
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      dispatch({ type: "time", currentTime: audio.currentTime });
    }
  }, []);

  const handlePlaying = useCallback(() => dispatch({ type: "playing" }), []);
  const handlePause = useCallback(() => dispatch({ type: "paused" }), []);
  const handleEnded = useCallback(() => dispatch({ type: "ended" }), []);
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
