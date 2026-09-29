import {describe, expect, it} from 'vitest';
import {
  getEmptyPredictiveSearchResult,
  getSearchUrl,
  urlWithTrackingParams,
} from './search';

describe('getEmptyPredictiveSearchResult', () => {
  it('returns a reset empty state with all item buckets', () => {
    const empty = getEmptyPredictiveSearchResult();

    expect(empty.total).toBe(0);
    expect(Object.keys(empty.items).sort()).toEqual([
      'articles',
      'collections',
      'pages',
      'products',
      'queries',
    ]);
    for (const bucket of Object.values(empty.items)) {
      expect(bucket).toEqual([]);
    }
  });

  it('returns a fresh object every call (no shared references)', () => {
    const a = getEmptyPredictiveSearchResult();
    const b = getEmptyPredictiveSearchResult();
    expect(a).not.toBe(b);
    expect(a.items).not.toBe(b.items);
  });
});

describe('search URLs', () => {
  it('encodes terms exactly once', () => {
    expect(getSearchUrl('neural headset & stand')).toBe(
      '/search?q=neural+headset+%26+stand',
    );
    expect(
      urlWithTrackingParams({
        baseUrl: '/products/headset',
        term: 'neural headset',
        trackingParams: 'utm_source=shopify&utm_medium=predictive',
      }),
    ).toBe(
      '/products/headset?q=neural+headset&utm_source=shopify&utm_medium=predictive',
    );
  });

  it('preserves existing parameters without creating a second question mark', () => {
    expect(
      urlWithTrackingParams({
        baseUrl: '/products/headset?Color=Black',
        term: 'headset',
      }),
    ).toBe('/products/headset?Color=Black&q=headset');
  });
});
