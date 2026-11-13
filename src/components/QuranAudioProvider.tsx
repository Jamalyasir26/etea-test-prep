// QuranAudioProvider — Stage 4B. ONE global audio player (a single
// HTMLAudioElement) mounted at shell level, so recitation survives
// navigation and the sticky mini player stays visible while the user
// scrolls. Mount-gated throughout: the Audio element is created in an
// effect, the first render is always "no track", so there is no
// hydration mismatch.
//
// STREAMING ONLY: audio is streamed from the free CDNs (everyayah.com
// primary, cdn.islamic.network fallback, Alafasy voice). Nothing is
// downloaded, stored, or precached — the service worker never sees
// these cross-origin requests (see public/sw.js). preload="none":
// no bytes are fetched until the user presses Play.
//
// FALLBACK: on an audio error the player tries the fallback CDN
// exactly ONCE; if that fails too it shows an honest "audio
// unavailable" state. Pressing Play again retries from the primary.
//
// CONTROLS (per spec): Play/Pause, Speed 0.5x/1x only, Repeat/Loop
// for the current ayah, Close/Stop. No volume control, no playlist,
// no word-by-word highlighting (verse-by-verse is the approved
// scope).
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { audioUrls, type ResolvedExample } from "@/lib/quranAudio";

export type QuranPlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";
export type QuranSpeed = 0.5 | 1;

export type QuranAudioState = {
  /** The example loaded in the player, or null when closed. */
  track: ResolvedExample | null;
  status: QuranPlayerStatus;
  speed: QuranSpeed;
  loop: boolean;
  /** Play an example (toggles pause when it is already the track). */
  playExample: (example: ResolvedExample) => void;
  /** Pause/resume the current track (retries from primary on error). */
  toggle: () => void;
  setSpeed: (speed: QuranSpeed) => void;
  toggleLoop: () => void;
  /** Stop playback and hide the player. */
  close: () => void;
};

const DEFAULT_STATE: QuranAudioState = {
  track: null,
  status: "idle",
  speed: 1,
  loop: false,
  playExample: () => {},
  toggle: () => {},
  setSpeed: () => {},
  toggleLoop: () => {},
  close: () => {},
};

const QuranAudioContext = createContext<QuranAudioState>(DEFAULT_STATE);

export function useQuranAudio(): QuranAudioState {
  return useContext(QuranAudioContext);
}

export default function QuranAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<ResolvedExample | null>(null);
  const statusRef = useRef<QuranPlayerStatus>("idle");
  const triedFallbackRef = useRef(false);
  const [track, setTrack] = useState<ResolvedExample | null>(null);
  const [status, setStatus] = useState<QuranPlayerStatus>("idle");
  const [speed, setSpeedState] = useState<QuranSpeed>(1);
  const [loop, setLoopState] = useState(false);
  const speedRef = useRef<QuranSpeed>(1);
  const loopRef = useRef(false);

  const setStatusBoth = useCallback((s: QuranPlayerStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const setTrackBoth = useCallback((t: ResolvedExample | null) => {
    trackRef.current = t;
    setTrack(t);
  }, []);

  // One failure path, shared by the "error" event and a rejected
  // play() promise: try the fallback CDN once, then give up honestly.
  const handleFailure = useCallback(() => {
    const audio = audioRef.current;
    const current = trackRef.current;
    if (!audio || !current) return;
    if (!triedFallbackRef.current) {
      triedFallbackRef.current = true;
      audio.src = audioUrls(current.verse).fallback;
      audio.load();
      void audio.play().catch(() => {
        // A rejected retry surfaces through the "error" event below;
        // AbortError (superseded by a newer play) is ignored there.
      });
      return;
    }
    setStatusBoth("error");
  }, [setStatusBoth]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    const onPlay = () => setStatusBoth("playing");
    const onPause = () => {
      // "pause" also fires when playback ends and when close() pauses;
      // only a playing/loading player becomes "paused" here.
      if (statusRef.current === "playing" || statusRef.current === "loading") {
        setStatusBoth("paused");
      }
    };
    const onEnded = () => {
      // Without loop, rewind so the next Play restarts the ayah.
      audio.currentTime = 0;
      setStatusBoth("paused");
    };
    const onError = () => {
      // Ignore errors for a track that was already closed/replaced:
      // an error event can arrive after close() cleared the source.
      if (!trackRef.current || statusRef.current === "idle") return;
      handleFailure();
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, [handleFailure, setStatusBoth]);

  const startPlayback = useCallback(
    (example: ResolvedExample) => {
      const audio = audioRef.current;
      if (!audio) return;
      triedFallbackRef.current = false;
      setTrackBoth(example);
      setStatusBoth("loading");
      audio.src = audioUrls(example.verse).primary;
      audio.playbackRate = speedRef.current;
      audio.loop = loopRef.current;
      audio.load();
      void audio.play().catch((err: unknown) => {
        // AbortError = superseded by a newer play() call; the newer
        // call owns the outcome. Anything else is a real failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
        handleFailure();
      });
    },
    [handleFailure, setStatusBoth, setTrackBoth],
  );

  const playExample = useCallback(
    (example: ResolvedExample) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (trackRef.current && trackRef.current.id === example.id) {
        // Same example: Play/Pause toggle (error retries from primary).
        if (statusRef.current === "playing") {
          audio.pause();
        } else if (statusRef.current === "error") {
          startPlayback(example);
        } else {
          setStatusBoth("loading");
          void audio.play().catch((err: unknown) => {
            if (err instanceof DOMException && err.name === "AbortError") return;
            handleFailure();
          });
        }
        return;
      }
      startPlayback(example);
    },
    [handleFailure, setStatusBoth, startPlayback],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    const current = trackRef.current;
    if (!audio || !current) return;
    if (statusRef.current === "playing") {
      audio.pause();
    } else if (statusRef.current === "error") {
      startPlayback(current);
    } else {
      setStatusBoth("loading");
      void audio.play().catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        handleFailure();
      });
    }
  }, [handleFailure, setStatusBoth, startPlayback]);

  const setSpeed = useCallback((next: QuranSpeed) => {
    speedRef.current = next;
    setSpeedState(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, []);

  const toggleLoop = useCallback(() => {
    const next = !loopRef.current;
    loopRef.current = next;
    setLoopState(next);
    if (audioRef.current) audioRef.current.loop = next;
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    setTrackBoth(null);
    setStatusBoth("idle");
    triedFallbackRef.current = false;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  }, [setStatusBoth, setTrackBoth]);

  return (
    <QuranAudioContext.Provider
      value={{ track, status, speed, loop, playExample, toggle, setSpeed, toggleLoop, close }}
    >
      {children}
    </QuranAudioContext.Provider>
  );
}
