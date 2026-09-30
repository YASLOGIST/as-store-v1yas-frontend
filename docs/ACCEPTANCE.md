# Acceptance and regression checklist

## Automated gate

- [x] `npm ci` completes from the lockfile (verified 2026-09-30).
- [x] `npm run check` passes lint, formatting, 69 tests, and the dependency audit.
- [x] `npm run check:a11y` passes with zero warnings.
- [x] `npm run check:security` passes 26 focused checks with zero advisories.
- [x] `npm run build:ci` creates client and Oxygen server bundles without errors.
- [x] `npm run check:performance` keeps the largest JS asset ≤50 KiB gzip, all JS ≤150 KiB gzip, and all CSS ≤12 KiB gzip.

## Configured-store smoke test

- [ ] Home, collection, product, search, cart, blog, page, policy, and account routes render at mobile and desktop widths.
- [ ] Product quick-add opens the cart and changes the count exactly once.
- [ ] Cart line update/remove and discount operations persist after navigation.
- [ ] Search initial state prompts for input; no-match state includes the term; upstream failure shows one alert and no contradictory no-results copy.
- [ ] Predictive search supports keyboard navigation and closes with Escape.
- [ ] Login callback returns only to a local account path; logout rejects a cross-site POST.
- [ ] 404 and unexpected-error views do not disclose production error details.
- [ ] Keyboard-only navigation has visible focus; dialogs trap/restore focus; reduced-motion mode disables decorative animation.
- [ ] HTML has the configured language, canonical metadata, and valid Product/Breadcrumb/WebSite JSON-LD where applicable.
- [ ] Account, cart, API, and cookie-setting responses send `Cache-Control: private, no-store` plus the documented security headers.

Record store/domain, commit SHA, browser/device, date, and failures when executing this checklist.
