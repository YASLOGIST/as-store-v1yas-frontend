/**
 * Collection merchandising: sort + faceted filter state.
 *
 * All state lives in the URL so a filtered grid is shareable, cacheable and
 * works without client JavaScript. These helpers are pure so the route stays
 * thin and the behavior is testable without a Storefront API round trip.
 */

/** Query param that carries one serialized Storefront `ProductFilter` input. */
export const FILTER_PARAM = 'filter';
/** Query param that carries the sort option id. */
export const SORT_PARAM = 'sort';
/** Pagination cursors must be dropped whenever the result set changes. */
const PAGINATION_PARAMS = ['cursor', 'direction', 'page'];

/**
 * Sort options exposed in the UI, mapped to Storefront collection sort keys.
 * `MANUAL` mirrors the merchandiser's own ordering in Shopify admin.
 */
export const SORT_OPTIONS = [
  {id: 'featured', label: 'Featured', sortKey: 'MANUAL', reverse: false},
  {
    id: 'best-selling',
    label: 'Best selling',
    sortKey: 'BEST_SELLING',
    reverse: false,
  },
  {id: 'newest', label: 'Newest', sortKey: 'CREATED', reverse: true},
  {
    id: 'price-asc',
    label: 'Price: low to high',
    sortKey: 'PRICE',
    reverse: false,
  },
  {
    id: 'price-desc',
    label: 'Price: high to low',
    sortKey: 'PRICE',
    reverse: true,
  },
  {id: 'title', label: 'Alphabetical', sortKey: 'TITLE', reverse: false},
];

const DEFAULT_SORT = SORT_OPTIONS[0];

/**
 * Catalog-wide sorting uses `ProductSortKeys`, which has no manual order.
 */
export const CATALOG_SORT_OPTIONS = [
  {id: 'featured', label: 'Relevance', sortKey: 'RELEVANCE', reverse: false},
  {
    id: 'best-selling',
    label: 'Best selling',
    sortKey: 'BEST_SELLING',
    reverse: false,
  },
  {id: 'newest', label: 'Newest', sortKey: 'CREATED_AT', reverse: true},
  {
    id: 'price-asc',
    label: 'Price: low to high',
    sortKey: 'PRICE',
    reverse: false,
  },
  {
    id: 'price-desc',
    label: 'Price: high to low',
    sortKey: 'PRICE',
    reverse: true,
  },
  {id: 'title', label: 'Alphabetical', sortKey: 'TITLE', reverse: false},
];

/**
 * @param {URLSearchParams | string | null | undefined} searchParams
 */
export function getCatalogSortOption(searchParams) {
  const id = toParams(searchParams).get(SORT_PARAM);
  return (
    CATALOG_SORT_OPTIONS.find((option) => option.id === id) ||
    CATALOG_SORT_OPTIONS[0]
  );
}

/**
 * @param {URLSearchParams | string | null | undefined} input
 * @returns {URLSearchParams}
 */
function toParams(input) {
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  return new URLSearchParams(input || '');
}

/**
 * Resolve the active sort option, falling back to the merchandised order.
 * @param {URLSearchParams | string | null | undefined} searchParams
 */
export function getSortOption(searchParams) {
  const id = toParams(searchParams).get(SORT_PARAM);
  return SORT_OPTIONS.find((option) => option.id === id) || DEFAULT_SORT;
}

/**
 * Parse serialized `ProductFilter` inputs from the URL.
 * Unparseable entries are ignored rather than failing the whole request —
 * a hand-edited URL should degrade to an unfiltered grid, not a 500.
 * @param {URLSearchParams | string | null | undefined} searchParams
 * @returns {{filters: Array<Record<string, unknown>>, tokens: string[]}}
 */
export function getActiveFilters(searchParams) {
  const filters = [];
  const tokens = [];
  for (const raw of toParams(searchParams).getAll(FILTER_PARAM)) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        filters.push(parsed);
        tokens.push(stableToken(parsed));
      }
    } catch {
      // Ignore malformed filter tokens.
    }
  }
  return {filters, tokens};
}

/**
 * Deterministic string form of a filter input so toggling is order-insensitive
 * (`{available:true}` and the API's own `{"available":true}` must match).
 * @param {unknown} value
 * @returns {string}
 */
export function stableToken(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableToken).join(',')}]`;
  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableToken(item)}`);
  return `{${entries.join(',')}}`;
}

/**
 * Normalize an API-provided filter input (string or object) to a token.
 * @param {string | Record<string, unknown>} input
 */
export function tokenFromInput(input) {
  try {
    return stableToken(typeof input === 'string' ? JSON.parse(input) : input);
  } catch {
    return typeof input === 'string' ? input : stableToken(input);
  }
}

/**
 * Build the search string for toggling a single filter value on or off.
 * Pagination cursors are cleared so the user lands on page one of the new set.
 * @param {URLSearchParams | string | null | undefined} searchParams
 * @param {string | Record<string, unknown>} input
 */
export function toggleFilterSearch(searchParams, input) {
  const params = toParams(searchParams);
  const target = tokenFromInput(input);
  const existing = params.getAll(FILTER_PARAM);
  params.delete(FILTER_PARAM);

  let removed = false;
  for (const raw of existing) {
    if (tokenFromInput(raw) === target) {
      removed = true;
      continue;
    }
    params.append(FILTER_PARAM, raw);
  }
  if (!removed) params.append(FILTER_PARAM, target);

  return finalize(params);
}

/**
 * Search string with every facet removed but the sort preserved.
 * @param {URLSearchParams | string | null | undefined} searchParams
 */
export function clearFiltersSearch(searchParams) {
  const params = toParams(searchParams);
  params.delete(FILTER_PARAM);
  return finalize(params);
}

/**
 * Search string for a sort change, keeping facets intact.
 * @param {URLSearchParams | string | null | undefined} searchParams
 * @param {string} sortId
 */
export function setSortSearch(searchParams, sortId) {
  const params = toParams(searchParams);
  if (!sortId || sortId === DEFAULT_SORT.id) params.delete(SORT_PARAM);
  else params.set(SORT_PARAM, sortId);
  return finalize(params);
}

/**
 * @param {URLSearchParams} params
 * @returns {string} A `?a=b` search string, or `''` when empty.
 */
function finalize(params) {
  for (const key of PAGINATION_PARAMS) params.delete(key);
  const search = params.toString();
  return search ? `?${search}` : '';
}

const FILTER_GROUP_LABELS = {
  'filter.v.availability': 'Availability',
  'filter.v.price': 'Price',
  'filter.p.product_type': 'Product type',
  'filter.p.vendor': 'Brand',
};

/**
 * Shape Storefront filter groups for rendering: drop empty facets, hide
 * single-option groups that cannot change the result, and label them in the
 * store's own language rather than the raw API id.
 * @param {Array<{id: string, label: string, type: string, values: Array<{id: string, label: string, count: number, input: string}>}> | null | undefined} groups
 * @param {string[]} activeTokens
 */
export function buildFilterGroups(groups, activeTokens = []) {
  const active = new Set(activeTokens);
  return (groups || [])
    .map((group) => {
      const values = (group.values || [])
        .filter(
          (value) => value.count > 0 || active.has(tokenFromInput(value.input)),
        )
        .map((value) => ({
          ...value,
          active: active.has(tokenFromInput(value.input)),
        }));
      return {
        ...group,
        label: FILTER_GROUP_LABELS[group.id] || group.label,
        values,
        activeCount: values.filter((value) => value.active).length,
      };
    })
    .filter((group) => group.values.length > 1 || group.activeCount > 0);
}

/**
 * Human labels for the active-filter chips, resolved from the API groups so
 * the chip reads "In stock", not a JSON blob.
 * @param {ReturnType<typeof buildFilterGroups>} groups
 */
export function getActiveChips(groups) {
  const chips = [];
  for (const group of groups) {
    for (const value of group.values) {
      if (value.active) {
        chips.push({
          id: value.id,
          input: value.input,
          label: value.label,
          group: group.label,
        });
      }
    }
  }
  return chips;
}

/**
 * Sentence describing the current result set. Used as the live region text
 * after a filter change, so screen readers hear what happened.
 * @param {{count: number, hasNextPage?: boolean, filtered?: boolean}} state
 */
export function describeResults({
  count,
  hasNextPage = false,
  filtered = false,
  scope = 'in this collection',
  emptyMessage = 'This collection is empty.',
}) {
  if (count === 0) {
    return filtered ? 'No products match these filters.' : emptyMessage;
  }
  const noun = count === 1 ? 'product' : 'products';
  const prefix = hasNextPage ? `${count}+` : `${count}`;
  const verb = count === 1 ? 'matches' : 'match';
  return filtered ? `${prefix} ${noun} ${verb}` : `${prefix} ${noun} ${scope}`;
}
