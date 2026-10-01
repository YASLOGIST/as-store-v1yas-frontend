# Acceptance and regression checklist

## Automated gate

- [x] `npm ci` completes from the lockfile (verified 2026-10-01).
- [x] `npm run check` passes lint, formatting, 76 tests across 12 files, and the dependency audit.
- [x] `npm run check:a11y` passes with zero warnings.
- [x] `npm run check:security` passes 26 focused boundary checks with zero advisories.
- [x] `/health.json` returns only `{"status":"ok"}` with `Cache-Control: no-store`.
- [x] Sitemap generation emits only implemented, canonical routes.
- [x] The Oxygen production build completes.
- [x] Bundle budgets pass: largest JS 44.6 KiB gzip, all JS 141.0 KiB gzip, all CSS 10.3 KiB gzip.
- [x] Nine Playwright checks execute against the local mocked Storefront API with no skips.
- [x] Search, product, cart, quick view, RTL switching, reduced-motion, and no-JS paths pass.
- [x] axe reports no WCAG A/AA violations on tested search, product, and modal states.
- [x] The reviewed home screenshot matches at a maximum 1.5% pixel-difference tolerance.
- [x] Local guardrails pass: LCP 312 ms, CLS 0, interaction event 96 ms, premium motion 60.7 fps.
- [x] Lighthouse CI is configured to enforce LCP ≤2.5 s, CLS ≤0.1, TBT ≤200 ms and category floors against the mocked production preview.

## Configured-store smoke test

- [ ] Home, collection, product, search, cart, blog, page, policy, and account routes render at mobile and desktop widths.
- [ ] Product quick-add opens the cart and changes the count exactly once.
- [ ] Cart line update/remove and discount operations persist after navigation.
- [ ] Search initial state prompts for input; no-match state includes the term; upstream failure shows one alert and no contradictory no-results copy.
- [ ] Predictive search supports keyboard navigation and closes with Escape.
- [ ] Login callback returns only to a local account path; logout rejects a cross-site POST.
- [ ] 404 and unexpected-error views do not disclose production error details.
- [ ] Merchant Model3d assets render only when the opt-in flag is enabled; static poster/image remains usable before and without module load.
- [ ] Account, cart, API, and cookie-setting responses send `Cache-Control: private, no-store` plus documented security headers.

Record store/domain, commit SHA, browser/device, date, and failures when executing the configured-store checklist.
