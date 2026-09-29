import {afterEach, describe, expect, it, vi} from 'vitest';
import {proxyCheckoutGraphql} from './proxy';

afterEach(() => vi.unstubAllGlobals());

describe('checkout GraphQL proxy', () => {
  it('forwards only allowlisted headers and preserves upstream status', async () => {
    const upstreamFetch = vi.fn(
      async () =>
        new Response('{"data":null}', {
          status: 202,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'upstream-secret=true',
          },
        }),
    );
    vi.stubGlobal('fetch', upstreamFetch);

    const request = new Request(
      'https://store.example/api/2026-01/graphql.json',
      {
        method: 'POST',
        body: '{"query":"{shop{name}}"}',
        headers: {
          origin: 'https://store.example',
          'content-type': 'application/json',
          cookie: 'session=private',
          authorization: 'Bearer private',
          'x-shopify-storefront-access-token': 'public-token',
        },
      },
    );

    const response = await proxyCheckoutGraphql({
      request,
      version: '2026-01',
      checkoutDomain: 'checkout.example',
    });
    const [, init] = upstreamFetch.mock.calls[0];

    expect(upstreamFetch.mock.calls[0][0]).toBe(
      'https://checkout.example/api/2026-01/graphql.json',
    );
    expect(init.headers.get('content-type')).toBe('application/json');
    expect(init.headers.get('cookie')).toBeNull();
    expect(init.headers.get('authorization')).toBeNull();
    expect(response.status).toBe(202);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects invalid versions before making an upstream request', async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await proxyCheckoutGraphql({
      request: new Request('https://store.example/api/bad/graphql.json', {
        method: 'POST',
        headers: {origin: 'https://store.example'},
      }),
      version: '../admin',
      checkoutDomain: 'checkout.example',
    });

    expect(response.status).toBe(400);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('rejects oversized request bodies', async () => {
    const response = await proxyCheckoutGraphql({
      request: new Request('https://store.example/api/2026-01/graphql.json', {
        method: 'POST',
        headers: {
          origin: 'https://store.example',
          'content-length': String(300 * 1024),
        },
      }),
      version: '2026-01',
      checkoutDomain: 'checkout.example',
    });

    expect(response.status).toBe(413);
  });
});
