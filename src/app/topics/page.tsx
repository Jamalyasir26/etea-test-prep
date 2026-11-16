// Practice from Past-Paper Topics — original + reworded.
// NO past-paper documents, PDFs or verbatim questions are hosted here.
"use client";

import { useEffect, useState } from "react";
import type { Question } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { loadBank } from "@/lib/banks";
import QuizRunner from "@/components/QuizRunner";

export default function Topics() {
  const { t, tf } = useLang();
  // Lazy banks: both past-paper chunks load on demand; the QuizRunners
  // mount only once their banks arrive (an empty question list must
  // never create a session fingerprint for these scopes). A failed
  // load shows a failure state with retry instead of a blank page.
  const [original, setOriginal] = useState<Question[] | null>(null);
  const [reworded, setReworded] = useState<Question[] | null>(null);
  const [bankError, setBankError] = useState<"offline" | "error" | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  useEffect(() => {
    let live = true;
    setOriginal(null);
    setReworded(null);
    setBankError(null);
    const onFail = () => {
      if (live)
        setBankError(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    };
    loadBank("pastpapers").then(
      (b) => {
        if (live) setOriginal(b);
      },
      onFail,
    );
    loadBank("pastpapers_reworded").then(
      (b) => {
        if (live) setReworded(b);
      },
      onFail,
    );
    return () => {
      live = false;
    };
  }, [retryNonce]);
  if (bankError !== null) {
    return (
      <div>
        <h1>{t("topicsTitle")}</h1>
        <div className="alert">
          <p>{t(bankError === "offline" ? "bankLoadFailedOffline" : "bankLoadFailed")}</p>
          <button className="secondary" onClick={() => setRetryNonce((n) => n + 1)}>
            {t("retryButton")}
          </button>
        </div>
      </div>
    );
  }
  if (original === null || reworded === null) {
    return (
      <div>
        <h1>{t("topicsTitle")}</h1>
        <p className="muted">{t("loading")}</p>
      </div>
    );
  }
  return (
    <div>
      <h1>{t("topicsTitle")}</h1>
      <div className="alert">
        <b>{t("topicsAlertBold")}</b> {t("topicsAlertRest")}
      </div>
      <ul>
        <li dir="auto">{t("topicsLi1")}</li>
        <li dir="auto">{t("topicsLi2")}</li>
      </ul>
      <h2>{tf("topicsOrigHeading", { n: original.length })}</h2>
      {/* Stable language-independent session scopes: without an
          explicit sessionScope the scope defaults to `quiz:<title>`
          where the title is TRANSLATED, so sessions saved in one
          language were invisible in another. The `subject` labels
          stay as-is — they are hardcoded English, already stable
          across languages, and feed the session fingerprint and
          attempt records. */}
      <QuizRunner
        title={t("topicsOrigTitle")}
        questions={original}
        mode="practice"
        subject="Past-Paper Topics"
        sessionScope="topics:pastpapers"
      />
      <h2>{tf("topicsRewordHeading", { n: reworded.length })}</h2>
      <QuizRunner
        title={t("topicsRewordTitle")}
        questions={reworded}
        mode="practice"
        subject="Past-Paper Topics (Reworded)"
        sessionScope="topics:reworded"
      />
    </div>
  );
}
