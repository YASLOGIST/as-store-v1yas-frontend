# Acceptance and regression checklist

## Automated gate

- [ ] `npm ci` completes from the lockfile.
- [ ] `npm run check` passes lint, formatting, unit tests, and the complete dependency audit.
- [ ] `npx shopify hydrogen build` creates client and Oxygen server bundles without errors.

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
