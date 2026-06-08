/**
 * Renders a JSON-LD <script> for structured data. Server component — the object
 * is serialized at render time and embedded in the document head/body.
 *
 * Per the Next.js JSON-LD guide, `<` is escaped to its unicode equivalent so a
 * malicious value inside `data` can't break out of the script tag (XSS).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inlined as a script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
      type="application/ld+json"
    />
  );
}
