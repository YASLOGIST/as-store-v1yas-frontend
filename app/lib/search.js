/**
 * Return context-aware copy for an empty search state.
 * Keeping this decision pure makes the initial, no-match, and error states
 * independently testable instead of presenting every state as “no results”.
 * @param {{term?: string, error?: string}} state
 */
export function getSearchEmptyMessage({term = '', error} = {}) {
  if (error) return null;
  return term
    ? `No results for “${term}”. Try a broader or different search.`
    : 'Enter a product, collection, page or article to start searching.';
}

/**
 * Describe the empty search state so the UI can render a quiet hint before the
 * first query and a real recovery path after a query that matched nothing.
 * @param {{term?: string, error?: string}} state
 */
export function getSearchEmptyState({term = '', error} = {}) {
  if (error) return null;
  if (!term) {
    return {kind: 'initial', message: getSearchEmptyMessage()};
  }

  return {
    kind: 'nomatch',
    title: `No results for \u201c${term}\u201d`,
    message:
      'Check the spelling, try fewer words, or search by brand or product type.',
  };
}

/** Returns the empty state of a regular search response. */
export function getEmptyRegularSearchResult() {
  return {
    total: 0,
    items: {
      articles: {nodes: []},
      pages: {nodes: []},
      products: {
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      },
    },
  };
}

/**
 * Returns the empty state of a predictive search result to reset the search state.
 */
export function getEmptyPredictiveSearchResult() {
  return {
    total: 0,
    items: {
      articles: [],
      collections: [],
      products: [],
      pages: [],
      queries: [],
    },
  };
}

/**
 * A utility function that appends tracking parameters to a URL. Tracking parameters are
 * used internally by Shopify to enhance search results and admin dashboards.
 * @example
 * ```ts
 * const baseUrl = 'www.example.com';
 * const trackingParams = 'utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront';
 * const params = { foo: 'bar' };
 * const term = 'search term';
 * const url = urlWithTrackingParams({ baseUrl, trackingParams, params, term });
 * console.log(url);
 * // Output: 'https://www.example.com?foo=bar&q=search%20term&utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront'
 * ```
 * @param {UrlWithTrackingParams}
 */
export function urlWithTrackingParams({
  baseUrl,
  trackingParams,
  params: extraParams = {},
  term,
}) {
  const url = new URL(baseUrl, 'https://storefront.invalid');

  Object.entries(extraParams).forEach(([name, value]) => {
    if (typeof value === 'string') url.searchParams.set(name, value);
  });
  url.searchParams.set('q', term ?? '');

  if (trackingParams) {
    new URLSearchParams(trackingParams).forEach((value, name) => {
      url.searchParams.set(name, value);
    });
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

/** @param {string} term */
export function getSearchUrl(term) {
  const params = new URLSearchParams();
  const normalized = String(term ?? '').trim();
  if (normalized) params.set('q', normalized);
  const search = params.toString();
  return `/search${search ? `?${search}` : ''}`;
}

/**
 * @typedef {{
 *   type: Type;
 *   term: string;
 *   error?: string;
 *   result: {total: number; items: Items};
 * }} ResultWithItems
 * @template {'predictive' | 'regular'} Type
 * @template Items
 */
/**
 * @typedef {ResultWithItems<
 *   'regular',
 *   RegularSearchQuery
 * >} RegularSearchReturn
 */
/**
 * @typedef {ResultWithItems<
 *   'predictive',
 *   NonNullable<PredictiveSearchQuery['predictiveSearch']>
 * >} PredictiveSearchReturn
 */
/**
 * @typedef {Object} UrlWithTrackingParams
 * @property {string} baseUrl The base URL to which the tracking parameters will be appended.
 * @property {string|null} [trackingParams] The trackingParams returned by the Storefront API.
 * @property {Record<string,string>} [params] Any additional query parameters to be appended to the URL.
 * @property {string} term The search term to be appended to the URL.
 */

/** @typedef {import('storefrontapi.generated').PredictiveSearchQuery} PredictiveSearchQuery */
/** @typedef {import('storefrontapi.generated').RegularSearchQuery} RegularSearchQuery */
