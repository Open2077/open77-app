/**
 * Emits a JSON-LD document.
 *
 * Rendered as a plain script tag inside the statically generated HTML so
 * crawlers and answer engines read it without executing anything. The payload
 * is produced by the helpers in `src/lib/seo.ts`, which already stringify it.
 */
export function JsonLd({ data }: { data: string }) {
  return (
    <script
      type="application/ld+json"
      // The payload is JSON we generated ourselves, never user input.
      dangerouslySetInnerHTML={{ __html: data }}
    />
  );
}
