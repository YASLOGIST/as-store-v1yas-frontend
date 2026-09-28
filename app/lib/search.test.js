import {describe, expect, it} from 'vitest';
import {getEmptyPredictiveSearchResult} from './search';

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
