import {describe, expect, it} from 'vitest';
import {loader as healthLoader} from '../routes/health[.json]';
import {buildSitemapLink} from '../routes/sitemap.$type.$page[.xml]';
import {loader as blogsLoader} from '../routes/blogs._index.jsx';

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

  it('renders an empty journal instead of failing when no blog resource exists', async () => {
    const data = await blogsLoader({
      request: new Request('https://shop.example/blogs'),
      context: {
        storefront: {
          // A store without a blog returns no `blogs` connection at all.
          query: async () => ({}),
          CacheShort: () => ({}),
        },
      },
    });

    expect(data.blogs.nodes).toEqual([]);
    expect(data.blogs.pageInfo.hasNextPage).toBe(false);
  });
});
