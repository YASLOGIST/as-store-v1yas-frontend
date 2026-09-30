# Reverse-engineering audit — 2026-09-30

## Classification and success

**Classification:** source web application / edge-rendered commerce storefront.

Success means a newcomer can install, test, build, and safely extend the Hydrogen storefront in minutes; catalog, search, product, cart, checkout, and account flows remain correct under expected failures; the UI is responsive, keyboard-accessible, locale-aware, measurable against explicit bundle budgets, and protected at every browser/upstream trust boundary.

## Confirmed stack

| Finding | Status | Evidence |
|---|---|---|
| React 18 SSR with React Router 7 | Confirmed | `package.json`, `app/entry.*`, `app/routes.js` |
| Shopify Hydrogen 2026.4.5 and Oxygen worker | Confirmed | `package.json`, `server.js` |
| Storefront and Customer Account GraphQL | Confirmed | `app/lib/context.js`, route queries |
| Vite 6, ESLint 9, Prettier 3, Vitest 5 | Confirmed | package/config files |
| Shopify Oxygen deployment | Confirmed | `.github/workflows/oxygen-deployment-1000134250.yml` |
| Merchant/store runtime behavior | Unknown until configured | requires authorized Shopify environment values |

## Ranked audit and resolution

Score is impact/effort on a 1–5 scale. Evidence is the baseline at commit `046377e`.

| # | Finding | I/E | Baseline evidence | Resolution |
|---:|---|---:|---|---|
| 1 | No automated major-flow characterization | 5/3 | tests covered only `app/lib` | Added route-level product, search, and cart flow tests |
| 2 | CI had no explicit accessibility gate | 5/2 | `.github/workflows/ci.yml` | Added JSX a11y gate and document locale tests |
| 3 | No performance regression budget | 4/2 | build printed sizes without enforcing them | Added gzip bundle-budget checker and CI gate |
| 4 | Arabic/RTL document direction missing | 4/1 | `app/root.jsx` only set `lang` | Added validated locale normalization and `dir` |
| 5 | Route transitions had no global feedback | 4/2 | `PageLayout.jsx` had no navigation state UI | Added visual progress and live-region status |
| 6 | Product sharing required manual URL copying | 3/2 | product route exposed no share action | Added native share, clipboard, and copy fallback |
| 7 | CI security controls were bundled into a generic step | 4/1 | one `npm run audit:security` step | Added explicit security gate with dependency and boundary tests |
| 8 | Build emitted untracked React Router v8 migration warnings | 2/1 | baseline build output | Enabled supported future flags explicitly |
| 9 | Build metrics were undocumented and non-repeatable | 3/1 | no checked-in measurement command | Added `check:performance` and baseline/final report |
| 10 | Configured-store end-to-end behavior remains unverified | 5/5 | credentials intentionally absent | Retained as a manual smoke test in `docs/ACCEPTANCE.md` |

Items 1–9 were implemented without external credentials. Item 10 cannot be truthfully automated in this environment because it requires an authorized Shopify store and account.
