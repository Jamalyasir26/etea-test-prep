// Minimal bold-only text parser for AI answers (Stage 2 tiny fix).
// Splits text on `**...**` pairs into literal/bold segments. ONLY bold
// is supported: no links, no images, no headings, no lists, no raw HTML.
// Safety is structural, not sanitizer-based: this parser returns plain
// strings, and the BoldText component renders them as React text nodes,
// which React escapes — markup in the input (e.g. `<script>`) can only
// ever show as literal text. Nothing in this file produces HTML, and
// no caller may feed its output to dangerouslySetInnerHTML.
//
// Pairing rules (pinned by test-markdown.mjs):
// - `**text**` with non-blank content becomes one bold segment.
// - An unmatched `**` stays literal text to the end of the string.
// - `****` and `** **` (empty / whitespace-only content) stay literal:
//   the opener is emitted as text and scanning continues after it.
// - Single `*` is never special. `***` is NOT italic: the first `**`
//   opens bold and the next `**` closes it (documented, not pretty).
export type BoldSegment = { text: string; bold: boolean };

export function parseBoldSegments(text: string): BoldSegment[] {
  const segments: BoldSegment[] = [];
  let literal = "";
  const flushLiteral = () => {
    if (literal !== "") {
      segments.push({ text: literal, bold: false });
      literal = "";
    }
  };
  let i = 0;
  while (i < text.length) {
    if (text[i] === "*" && text[i + 1] === "*") {
      const close = text.indexOf("**", i + 2);
      if (close === -1) {
        literal += text.slice(i);
        break;
      }
      const content = text.slice(i + 2, close);
      if (content.trim() === "") {
        // Empty/blank bold: emit the opener literally and rescan after it.
        literal += "**";
        i += 2;
        continue;
      }
      flushLiteral();
      segments.push({ text: content, bold: true });
      i = close + 2;
    } else {
      literal += text[i];
      i += 1;
    }
  }
  flushLiteral();
  return segments;
}
