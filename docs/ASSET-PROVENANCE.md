# Asset and dependency provenance

| Asset or runtime | Source | License / ownership | Delivery |
|---|---|---|---|
| YAS logo mark | Original SVG geometry in `app/components/Icons.jsx` | Project-owned | Inline React SVG |
| Favicon and PWA icons | Existing repository assets | Project-owned repository material | Local `/public` and Vite asset |
| OG still and animation | Existing repository assets | Project-owned repository material | Local `/public` |
| Product/collection media | Merchant Shopify Storefront API | Merchant-controlled | Shopify responsive image CDN |
| UI fonts | OS system stacks only (`Inter` is a preference, not downloaded) | User operating system | No font request, no FOIT or font CLS |
| Visual noise, meshes, glow, hero rings | Original CSS gradients/geometry | Project-owned | CSS only; no bitmap payload |
| `<model-viewer>` | Google `@google/model-viewer` 4.1.0 | Apache-2.0 | Pinned jsDelivr module, fetched only when the feature flag is on and real `Model3d` media exists |
| axe browser engine | Deque `axe-core` through `@axe-core/playwright` | MPL-2.0 | Development/CI only |
| Headless Chromium test binary | `@sparticuz/chromium` | MIT; Chromium third-party licenses | Development/CI only, excluded from production bundles |

No stock imagery, external fonts, video, audio, model, shader, or texture was added in this pass. The deterministic browser fixture reuses the repository’s own `public/og-image.jpg`; it does not ship as catalog data in production.
