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
    await expect(page).toHaveScreenshot('home-desktop.png', {fullPage: true});
  });
});
