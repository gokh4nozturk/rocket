/**
 * Renders a JSON-LD <script> for structured data. Server component — the object
 * is serialized at render time and embedded in the document head/body.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inlined as a script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      type="application/ld+json"
    />
  );
}
