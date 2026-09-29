import {useNonce} from '@shopify/hydrogen';

/**
 * Renders schema.org JSON-LD structured data as a React script tag.
 * Kept as a component (JSX) separate from the pure helpers in `lib/seo.js`.
 * @param {{data: object, nonce?: string}} props
 */
export function StructuredData({data, nonce}) {
  const contextNonce = useNonce();
  return (
    <script
      type="application/ld+json"
      nonce={nonce ?? contextNonce}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
