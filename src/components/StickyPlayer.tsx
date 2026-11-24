// StickyPlayer — Stage 4B. The fixed bottom mini player for Quran
// audio: visible whenever a track is loaded, surviving scroll and
// navigation (the provider lives at shell level). A same-height
// spacer renders in normal flow below the shell so the bar never
// covers page content or buttons — including at 360px width (the
// bar is one wrapping-safe row of 44px touch targets; see
// .quran-player in globals.css).
//
// Controls (per spec): Play/Pause, Speed 0.5x/1x, Repeat/Loop for
// the current ayah, Close. The label names the rule, the Surah +
// ayah, and the reciter. On error the label area states honestly
// that audio could not be loaded, and Play becomes Retry.
"use client";

import { lri, useLang } from "@/lib/i18n";
import { useQuranAudio } from "./QuranAudioProvider";

export default function StickyPlayer() {
  const { t, tf } = useLang();
  const { track, status, speed, loop, toggle, setSpeed, toggleLoop, close } = useQuranAudio();

  if (!track) return null;

  const playing = status === "playing";
  const errored = status === "error";
  // UI/UX2 M13 — the "loading" state is visible now: while audio is
  // loading the toggle shows the existing loading string and is
  // disabled, instead of saying Play while nothing plays yet.
  const loading = status === "loading";
  const otherSpeed = speed === 1 ? 0.5 : 1;
  // U1 (F1.7) — the label truncates by design (.quran-player-label), so
  // the full text is exposed via title, composed from the same pieces
  // rendered below (no new strings).
  const labelTitle = errored
    ? t("quranAudioUnavailable")
    : `${track.ruleLabel} · ${tf("quranAyahRef", { surah: lri(track.verse.surahName), ayah: track.verse.ayah })} · Mishary Alafasy`;

  return (
    <>
      <div className="quran-player" role="region" aria-label={t("quranPlayerLabel")}>
        <button
          type="button"
          className="secondary"
          onClick={toggle}
          disabled={loading}
          aria-label={loading ? t("loading") : errored ? t("quranRetry") : playing ? t("quranPause") : t("quranPlay")}
        >
          {loading ? t("loading") : errored ? t("quranRetry") : playing ? t("quranPause") : t("quranPlay")}
        </button>
        <p className="quran-player-label" dir="auto" title={labelTitle}>
          {errored ? (
            t("quranAudioUnavailable")
          ) : (
            <>
              <span>{track.ruleLabel}</span>
              {" · "}
              <span>{tf("quranAyahRef", { surah: lri(track.verse.surahName), ayah: track.verse.ayah })}</span>
              {" · "}
              <span dir="ltr">Mishary Alafasy</span>
            </>
          )}
        </p>
        <button
          type="button"
          className="secondary"
          onClick={() => setSpeed(otherSpeed)}
          aria-label={tf("quranSpeedToggle", { speed: `${otherSpeed}x` })}
        >
          <span dir="ltr">{`${speed}x`}</span>
        </button>
        <button
          type="button"
          className={loop ? "quran-repeat-on" : "secondary"}
          onClick={toggleLoop}
          aria-pressed={loop}
          aria-label={t("quranRepeat")}
        >
          {t("quranRepeat")}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={close}
          aria-label={t("quranClosePlayer")}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {/* In-flow spacer: keeps the last page content scrollable above
          the fixed bar. aria-hidden: purely presentational.
          UI/UX2 M08 — the spacer covers the safe area too:
          calc(72px + env(safe-area-inset-bottom)). No
          viewport-fit=cover is added (out of scope), so the env()
          term is 0 today and the spacer stays 72px; if cover is ever
          adopted, the spacer grows with the home-indicator inset
          instead of letting the bar cover ~22px of content. */}
      <div aria-hidden="true" className="quran-player-spacer" style={{ height: "calc(72px + env(safe-area-inset-bottom))" }} />
    </>
  );
}
