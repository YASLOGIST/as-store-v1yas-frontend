# Upgrade log

Target: repository root (Hydrogen storefront, single unit).
Mode: UPGRADE · Autonomy: FULL · Branch: `arena/01a0fe14-as-store-v1yas-frontend`

## Classification

- Primary: WEB (edge-rendered Shopify Hydrogen storefront, React Router 7 on Oxygen)
- Secondary: BACKEND (route loaders / Storefront API boundary), DESIGN (dark "VOLT" system)
- Cross-cutting: TRUTH, SECURITY, ACCESSIBILITY, PERFORMANCE budgets
- Specialist engines: none required

## Baseline (2026-10-02, MEASURED)

| Gate | Result |
|---|---|
| `npm run lint` / `format:check` | clean |
| `npm test` | 99 passed / 15 files |
| `npm run build:ci` | success |
| `scripts/check-bundle.mjs` | JS 44.6/50, 148.7/150 KiB gz; CSS 11.9/12.0 KiB gz |
| Local route sweep (mock mode) | `/blogs` **500**, `/robots.txt` **500**, `/sitemap.xml` **500**, `/policies` 404 |

The three 500s were reachable in the only runnable local environment, and two of
them sit on the crawler path, where a 5xx has host-level SEO consequences.

## Waves

**W2 — Stabilize (crawler + editorial failure contract)**

- `app/lib/crawlers.js`: shared failure contract for crawler-facing routes.
- `robots.txt` now always answers 200. A failed or empty shop lookup drops only
  the shop-scoped checkout rules and shortens cache to 5 minutes.
- `sitemap.xml` and `sitemap/:type/:page.xml` answer a retryable `503` +
  `Retry-After` instead of an HTML 500; thrown 404s still pass through.
- `/blogs` renders an empty-journal state when the store exposes no blog
  connection instead of throwing on `blogs.pageInfo`.

**W3 — Test environment fidelity**

- `app/lib/mock-storefront.js` now models Blogs, Blog, Article, Policies, Page,
  SitemapIndex and the typed sitemap queries, so nine previously unreachable
  routes execute locally and in CI.
- Unmodelled queries log `[mock-storefront] unhandled query: <name>` instead of
  silently returning `{}` and surfacing as a fake upstream outage.

**W4/W5 — Purpose, craft and i18n correctness**

- Journal index rebuilt on the house `collection-header` pattern with real copy,
  channel cards and an empty state; blog channel page gained the same header.
- Article dates were hard-coded to `en-US` and printed Latin months inside the
  Arabic RTL document. `formatPublishedDate` (app/lib/locale.js) follows the
  document language and returns `''` rather than `Invalid Date`.
- Markup/CSS drift fixed: `.blog-article` styled `h5` while rendering `h3`
  (titles sat flush against the card edge); `acccount-orders` typo class
  corrected; dead `.container` and `.sale-price` rules removed; the three
  identical resource-grid definitions consolidated.

**W7 — Verify**

| Gate | Result |
|---|---|
| `npm run lint` / `format:check` | PASSED |
| `npm test` | PASSED — 111 passed / 17 files (+12) |
| `npm run build:ci` | PASSED |
| `scripts/check-bundle.mjs` | PASSED — JS 44.6/50, 149.3/150; CSS 12.0/12.0 KiB gz |
| `npx playwright test` (14 tests, incl. axe + home visual regression) | PASSED |
| Local route sweep | all 200, no 500s |

Budgets were held, not raised: the journal styles were paid for by removing dead
and duplicated CSS.

## Assumptions

- Mock-mode 500s mirror a real failure mode (missing blog resource, transient
  Storefront error). Production behaviour with the merchant's live catalog is
  still UNMEASURED.
- The mock fixture's editorial content is deterministic test data, not merchant
  copy, and is only installed under `E2E_MOCK_MODE=1`.

## Residual risks

- Core Web Vitals under real traffic remain UNMEASURED (needs deployed RUM).
- Locale-prefixed URLs are still unimplemented (audit item 8), so the sitemap
  deliberately emits only canonical, reachable routes.
