/**
 * Renders schema.org JSON-LD structured data as a React script tag.
 * Kept as a component (JSX) separate from the pure helpers in `lib/seo.js`.
 * @param {{data: object, nonce?: string}} props
 */
export function StructuredData({data, nonce}) {
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
