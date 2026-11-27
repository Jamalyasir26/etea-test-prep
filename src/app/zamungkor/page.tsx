// ZamungKor section — current vs previous preparation, kept separate.
// Current half: the official ETEA Project 891 mocks (zam4/zam5).
// Previous half: the untouched proxy mocks (zam1/zam2/zam3).
// Mock cards render from data (VISIBLE_MOCKS, in the fixed id order
// below) — no titles, totals or minutes are hardcoded here.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VISIBLE_MOCKS, mockLabels, mockLabelsSync, resolveMockView, type MockLabels } from "@/lib/data";
import { lri, useLang } from "@/lib/i18n";
import { loadReviews, type ReviewRecord } from "@/lib/tracking";
import { StatusBadge } from "@/components/StatusBadges";

const ZAMUNGKOR_SYLLABUS_URL =
  "https://etea.online/advertisement/course_content/891_7f36d7dbbeb4261f575eea5659ff5f4f.png";

const CURRENT_IDS = ["zam4", "zam5"];
const PREVIOUS_IDS = ["zam1", "zam2", "zam3"];

export default function ZamungkorSection() {
  const { lang, t, tf } = useLang();
  // Trusted counts load async after mount (same B07 pattern as the
  // mock list); first paint uses the exact sync fallback (trusted: 0).
  const [reviews, setReviews] = useState<Record<string, ReviewRecord>>({});
  useEffect(() => {
    setReviews(loadReviews());
  }, []);
  const overrides: Record<string, string> = {};
  for (const [qid, r] of Object.entries(reviews)) overrides[qid] = r.reviewStatus;
  const [labelsById, setLabelsById] = useState<Record<string, MockLabels>>({});
  useEffect(() => {
    let live = true;
    Promise.all(
      VISIBLE_MOCKS.map(async (m) => [m.id, await mockLabels(m, overrides)] as const),
    ).then(
      (entries) => {
        if (live) setLabelsById(Object.fromEntries(entries));
      },
      () => {
        /* keep the sync fallback */
      },
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews]);

  // Render from data, in the fixed id order — a missing id (not yet
  // in content.json) simply renders nothing for that half.
  const byId = new Map(VISIBLE_MOCKS.map((m) => [m.id, m]));
  const current = CURRENT_IDS.map((id) => byId.get(id)).filter(
    (m): m is NonNullable<typeof m> => Boolean(m),
  );
  const previous = PREVIOUS_IDS.map((id) => byId.get(id)).filter(
    (m): m is NonNullable<typeof m> => Boolean(m),
  );

  function mockCard(m: (typeof VISIBLE_MOCKS)[number]) {
    const labels = labelsById[m.id] ?? mockLabelsSync(m);
    const trusted = labels.trusted;
    const view = resolveMockView(m, lang);
    return (
      <div className="card" key={m.id}>
        <h3>
          <span dir="auto">{view.title}</span>{" "}
          {view.translated && (
            <span
              dir="ltr"
              className="badge grey"
              title={t("autoTranslatedBadgeAria")}
              aria-label={t("autoTranslatedBadgeAria")}
            >
              [Auto-Translated]
            </span>
          )}{" "}
          <span dir="ltr" className="badge teal">
            {tf("questionsShort", { n: m.total })}
          </span>{" "}
          <span dir="ltr" className="badge grey">
            {tf("minsLabel", { mins: m.minutes })}
          </span>
        </h3>
        <p>
          {labels.coverage === "proxy" ? (
            <StatusBadge label={t("mockLabelProxy")} detail={t("mockLabelProxyDetail")} tone="proxy" />
          ) : labels.coverage === "full" ? (
            <StatusBadge
              label={t("mockLabelFull")}
              detail={tf("mockLabelFullDetail", { total: m.total })}
              tone="reviewed"
            />
          ) : (
            <StatusBadge
              label={t("mockLabelPartial")}
              detail={tf("mockLabelPartialDetail", { n: labels.available, total: m.total })}
              tone="partial"
            />
          )}
          {trusted > 0 && trusted < m.total && (
            <StatusBadge
              label={t("mockLabelReviewedSubset")}
              detail={tf("mockLabelReviewedSubsetDetail", { n: trusted, total: m.total })}
              tone="partial"
            />
          )}
        </p>
        <p className="muted">
          <span dir="auto">{view.note}</span>
        </p>
        <p className="muted">
          {trusted > 0 ? (
            <>
              {tf("ofCount", { a: lri(String(trusted)), b: lri(String(m.total)) })}{" "}
              {t("trustedAvailableRest")}
            </>
          ) : (
            t("noReviewedYet")
          )}
        </p>
        <Link className="btn" href={`/mock/${m.id}`}>
          {t("startMock")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1>{t("zamSectionTitle")}</h1>
      <p className="muted">{t("zamSectionIntro")}</p>

      <section>
        <h2>
          {t("zamSectionCurrentHeading")}{" "}
          <span dir="ltr" className="badge teal">
            {t("zamSectionCurrentBadge")}
          </span>
        </h2>
        <p className="muted">{t("zamSectionCurrentNote")}</p>
        {current.map((m) => mockCard(m))}
      </section>

      <section>
        <h2>
          {t("zamSectionPreviousHeading")}{" "}
          <span dir="ltr" className="badge grey">
            {t("zamSectionPreviousBadge")}
          </span>
        </h2>
        <p className="muted">{t("zamSectionPreviousNote")}</p>
        {previous.map((m) => mockCard(m))}
      </section>

      <p>
        <a href={ZAMUNGKOR_SYLLABUS_URL} target="_blank" rel="noreferrer">
          {t("zamSectionSyllabusLink")}
        </a>
        {" · "}
        <Link href="/vacancies#ledger">{t("zamSectionViewLedger")}</Link>
        {" · "}
        <Link href="/tracks/zamungkor">{t("tracks")}</Link>
        {" · "}
        <Link href="/mock">{t("mocks")}</Link>
      </p>
    </div>
  );
}
