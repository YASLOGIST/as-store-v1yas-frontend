import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';

const productHandle = process.env.E2E_PRODUCT_HANDLE || 'volt-prototype';
const searchTerm = process.env.E2E_SEARCH_TERM || 'VOLT';

async function expectA11y(page) {
  const results = await new AxeBuilder({page})
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe('storefront browser flows', () => {
  test('search submits and renders the API result', async ({page}) => {
    await page.goto('/search');
    const input = page.getByTestId('search-input');
    await input.fill(searchTerm);
    await input.press('Enter');

    await expect(page).toHaveURL(
      (url) => url.searchParams.get('q') === searchTerm,
    );
    await expect(page.getByTestId('search-results')).toBeVisible();
    await expect(page.getByText('VOLT Prototype').first()).toBeVisible();
    await expectA11y(page);
  });

  test('product renders real API states and static media fallback', async ({
    page,
  }) => {
    await page.goto(`/products/${encodeURIComponent(productHandle)}`);

    await expect(page.getByTestId('product-page')).toBeVisible();
    await expect(page.getByRole('heading', {level: 1})).toHaveText(
      'VOLT Prototype',
    );
    await expect(page.getByTestId('product-media')).toBeVisible();
    await expect(page.getByText('Only 3 left in stock')).toBeVisible();
    await expect(
      page.locator('.product-main').getByTestId('add-to-cart'),
    ).toBeEnabled();
    await expectA11y(page);
  });

  test('cart accepts a product and announces optimistic success', async ({
    page,
  }) => {
    await page.goto(`/products/${encodeURIComponent(productHandle)}`);
    const addButton = page.locator('.product-main').getByTestId('add-to-cart');
    await addButton.click();

    const drawer = page.getByRole('dialog', {name: 'Cart'});
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId('cart')).toContainText('VOLT Prototype');
    await expect(page.getByLabel(/Open cart, 1 item/)).toBeVisible();
  });

  test('quick view is keyboard-operable and can add to cart', async ({
    page,
  }) => {
    await page.goto('/');
    const open = page.getByTestId('quick-view-open').first();
    await open.focus();
    await open.press('Enter');

    const dialog = page.getByTestId('quick-view');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', {name: 'VOLT Prototype'}),
    ).toBeVisible();
    await expectA11y(page);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('RTL market uses document direction and logical layout', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('body')).toHaveCSS('direction', 'rtl');
    await page.getByLabel('Language and market').selectOption('EN-US');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  test('reduced motion disables decorative motion', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto('/');
    await expect(page.locator('.ambient-pointer-light')).toHaveCSS(
      'display',
      'none',
    );
    await expect(page.locator('.hero-orbit').first()).toHaveCSS(
      'animation-name',
      'none',
    );
  });

  test('hero GPU field resolves to a GPU or fallback state and recovers its context', async ({
    page,
  }) => {
    await page.goto('/');
    const canvas = page.locator('.hero-signal-field');
    // Bring-up is deliberately deferred to the first real input, so nothing
    // happens until the pointer moves.
    await expect(canvas).toHaveAttribute('data-render-state', 'idle');
    // Nudge the pointer until the field reacts: the listeners are attached by
    // the client effect, so a single move can land before hydration.
    let nudge = 0;
    // The field only runs where there is a GPU to run it on. CI's Chromium
    // rasterises with SwiftShader, where a fullscreen fragment program would
    // block the main thread, so 'fallback' is the correct outcome there and
    // the stylesheet hides the canvas.
    await expect
      .poll(
        async () => {
          nudge += 1;
          await page.mouse.move(400 + (nudge % 2), 400);
          return canvas.getAttribute('data-render-state');
        },
        {timeout: 10_000},
      )
      .toMatch(/^(ready|fallback)$/);
    const state = await canvas.getAttribute('data-render-state');
    if (state === 'fallback') {
      expect(await canvas.getAttribute('data-renderer')).toBe('software');
      await expect(canvas).toHaveCSS('display', 'none');
      await expect(page.locator('.hero-visual-frame')).toBeVisible();
      return;
    }

    const recovery = await canvas.evaluate(
      (node) =>
        new Promise((resolve) => {
          const gl = node.getContext('webgl');
          const extension = gl?.getExtension('WEBGL_lose_context');
          if (!extension) {
            resolve({supported: false, recovered: false});
            return;
          }
          let lost = false;
          node.addEventListener(
            'webglcontextlost',
            () => {
              lost = true;
              setTimeout(() => extension.restoreContext(), 80);
            },
            {once: true},
          );
          node.addEventListener(
            'webglcontextrestored',
            () => resolve({supported: true, recovered: lost}),
            {once: true},
          );
          extension.loseContext();
        }),
    );
    if (recovery.supported) {
      expect(recovery.recovered).toBe(true);
      await expect(canvas).toHaveAttribute('data-render-state', 'ready');
    }
  });

  test('no-JS baseline keeps product content and purchase destination readable', async ({
    browser,
  }) => {
    const context = await browser.newContext({javaScriptEnabled: false});
    const page = await context.newPage();
    await page.goto(`/products/${encodeURIComponent(productHandle)}`);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(
      'VOLT Prototype',
    );
    await expect(page.getByText(/Secure Shopify checkout/)).toBeVisible();
    await context.close();
  });

  test('motion and Core Web Vitals stay inside local guardrails', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__voltMetrics = {lcp: 0, cls: 0, event: 0};
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        window.__voltMetrics.lcp = entries.at(-1)?.startTime || 0;
      }).observe({type: 'largest-contentful-paint', buffered: true});
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__voltMetrics.cls += entry.value;
        }
      }).observe({type: 'layout-shift', buffered: true});
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__voltMetrics.event = Math.max(
            window.__voltMetrics.event,
            entry.duration,
          );
        }
      }).observe({type: 'event', buffered: true, durationThreshold: 16});
    });
    const measureFps = () =>
      page.evaluate(
        () =>
          new Promise((resolve) => {
            let frames = 0;
            const started = performance.now();
            const tick = (time) => {
              frames += 1;
              if (time - started >= 1000)
                resolve((frames * 1000) / (time - started));
              else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }),
      );

    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto('/');
    const baselineFps = await measureFps();
    const baselineMetrics = await page.evaluate(() => ({
      ...window.__voltMetrics,
    }));
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.reload();
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      window.__voltMetrics.event = 0;
    });
    await page.getByRole('button', {name: 'Search'}).click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const premiumFps = await measureFps();
    const metrics = await page.evaluate(() => window.__voltMetrics);
    console.warn('VOLT_METRICS', {
      baseline: {fps: baselineFps, ...baselineMetrics},
      final: {fps: premiumFps, ...metrics},
    });
    // The bundled serverless Chromium is 30 Hz in this sandbox. Premium motion
    // may consume no more than 15% of the reduced-motion control frame rate.
    expect(premiumFps).toBeGreaterThanOrEqual(24);
    expect(premiumFps).toBeGreaterThanOrEqual(baselineFps * 0.85);
    expect(metrics.lcp).toBeLessThanOrEqual(2500);
    expect(metrics.cls).toBeLessThanOrEqual(0.1);
    expect(metrics.event).toBeLessThanOrEqual(200);
  });

  test('collection filters and sort stay in the url and narrow the grid', async ({
    page,
  }) => {
    await page.goto('/collections/volt-essentials');
    await expect(page.getByText('6 products in this collection')).toBeVisible();

    await page.getByRole('link', {name: /^In stock/}).click();
    await expect(page).toHaveURL((url) =>
      url.searchParams.getAll('filter').includes('{"available":true}'),
    );
    await expect(page.getByText('5 products match')).toBeVisible();
    await expect(
      page.getByRole('link', {name: /remove Availability filter/}),
    ).toBeVisible();

    await page.getByLabel('Sort').selectOption('price-desc');
    await expect(page).toHaveURL(
      (url) => url.searchParams.get('sort') === 'price-desc',
    );
    await expect(page.locator('.product-item-title').first()).toContainText(
      'SIGNAL USB Analyzer',
    );
    await expectA11y(page);

    await page.getByRole('link', {name: 'Clear all'}).click();
    await expect(page.getByText('6 products in this collection')).toBeVisible();
    await expect(page).toHaveURL(
      (url) => url.searchParams.getAll('filter').length === 0,
    );
  });

  test('collection filters work without client javascript', async ({
    browser,
  }) => {
    const context = await browser.newContext({javaScriptEnabled: false});
    const page = await context.newPage();
    await page.goto('/collections/volt-essentials');
    await page.getByRole('link', {name: /^Out of stock/}).click();
    await expect(page.getByText('1 product matches')).toBeVisible({
      timeout: 10_000,
    });
    await context.close();
  });

  test('home visual regression', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto('/');
    // Capture the English fixture in its matching document direction; RTL is
    // covered independently above.
    await page.getByLabel('Language and market').selectOption('EN-US');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.product-item').first()).toBeAttached();
    // Full-page captures need every lazy-rendered section painted; production
    // still keeps content-visibility for real viewport performance.
    await page.addStyleTag({
      content:
        '.home-section, .footer { content-visibility: visible !important; }',
    });
    // Decode the media that has already loaded, so a slow runner cannot
    // capture the page mid-decode.
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter((image) => image.complete)
          .map((image) => image.decode().catch(() => undefined)),
      ),
    );
    await expect(page).toHaveScreenshot('home-desktop.png', {fullPage: true});
  });
});
