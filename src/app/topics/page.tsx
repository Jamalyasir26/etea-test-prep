// Practice from Past-Paper Topics — original + reworded.
// NO past-paper documents, PDFs or verbatim questions are hosted here.
"use client";

import { BY_SUBJECT } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import QuizRunner from "@/components/QuizRunner";

export default function Topics() {
  const { t, tf } = useLang();
  const original = BY_SUBJECT["pastpapers"] ?? [];
  const reworded = BY_SUBJECT["pastpapers_reworded"] ?? [];
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
      <QuizRunner
        title={t("topicsOrigTitle")}
        questions={original}
        mode="practice"
        subject="Past-Paper Topics"
      />
      <h2>{tf("topicsRewordHeading", { n: reworded.length })}</h2>
      <QuizRunner
        title={t("topicsRewordTitle")}
        questions={reworded}
        mode="practice"
        subject="Past-Paper Topics (Reworded)"
      />
    </div>
  );
}
