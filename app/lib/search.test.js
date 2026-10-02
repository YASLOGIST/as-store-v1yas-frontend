import {describe, expect, it} from 'vitest';
import {
  getEmptyPredictiveSearchResult,
  getSearchEmptyMessage,
  getSearchEmptyState,
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

describe('search empty-state copy', () => {
  it('guides an initial visit without claiming a failed match', () => {
    expect(getSearchEmptyMessage()).toContain('start searching');
  });

  it('identifies a completed search with no matches', () => {
    expect(getSearchEmptyMessage({term: 'orbital mouse'})).toContain(
      'orbital mouse',
    );
  });

  it('stays silent when the error alert owns the status message', () => {
    expect(getSearchEmptyMessage({term: 'mouse', error: 'Unavailable'})).toBe(
      null,
    );
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

describe('getSearchEmptyState', () => {
  it('stays quiet before the first query', () => {
    const state = getSearchEmptyState({term: ''});

    expect(state).toMatchObject({kind: 'initial'});
    expect(state.message).toBe(getSearchEmptyMessage());
    expect(state.title).toBeUndefined();
  });

  it('names the failed term and offers a way forward', () => {
    const state = getSearchEmptyState({term: 'zzzznothing'});

    expect(state.kind).toBe('nomatch');
    expect(state.title).toContain('zzzznothing');
    expect(state.message).toMatch(/spelling/i);
  });

  it('defers to the error branch so one failure is not reported twice', () => {
    expect(getSearchEmptyState({term: 'x', error: 'Boom'})).toBeNull();
  });
});
