# Reverse-engineering audit — 2026-10-01

## Classification and success

**Classification:** source web application / edge-rendered commerce storefront.

Success means a newcomer can install, test, build, and safely extend the Hydrogen storefront in minutes; catalog, search, product, cart, checkout, account, SEO, and operational flows remain correct under expected failures; the UI is responsive, keyboard-accessible, market-aware, measurable against explicit bundle budgets, and protected at every browser/upstream trust boundary.

## Confirmed stack and visual decision

| Finding | Status | Evidence |
|---|---|---|
| React 18 SSR with React Router 7 file routes | **CONFIRMED** | `package.json`, `app/entry.*`, `app/routes.js` |
| Shopify Hydrogen 2026.4.5 on Oxygen workers | **CONFIRMED** | `package.json`, `server.js` |
| Storefront and Customer Account GraphQL | **CONFIRMED** | `app/lib/context.js`, route queries |
| Vite 6, ESLint 9, Prettier 3, Vitest 5 | **CONFIRMED** | package/config files |
| Shopify Oxygen delivery | **CONFIRMED** | `.github/workflows/oxygen-deployment-1000134250.yml` |
| Dark “VOLT” glass/aurora design system with native CSS motion | **CONFIRMED** | `app/styles/app.css` |
| Actual merchant catalog and production runtime behavior | **UNKNOWN** | authorized store configuration is not present |

**Motion/3D decision:** Use input/scroll-driven CSS depth and centralized transform/opacity motion; perpetual orbit/scan loops were removed after they missed the frame guard. True 3D remains off by default, but real Shopify `Model3d` media now activates a lazy pinned `<model-viewer>` integration behind an independent kill switch with the merchant image as fallback.

## Ranked top 10 audit

Impact/effort are scored 1–5. “Resolved” means implemented and covered by this repository’s gates.

| # | Weakness or opportunity | I/E | Evidence | Resolution |
|---:|---|---:|---|---|
| 1 | Sitemap advertised three locale-prefixed route trees the router does not implement, producing crawlable 404s | 5/1 | former `locales` and `getLink` in `app/routes/sitemap.$type.$page[.xml].jsx`; no locale segment in `app/routes.js` | **Resolved:** emit encoded canonical routes only; regression test added |
| 2 | Store API market was hard-coded to EN/US despite RTL/document locale support | 5/2 | former literal in `app/lib/context.js`; `app/root.jsx` consumes context locale | **Resolved:** validated `PUBLIC_STORE_LANGUAGE`/`PUBLIC_STORE_COUNTRY` configuration and tests |
| 3 | No low-cost readiness endpoint for edge probes | 4/1 | no baseline health resource route | **Resolved:** minimal, non-cacheable `/health.json`; no environment disclosure |
| 4 | Closed drawers remained in the focus model as an implicit CSS assumption | 4/1 | `app/components/Aside.jsx` retained mounted controls | **Resolved:** closed overlays are `inert` in addition to `aria-hidden` |
| 5 | Repeated navigation landmarks lacked unique accessible names | 3/1 | Header/Footer nav elements | **Resolved:** Primary, Mobile menu, Store tools, Explore, and Footer labels |
| 6 | Browser gates previously skipped without live credentials | 5/3 | former conditional Playwright suite | **Resolved:** deterministic local Storefront/cart adapter executes nine real Hydrogen browser checks, axe, screenshot, RTL, reduced-motion, no-JS, and metrics in CI |
| 7 | Merchant rich HTML is rendered intentionally and relies on Shopify sanitation plus CSP | 4/3 | product/page/blog/policy routes; nonce CSP in `app/entry.server.jsx` | **Accepted/monitor:** retain CSP; validate merchant authoring policy in staging |
| 8 | Full locale-prefixed URLs and locale switching are not implemented | 4/4 | flat route tree has no locale prefix | **Open:** add only when multiple indexed markets are a product requirement |
| 9 | Upstream latency/error rates are logged only at coarse request boundaries | 3/3 | `server.js`, route `console.error` calls | **Open:** connect Oxygen logs to the selected observability vendor before launch |
| 10 | Runtime/browser performance needs production RUM, not only bundle budgets | 4/3 | `scripts/check-bundle.mjs`; no authorized production traffic | **Open:** monitor LCP/INP/CLS by route after deployment |

## Evidence and unknowns

| Claim | Evidence | Confidence |
|---|---|---|
| Mutations enforce same-origin and bounded cart input | `app/lib/http.js`, `app/lib/validation.js`, flow tests | **CONFIDENT** |
| Sessions use signed cookies and support secret rotation | `app/lib/session.js`, `app/lib/env.js` | **CONFIDENT** |
| SEO metadata, structured data, robots, and sitemap routes exist | `app/lib/seo.js`, `app/routes/[robots.txt].jsx`, sitemap routes | **CONFIDENT** |
| The selected Shopify market reaches Storefront and account clients | `app/lib/context.js`, environment tests | **CONFIDENT** |
| Checkout, OAuth, and catalog behavior work for the target merchant | requires authorized APIs and browser smoke test | **UNKNOWN** |
| Production Core Web Vitals meet targets | requires deployed RUM or a representative staging run | **UNKNOWN** |

Cheapest resolution for merchant/runtime unknowns is one staging deployment followed by the checked-in smoke checklist. Cheapest performance resolution is route-level RUM for LCP, INP, and CLS, segmented by device class.
