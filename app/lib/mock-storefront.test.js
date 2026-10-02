import {describe, expect, it} from 'vitest';
import {matchCatalog} from './mock-storefront';

const ITEMS = [
  {
    title: 'ARC Field Charger',
    vendor: 'YAS',
    productType: 'Power',
    description: 'Bench supply for field work.',
  },
  {
    title: 'Mesh Node Trio',
    vendor: 'Northbound',
    productType: 'Networking',
    description: 'Three floors of coverage.',
  },
];

describe('matchCatalog', () => {
  it('matches on any indexed field, case-insensitively', () => {
    expect(matchCatalog(ITEMS, 'CHARGER').map((i) => i.title)).toEqual([
      'ARC Field Charger',
    ]);
    expect(matchCatalog(ITEMS, 'northbound')).toHaveLength(1);
    expect(matchCatalog(ITEMS, 'coverage')).toHaveLength(1);
  });

  // A fixture that answers every query with the whole catalog hides the
  // no-result state instead of exercising it; that is the bug this guards.
  it('returns nothing for a term the catalog does not contain', () => {
    expect(matchCatalog(ITEMS, 'zzzznothing')).toEqual([]);
  });

  it('treats a blank or missing term as no match rather than everything', () => {
    expect(matchCatalog(ITEMS, '   ')).toEqual([]);
    expect(matchCatalog(ITEMS, undefined)).toEqual([]);
  });
});
