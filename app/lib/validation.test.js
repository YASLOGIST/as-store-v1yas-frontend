import {describe, expect, it} from 'vitest';
import {
  assertCartInput,
  clampSearchLimit,
  isStorefrontApiVersion,
  normalizeSearchTerm,
  parseCartPermalink,
  parseShopDomain,
} from './validation';

describe('input validation', () => {
  it('normalizes, bounds, and strips control characters from search terms', () => {
    expect(normalizeSearchTerm('  neural\u0000   headset  ')).toBe(
      'neural headset',
    );
    expect(normalizeSearchTerm('x'.repeat(150))).toHaveLength(100);
    expect(normalizeSearchTerm(null)).toBe('');
  });

  it('clamps predictive-search limits', () => {
    expect(clampSearchLimit('0')).toBe(1);
    expect(clampSearchLimit('500')).toBe(10);
    expect(clampSearchLimit('wat')).toBe(5);
  });

  it('parses a bounded cart permalink', () => {
    expect(parseCartPermalink('41007289663544:1,41007289696312:2')).toEqual([
      {
        merchandiseId: 'gid://shopify/ProductVariant/41007289663544',
        quantity: 1,
      },
      {
        merchandiseId: 'gid://shopify/ProductVariant/41007289696312',
        quantity: 2,
      },
    ]);
  });

  it.each(['abc:1', '123:0', '123:100', '123:NaN'])(
    'rejects malformed cart permalink %s',
    (value) => expect(() => parseCartPermalink(value)).toThrow(Response),
  );

  it('validates cart mutation payloads', () => {
    expect(() =>
      assertCartInput('LinesAdd', {
        lines: [
          {
            merchandiseId: 'gid://shopify/ProductVariant/123',
            quantity: 2,
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      assertCartInput('LinesAdd', {
        lines: [{merchandiseId: 'not-a-gid', quantity: 999}],
      }),
    ).toThrow(Response);
  });

  it('validates API versions and domain-only upstreams', () => {
    expect(isStorefrontApiVersion('2026-01')).toBe(true);
    expect(isStorefrontApiVersion('../admin')).toBe(false);
    expect(parseShopDomain('store.myshopify.com')).toBe('store.myshopify.com');
    expect(() => parseShopDomain('https://evil.example/path')).toThrow();
  });
});
