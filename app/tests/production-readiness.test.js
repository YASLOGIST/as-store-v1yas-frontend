import {describe, expect, it} from 'vitest';
import {loader as healthLoader} from '../routes/health[.json]';
import {buildSitemapLink} from '../routes/sitemap.$type.$page[.xml]';

describe('production readiness contracts', () => {
  it('serves a minimal, non-cacheable health response without environment data', async () => {
    const response = healthLoader();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    await expect(response.json()).resolves.toEqual({status: 'ok'});
  });

  it('only emits reachable non-locale-prefixed sitemap links', () => {
    expect(
      buildSitemapLink({
        type: 'products',
        baseUrl: 'https://shop.example',
        handle: 'future gear',
      }),
    ).toBe('https://shop.example/products/future%20gear');
  });
});
