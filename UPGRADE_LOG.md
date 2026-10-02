# Upgrade log

Target: repository root (Hydrogen storefront, single unit).
Mode: UPGRADE · Autonomy: FULL · Branch: `arena/01a0fe14-as-store-v1yas-frontend`

## Classification

- Primary: WEB (edge-rendered Shopify Hydrogen storefront, React Router 7 on Oxygen)
- Secondary: BACKEND (route loaders / Storefront API boundary), DESIGN (dark "VOLT" system)
- Cross-cutting: TRUTH, SECURITY, ACCESSIBILITY, PERFORMANCE budgets
- Specialist engines: none required

## Baseline (2026-10-02, MEASURED)

| Gate                            | Result                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `npm run lint` / `format:check` | clean                                                                            |
| `npm test`                      | 99 passed / 15 files                                                             |
| `npm run build:ci`              | success                                                                          |
| `scripts/check-bundle.mjs`      | JS 44.6/50, 148.7/150 KiB gz; CSS 11.9/12.0 KiB gz                               |
| Local route sweep (mock mode)   | `/blogs` **500**, `/robots.txt` **500**, `/sitemap.xml` **500**, `/policies` 404 |

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

| Gate                                                                 | Result                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------- |
| `npm run lint` / `format:check`                                      | PASSED                                               |
| `npm test`                                                           | PASSED — 111 passed / 17 files (+12)                 |
| `npm run build:ci`                                                   | PASSED                                               |
| `scripts/check-bundle.mjs`                                           | PASSED — JS 44.6/50, 149.3/150; CSS 12.0/12.0 KiB gz |
| `npx playwright test` (14 tests, incl. axe + home visual regression) | PASSED                                               |
| Local route sweep                                                    | all 200, no 500s                                     |

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

---

# Wave 2 — V9 engine (2026-10-02)

Routing (R2) unchanged: PRIMARY WEB · SECONDARY BACKEND, DESIGN · cross-cutting
TRUTH, SECURITY, ACCESSIBILITY. No specialist engine required. Security baseline
(T2) re-inspected and found complete: CSP with nonce, HSTS, nosniff, frame-deny,
referrer and permissions policy, request-size cap, signed sessions — no work needed.

## Recon findings (W0, evidence by render — L11)

| Surface                               | Defect                                                                                                                              | Rule     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `/policies`                           | `<fieldset>` used as a card wrapper for links; no header, no context                                                                | Fit, T3  |
| `/policies/:handle`, `/pages/:handle` | long-form merchant HTML ran the full 1200 px container (~140 characters per line)                                                   | Exp, C4  |
| All merchant HTML                     | the reset zeroes margins and no prose rule restored them — multi-paragraph bodies collapsed into one block                          | Cor, Exp |
| `ErrorBoundary`                       | one "Something went sideways / Try again" state for every non-404 status                                                            | Rob, Exp |
| `app.css`                             | `.page` defined twice with conflicting max-widths; three near-duplicate prose definitions; duplicate focus-ring and container rules | Mnt      |

## Implemented

- **One prose system.** `.article-content` now owns colour, line-height, block
  rhythm, image treatment and in-body heading scale for articles, pages,
  policies and product descriptions. Three near-duplicate definitions collapsed
  into it (L8, DESIGN value consolidation).
- **Reading measure.** Pages and policies share the 760 px article column,
  landing at ~70 characters; enforced by a browser assertion, not by eye.
- **Policies rebuilt** as a semantic list with the house header, reusing the
  journal card and breadcrumb patterns rather than inventing new components.
- **Status-aware error contract** (`app/lib/errorStates.js`): 404 → home,
  401/403 → sign in, 429 → wait and retry, other 4xx → home, 5xx → retry.
- **Fixture realism.** Policy bodies in the mock are now multi-block documents,
  clearly labelled as fixtures (T1), so prose rendering is actually exercised.

## Creative notes (C1, C8)

Cliché inventory rejected for the trust pages: card grids of identical tiles,
invented "what this means for you" summaries of legal text (would fabricate
merchant terms — T1), icon badges for each policy, and a reassurance banner.
The chosen direction is editorial: one column, real hierarchy, breadcrumbs
instead of a bespoke back link.

Critique loop caught one regression: merging the `.collection` container rule
dropped its padding and max-width, pushing the catalog grid flush to the
viewport edge. Found in the render pass, fixed before verification (X4/I4).

## Verification (W7)

| Gate                  | Result                                                                      |
| --------------------- | --------------------------------------------------------------------------- |
| lint · format         | PASSED                                                                      |
| `npm test`            | PASSED — 116 passed / 18 files (111 → 116)                                  |
| `npm run build:ci`    | PASSED                                                                      |
| bundle budgets        | PASSED — JS 149.8/150, CSS 12.0/12.0 KiB gz (budgets unchanged)             |
| `npx playwright test` | PASSED — 15/15, incl. axe on the policy path and the home visual regression |

Budget note: the new styles were again paid for by removing duplicate and dead
CSS, not by relaxing `scripts/check-bundle.mjs` (T1).

---

# Wave 3 — search: make the dead end recoverable

## Defect found first (W0/W2)

The mock storefront answered **every** search term with the whole catalog, so
the no-result branch had never rendered in local or CI testing — and
`.search-empty`, the class that branch uses, had **no rule anywhere in
`app/styles/app.css`**. The store's main discovery failure state was both
unreachable in testing and unstyled. The existing e2e search assertion passed
trivially because any term "matched".

Same failure mode as the single-paragraph policy fixture in the previous wave:
*a fixture that is too permissive hides states instead of exercising them.*

## Changes

- `app/lib/mock-storefront.js` — `matchCatalog()` does a case-insensitive
  substring match over title / vendor / productType / description, wired into
  both `RegularSearch` and `PredictiveSearch`. A blank term matches nothing
  rather than everything. Exported so the behaviour is testable.
- `app/lib/search.js` — `getSearchEmptyState()` splits the one empty string into
  two situations: *nothing searched yet* (a quiet hint) and *searched, matched
  nothing* (a titled recovery state). The error branch returns `null` so one
  failure is never reported twice. `getSearchEmptyMessage()` keeps its contract.
- `app/routes/search.jsx` — renders that state: heading naming the failed term,
  one line of concrete advice (spelling, fewer words, brand or product type),
  and a primary link to `/collections/all`. It reuses `.collection-empty` /
  `.collection-description`, so it costs **zero new CSS bytes**. A result count
  (`1 result for "charger"`) now matches the catalog's counter.
- `app/components/SearchResults.jsx` — removed four `<br />` spacers (spacing
  already comes from `.search-result`) and gave the pagination controls the same
  `.pagination-link` affordance used by every other paginated list.

## Constraint honoured

`totalJavaScriptGzip` hit 150.3/150.0 KiB when the count sentence imported
`describeResults` from `collectionFilters`. The budget was **not** raised; the
import was dropped for a local two-branch string, returning to 150.0/150.0.
Headroom is now zero — the next wave must reclaim JS before adding any.

## Verification (W7, MEASURED 2026-10-02)

| Gate                  | Result                                                      |
| --------------------- | ----------------------------------------------------------- |
| lint · format         | PASSED                                                      |
| `npm test`            | PASSED — **122 passed / 18 files** (116 → 122)              |
| `npm run build:ci`    | PASSED                                                      |
| bundle budgets        | PASSED — JS 44.6/50.0, 150.0/150.0; CSS 12.0/12.0 KiB gz    |
| `npx playwright test` | PASSED — **16/16**, incl. axe on the no-results recovery    |

New tests: `app/lib/mock-storefront.test.js` (the fixture must discriminate),
three `getSearchEmptyState` cases, and an e2e test that follows the recovery
link from a zero-match search to the catalog.

---

# Wave 4 — one cross-platform search command

## Recon / defect

Search keyboard handling had split ownership. `PageLayout` opened the predictive
search drawer with Ctrl/Command K or `/`, while the standalone `SearchForm`
installed a second document listener that understood Command K only and focused
its local input. The interface and homepage copy advertised only `⌘K`. That made
the feature look macOS-only despite its actual cross-platform capability, added
a redundant global listener on the search route, and labeled the account control
only as “Account” to assistive technology even when its visible state said “Sign
in”.

## Upgrade

- Kept keyboard ownership in `GlobalShortcuts`; removed the duplicate route-level
  document listener and its effect lifecycle.
- Updated the visible shortcut and homepage product copy to `Ctrl/⌘ K`.
- Changed the account control's stable accessible name to “Account or sign in”,
  which remains present when the responsive visible label is hidden.
- Added a browser regression that executes `Control+K`, verifies the search
  dialog opens and autofocuses its searchbox, and checks the account name.

## Verification (MEASURED 2026-10-02)

| Gate | Result |
| --- | --- |
| lint · format | PASSED |
| `npm test` | PASSED — 122 / 122 |
| production build | PASSED |
| bundle budgets | PASSED — largest JS 44.6/50.0 KiB; total JS 149.9/150.0 KiB; CSS 12.0/12.0 KiB |
| full Playwright suite | PASSED — 17 / 17 (including the new cross-platform shortcut regression) |

No dependency, asset, CSS, API, data, or merchant behavior changes.
