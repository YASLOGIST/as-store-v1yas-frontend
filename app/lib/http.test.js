import {describe, expect, it} from 'vitest';
import {
  assertSameOrigin,
  getLocalRedirect,
  getRequestId,
  hardenResponse,
  requestLog,
} from './http';

describe('HTTP boundary', () => {
  it('adds security, tracing, timing, and private cache headers', () => {
    const request = new Request('https://shop.example/cart');
    const response = hardenResponse(new Response('ok'), {
      request,
      requestId: 'request-1234',
      durationMs: 12.34,
    });

    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('strict-transport-security')).toContain(
      'max-age=31536000',
    );
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('server-timing')).toBe('app;dur=12.3');
    expect(response.headers.get('x-request-id')).toBe('request-1234');
  });

  it('only accepts bounded request IDs', () => {
    const accepted = new Request('https://shop.example/', {
      headers: {'x-request-id': 'trace-id-12345'},
    });
    const rejected = new Request('https://shop.example/', {
      headers: {'x-request-id': '<script>alert(1)</script>'},
    });

    expect(getRequestId(accepted)).toBe('trace-id-12345');
    expect(getRequestId(rejected)).not.toContain('<script>');
  });

  it('rejects foreign origins on mutations', () => {
    const request = new Request('https://shop.example/cart', {
      method: 'POST',
      headers: {origin: 'https://evil.example'},
    });

    expect(() => assertSameOrigin(request)).toThrow(Response);
  });

  it.each([
    'https://evil.example',
    '//evil.example/path',
    '/\\evil.example/path',
    'javascript:alert(1)',
  ])('rejects unsafe redirect %s', (target) => {
    const request = new Request('https://shop.example/cart');
    expect(getLocalRedirect(request, target)).toBe('/cart');
  });

  it('preserves a valid local redirect path, search, and hash', () => {
    const request = new Request('https://shop.example/cart');
    expect(getLocalRedirect(request, '/collections/new?q=gear#top')).toBe(
      '/collections/new?q=gear#top',
    );
  });

  it('emits privacy-safe structured logs', () => {
    const request = new Request('https://shop.example/search?q=private-value', {
      headers: {cookie: 'secret=true'},
    });
    const record = requestLog({
      request,
      requestId: 'request-1234',
      status: 200,
      durationMs: 1.6,
    });

    expect(JSON.parse(record)).toMatchObject({
      event: 'http_request',
      path: '/search',
      status: 200,
      durationMs: 2,
    });
    expect(record).not.toContain('private-value');
    expect(record).not.toContain('secret=true');
  });
});
