// Bold-only markdown suite (Stage 2 tiny fix) — pins the pairing rules
// of parseBoldSegments and the XSS-safety structure of BoldText
// (plain strings rendered as React text nodes; no innerHTML anywhere).
// Run: node scripts/test-markdown.mjs

import { readFileSync } from "node:fs";
import { parseBoldSegments } from "../src/lib/boldText.ts";

let failures = 0;
function check(name, ok, extra = "") {
  if (ok) console.log("PASS ", name);
  else {
    failures++;
    console.log("FAIL ", name, extra);
  }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const show = (segs) => JSON.stringify(segs);

check(
  "plain text -> one literal segment",
  eq(parseBoldSegments("hello world"), [{ text: "hello world", bold: false }]),
);
check("empty string -> no segments", eq(parseBoldSegments(""), []));
check(
  "**bold** -> one bold segment",
  eq(parseBoldSegments("**bold**"), [{ text: "bold", bold: true }]),
);
check(
  "mixed text splits around the pair",
  eq(parseBoldSegments("a **b** c"), [
    { text: "a ", bold: false },
    { text: "b", bold: true },
    { text: " c", bold: false },
  ]),
  show(parseBoldSegments("a **b** c")),
);
check(
  "two pairs -> bold, literal, bold",
  eq(parseBoldSegments("**a** and **b**"), [
    { text: "a", bold: true },
    { text: " and ", bold: false },
    { text: "b", bold: true },
  ]),
);
check(
  "adjacent pairs -> two bold segments, no literal between",
  eq(parseBoldSegments("**a****b**"), [
    { text: "a", bold: true },
    { text: "b", bold: true },
  ]),
  show(parseBoldSegments("**a****b**")),
);
check(
  "unmatched ** stays literal to end of string",
  eq(parseBoldSegments("a **b"), [{ text: "a **b", bold: false }]),
);
check(
  "**** stays literal",
  eq(parseBoldSegments("****"), [{ text: "****", bold: false }]),
  show(parseBoldSegments("****")),
);
check(
  "** ** (blank content) stays literal",
  eq(parseBoldSegments("** **"), [{ text: "** **", bold: false }]),
  show(parseBoldSegments("** **")),
);
check(
  "single * is never special",
  eq(parseBoldSegments("a * b * c"), [{ text: "a * b * c", bold: false }]),
);
check(
  "*** is NOT italic: first ** opens, next ** closes",
  eq(parseBoldSegments("***x***"), [
    { text: "*x", bold: true },
    { text: "*", bold: false },
  ]),
  show(parseBoldSegments("***x***")),
);
check(
  "markup stays literal text (<script> is never parsed)",
  eq(parseBoldSegments("<script>alert(1)</script>"), [
    { text: "<script>alert(1)</script>", bold: false },
  ]),
);
check(
  "markup inside a bold pair stays a plain string",
  eq(parseBoldSegments("**<b>x</b>**"), [{ text: "<b>x</b>", bold: true }]),
);
check(
  "link syntax is not parsed",
  eq(parseBoldSegments("[x](https://example.com)"), [
    { text: "[x](https://example.com)", bold: false },
  ]),
);
check(
  "newlines survive inside segments",
  eq(parseBoldSegments("line1\n**bold**\nline3"), [
    { text: "line1\n", bold: false },
    { text: "bold", bold: true },
    { text: "\nline3", bold: false },
  ]),
);

// --- Structural safety: the component must never use innerHTML ---
const boldTextSrc = readFileSync(new URL("../src/components/BoldText.tsx", import.meta.url), "utf8");
// Strip line comments: the header comment NAMES dangerouslySetInnerHTML
// ("Never uses ...") — the check must catch real usage, not the mention.
const boldTextCode = boldTextSrc.replace(/\/\/.*$/gm, "");
check("BoldText.tsx has no dangerouslySetInnerHTML", !boldTextCode.includes("dangerouslySetInnerHTML"));
check("BoldText.tsx has no innerHTML", !/innerHTML/i.test(boldTextCode));
check("BoldText.tsx renders bold segments in <strong>", /<strong>/.test(boldTextSrc));
check("BoldText.tsx delegates to parseBoldSegments", boldTextSrc.includes("parseBoldSegments"));
const parserSrc = readFileSync(new URL("../src/lib/boldText.ts", import.meta.url), "utf8");
check("boldText.ts produces no HTML (no <strong> in the parser)", !parserSrc.includes("<strong>"));

console.log(failures === 0 ? "\nALL MARKDOWN CHECKS PASSED" : `\n${failures} MARKDOWN CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
