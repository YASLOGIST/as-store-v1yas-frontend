import {describe, expect, it} from 'vitest';
import {
  buildFilterGroups,
  clearFiltersSearch,
  describeResults,
  getActiveChips,
  getActiveFilters,
  getSortOption,
  setSortSearch,
  toggleFilterSearch,
} from './collectionFilters';

const AVAILABILITY = {
  id: 'filter.v.availability',
  label: 'Availability',
  type: 'LIST',
  values: [
    {
      id: 'in-stock',
      label: 'In stock',
      count: 5,
      input: '{"available":true}',
    },
    {
      id: 'out-of-stock',
      label: 'Out of stock',
      count: 1,
      input: '{"available":false}',
    },
  ],
};

describe('getSortOption', () => {
  it('falls back to the merchandised order', () => {
    expect(getSortOption('').id).toBe('featured');
    expect(getSortOption('sort=nonsense').sortKey).toBe('MANUAL');
  });

  it('maps ui ids to storefront sort keys', () => {
    expect(getSortOption('sort=price-desc')).toMatchObject({
      sortKey: 'PRICE',
      reverse: true,
    });
  });
});

describe('getActiveFilters', () => {
  it('parses filter inputs and ignores malformed tokens', () => {
    const {filters, tokens} = getActiveFilters(
      'filter={"available":true}&filter=not-json&filter=[1,2]',
    );
    expect(filters).toEqual([{available: true}]);
    expect(tokens).toEqual(['{"available":true}']);
  });
});

describe('toggleFilterSearch', () => {
  it('adds a filter and drops pagination cursors', () => {
    expect(
      toggleFilterSearch('cursor=abc&direction=next', {available: true}),
    ).toBe('?filter=%7B%22available%22%3Atrue%7D');
  });

  it('removes an already applied filter regardless of key order', () => {
    const search =
      'filter=' + encodeURIComponent('{"price":{"max":100,"min":0}}');
    expect(toggleFilterSearch(search, '{"price":{"min":0,"max":100}}')).toBe(
      '',
    );
  });

  it('keeps unrelated filters and the sort', () => {
    const result = toggleFilterSearch(
      'sort=newest&filter=' + encodeURIComponent('{"available":true}'),
      {productVendor: 'Halcyon'},
    );
    expect(result).toContain('sort=newest');
    expect(result.match(/filter=/g)).toHaveLength(2);
  });
});

describe('setSortSearch / clearFiltersSearch', () => {
  it('omits the default sort from the url', () => {
    expect(setSortSearch('sort=newest', 'featured')).toBe('');
  });

  it('keeps facets when sorting', () => {
    expect(setSortSearch('filter=%7B%22available%22%3Atrue%7D', 'title')).toBe(
      '?filter=%7B%22available%22%3Atrue%7D&sort=title',
    );
  });

  it('keeps the sort when clearing facets', () => {
    expect(
      clearFiltersSearch('sort=title&filter=%7B%22available%22%3Atrue%7D'),
    ).toBe('?sort=title');
  });
});

describe('buildFilterGroups', () => {
  it('marks active values and relabels known api groups', () => {
    const [group] = buildFilterGroups([AVAILABILITY], ['{"available":true}']);
    expect(group.label).toBe('Availability');
    expect(group.activeCount).toBe(1);
    expect(group.values[0].active).toBe(true);
  });

  it('drops groups that cannot change the result', () => {
    const single = {
      ...AVAILABILITY,
      values: [AVAILABILITY.values[0], {...AVAILABILITY.values[1], count: 0}],
    };
    expect(buildFilterGroups([single], [])).toEqual([]);
  });

  it('keeps a zero-count value when it is currently applied', () => {
    const groups = buildFilterGroups(
      [
        {
          ...AVAILABILITY,
          values: [
            AVAILABILITY.values[0],
            {...AVAILABILITY.values[1], count: 0},
          ],
        },
      ],
      ['{"available":false}'],
    );
    expect(groups[0].values.map((value) => value.label)).toEqual([
      'In stock',
      'Out of stock',
    ]);
  });
});

describe('getActiveChips', () => {
  it('returns human labels for applied facets', () => {
    const groups = buildFilterGroups([AVAILABILITY], ['{"available":true}']);
    expect(getActiveChips(groups)).toEqual([
      {
        id: 'in-stock',
        input: '{"available":true}',
        label: 'In stock',
        group: 'Availability',
      },
    ]);
  });
});

describe('describeResults', () => {
  it('distinguishes empty collections from empty filter results', () => {
    expect(describeResults({count: 0})).toBe('This collection is empty.');
    expect(describeResults({count: 0, filtered: true})).toBe(
      'No products match these filters.',
    );
  });

  it('signals more pages and pluralizes', () => {
    expect(describeResults({count: 1})).toBe('1 product in this collection');
    expect(describeResults({count: 1, filtered: true})).toBe(
      '1 product matches',
    );
    expect(
      describeResults({count: 12, hasNextPage: true, filtered: true}),
    ).toBe('12+ products match');
  });
});
