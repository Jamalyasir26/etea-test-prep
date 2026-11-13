// BoldText — renders `**bold**` markers in AI answers as <strong>.
// XSS-safe by construction: segments render as React text nodes (React
// escapes them), so HTML in the input shows as literal text. Never uses
// dangerouslySetInnerHTML. Used for tutor chat bubbles, the explain
// output, and the AI plan output (the three places AI prose renders).
import { parseBoldSegments } from "@/lib/boldText";

export default function BoldText({ text }: { text: string }) {
  const segments = parseBoldSegments(text);
  return (
    <>
      {segments.map((s, i) =>
        s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}
