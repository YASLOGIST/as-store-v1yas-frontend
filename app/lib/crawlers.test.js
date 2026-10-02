import {describe, expect, it, vi, afterEach} from 'vitest';
import {
  CRAWLER_CACHE_SECONDS,
  CRAWLER_DEGRADED_CACHE_SECONDS,
  crawlerUnavailable,
  isThrownResponse,
} from './crawlers';
import {
  loader as robotsLoader,
  robotsTxtData,
} from '../routes/[robots.txt].jsx';

const request = new Request('https://shop.example/robots.txt');

function contextWith(queryImpl) {
  return {
    storefront: {
      query: queryImpl,
      CacheLong: () => ({}),
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('crawlerUnavailable', () => {
  it('returns a retryable, uncacheable plain-text 503', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = crawlerUnavailable(new Error('upstream down'), {
      resource: 'sitemap.xml',
    });

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe(
      String(CRAWLER_DEGRADED_CACHE_SECONDS),
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    await expect(response.text()).resolves.toContain('sitemap.xml');
  });

  it('keeps routing decisions distinguishable from faults', () => {
    expect(isThrownResponse(new Response(null, {status: 404}))).toBe(true);
    expect(isThrownResponse(new Error('boom'))).toBe(false);
  });
});

describe('robots.txt loader', () => {
  it('serves shop-scoped rules and the sitemap when the shop resolves', async () => {
    const response = await robotsLoader({
      request,
      context: contextWith(async () => ({
        shop: {id: 'gid://shopify/Shop/55'},
      })),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      `max-age=${CRAWLER_CACHE_SECONDS}`,
    );
    expect(body).toContain('Disallow: /55/checkouts');
    expect(body).toContain('Sitemap: https://shop.example/sitemap.xml');
  });

  it('still answers 200 with valid rules when the shop query throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await robotsLoader({
      request,
      context: contextWith(async () => {
        throw new Error('storefront unavailable');
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Disallow: /checkout');
    expect(body).not.toContain('undefined');
    // Degraded documents expire quickly so the shop-scoped rules come back.
    expect(response.headers.get('Cache-Control')).toBe(
      `max-age=${CRAWLER_DEGRADED_CACHE_SECONDS}`,
    );
    expect(error).toHaveBeenCalled();
  });

  it('omits shop-scoped lines instead of emitting empty directives', () => {
    const body = robotsTxtData({url: 'https://shop.example'});

    expect(body).not.toMatch(/Disallow:\s*\/\s*\/checkouts/);
    expect(body).not.toContain('Disallow: /undefined/orders');
  });
});

describe('sitemap routes', () => {
  const sitemapRequest = new Request('https://shop.example/sitemap.xml');

  it('degrades the index to a retryable 503 when the index query fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const {loader} = await import('../routes/[sitemap.xml].jsx');

    const response = await loader({
      request: sitemapRequest,
      context: {
        storefront: {
          query: async () => {
            throw new Error('storefront unavailable');
          },
        },
      },
    });

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBeTruthy();
  });

  it('degrades an incomplete index instead of serving an HTML error page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const {loader} = await import('../routes/[sitemap.xml].jsx');

    // Hydrogen throws when any requested resource type is absent.
    const response = await loader({
      request: sitemapRequest,
      context: {
        storefront: {query: async () => ({products: {pagesCount: {count: 1}}})},
      },
    });

    expect(response.status).toBe(503);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
  });

  it('keeps a 404 for unknown sitemap types a 404', async () => {
    const {loader} = await import('../routes/sitemap.$type.$page[.xml].jsx');

    await expect(
      loader({
        request: new Request('https://shop.example/sitemap/unknown/1.xml'),
        params: {type: 'unknown', page: '1'},
        context: {storefront: {query: async () => ({})}},
      }),
    ).rejects.toSatisfy(
      (error) => error instanceof Response && error.status === 404,
    );
  });
});
