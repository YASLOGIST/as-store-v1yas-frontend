# Asset and dependency provenance

| Asset or runtime | Source | License / ownership | Delivery |
|---|---|---|---|
| YAS logo mark | Original SVG geometry in `app/components/Icons.jsx` | Project-owned | Inline React SVG |
| Favicon and PWA icons | Existing repository assets | Project-owned repository material | Local `/public` and Vite asset |
| OG still and animation | Existing repository assets | Project-owned repository material | Local `/public` |
| Product/collection media | Merchant Shopify Storefront API | Merchant-controlled | Shopify responsive image CDN |
| UI fonts | OS system stacks only (`Inter` is a preference, not downloaded) | User operating system | No font request, no FOIT or font CLS |
| Visual noise, meshes, glow, hero rings | Original CSS gradients/geometry | Project-owned | CSS only; no bitmap payload |
| Hero signal field (`HeroSignalField.jsx`) | Original GLSL ES 1.0 fragment/vertex shaders written for this project; no external shader library, texture, or model | Project-owned | Compiled at runtime from inline source; zero network payload |
| E2E baseline screenshot | Captured from the deterministic local mock catalog in this repository | Project-owned | `e2e/__screenshots__/`, CI only |
| `<model-viewer>` | Google `@google/model-viewer` 4.1.0 | Apache-2.0 | Pinned jsDelivr module, fetched only when the feature flag is on and real `Model3d` media exists |
| axe browser engine | Deque `axe-core` through `@axe-core/playwright` | MPL-2.0 | Development/CI only |
| Headless Chromium test binary | `@sparticuz/chromium` | MIT; Chromium third-party licenses | Development/CI only, excluded from production bundles |

No stock imagery, external fonts, video, audio, model, shader, or texture was added in this pass. The deterministic browser fixture reuses the repository’s own `public/og-image.jpg`; it does not ship as catalog data in production.

## Data truthfulness

Every number this project renders falls into one of three declared buckets, and
each feature states its bucket in code or documentation:

- **Measured** — read from the device at runtime: frame pacing
  (`requestAnimationFrame` deltas behind the CWV e2e guardrails), WebGL context
  capability, and the software-renderer detection (`WEBGL_debug_renderer_info`)
  that lowers the hero frame cap.
- **Live** — Storefront API data (products, collections, shop) in production.
  The local/e2e environment serves a deterministic mock of the same query
  shapes (`app/lib/mock-storefront.js`); nothing in the UI treats mock values
  as production traffic.
- **Illustrative** — the hero signal field's rings, ruler, and reticle are an
  authored brand animation, not telemetry. No metric in the UI is derived from
  them, and they are never presented as measured data.
