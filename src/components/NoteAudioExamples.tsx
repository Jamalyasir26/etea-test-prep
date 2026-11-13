// NoteAudioExamples — Stage 4B. The "Play Audio" example blocks on
// Tajweed notes: one block per approved example, showing the rule
// label, the verified ayah text (Uthmani, from the Quran.com API),
// the Surah + ayah reference, and a Play button that drives the
// global player.
//
// The mapping is DATA (src/lib/quranAudio.ts, keyed by the note's
// EXACT original English title) — note bodies are never edited.
// Unmapped notes (including every Makharij, Sifaat, and Hifz note)
// render nothing here, per the owner's decision that they stay
// text-only.
//
// OFFLINE: when the PWA state reports offline, the buttons disable
// with a clear "needs internet" note (audio streams from a CDN and
// is never cached). Before mount the PWA default is online, matching
// the tutor banner's mount-gated pattern.
"use client";

import { lri, useLang } from "@/lib/i18n";
import { getNoteAudio } from "@/lib/quranAudio";
import { usePwa } from "./PwaProvider";
import { useQuranAudio } from "./QuranAudioProvider";

export default function NoteAudioExamples({ title }: { title: string }) {
  const { t, tf } = useLang();
  const { mounted, online } = usePwa();
  const { track, status, playExample } = useQuranAudio();
  const examples = getNoteAudio(title);

  if (examples.length === 0) return null;

  const offline = mounted && !online;

  return (
    <section aria-label={t("quranListenHeading")} className="quran-examples">
      <h4>{t("quranListenHeading")}</h4>
      <p className="muted">{t("quranListenIntro")}</p>
      {offline && (
        <p className="muted" role="status">
          {t("quranAudioNeedsInternet")}
        </p>
      )}
      {examples.map((example) => {
        const isCurrent = track !== null && track.id === example.id;
        const playing = isCurrent && status === "playing";
        const errored = isCurrent && status === "error";
        return (
          <div key={example.id} className="quran-example">
            <p dir="rtl" lang="ar" className="quran-ayah">
              {example.verse.text}
            </p>
            <p className="muted">
              <span>{example.ruleLabel}</span>
              {" · "}
              <span>
                {tf("quranAyahRef", { surah: lri(example.verse.surahName), ayah: example.verse.ayah })}
              </span>
              {example.demoWord && (
                <>
                  {" · "}
                  <span>
                    {t("quranDemoWord")}:{" "}
                    <span dir="rtl" lang="ar">
                      {example.demoWord}
                    </span>
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              className="secondary"
              disabled={offline}
              onClick={() => playExample(example)}
              aria-label={
                errored
                  ? t("quranRetry")
                  : playing
                    ? t("quranPause")
                    : `${t("quranPlayAudio")} — ${example.ruleLabel}`
              }
            >
              {errored ? t("quranRetry") : playing ? t("quranPause") : t("quranPlayAudio")}
            </button>
          </div>
        );
      })}
    </section>
  );
}
