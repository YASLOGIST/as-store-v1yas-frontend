import {redirect, useLoaderData, useLocation, Link} from 'react-router';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ProductItem} from '~/components/ProductItem';
import {buildRouteMeta, collectionJsonLd} from '~/lib/seo';
import {StructuredData} from '~/components/StructuredData';
import {CollectionControls} from '~/components/CollectionControls';
import {
  buildFilterGroups,
  clearFiltersSearch,
  describeResults,
  getActiveChips,
  getActiveFilters,
  getSortOption,
} from '~/lib/collectionFilters';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data, matches}) => {
  const origin = matches?.[0]?.data?.origin;
  return buildRouteMeta({
    title: `${data?.collection.title ?? 'Collection'}`,
    description:
      data?.collection.description?.slice(0, 155) ||
      'Browse the collection at YAS Store.',
    type: 'website',
    canonical:
      origin && data?.collection.handle
        ? `${origin}/collections/${data.collection.handle}`
        : undefined,
    image: data?.collection.image?.url,
  });
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, params, request}) {
  const {handle} = params;
  const {storefront} = context;
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  if (!handle) {
    throw redirect('/collections');
  }

  const sort = getSortOption(url.searchParams);
  const {filters, tokens} = getActiveFilters(url.searchParams);

  const [{collection}] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      cache: storefront.CacheShort(),
      variables: {
        handle,
        filters,
        sortKey: sort.sortKey,
        reverse: sort.reverse,
        ...paginationVariables,
      },
      // Add other queries here, so that they are loaded in parallel
    }),
  ]);

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: collection});

  const groups = buildFilterGroups(collection.products.filters, tokens);

  return {
    collection,
    filterGroups: groups,
    activeChips: getActiveChips(groups),
    sortId: sort.id,
    summary: describeResults({
      count: collection.products.nodes.length,
      hasNextPage: collection.products.pageInfo.hasNextPage,
      filtered: filters.length > 0,
    }),
    canonicalUrl: `${url.origin}/collections/${collection.handle}`,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData() {
  return {};
}

export default function Collection() {
  /** @type {LoaderReturnData} */
  const {activeChips, canonicalUrl, collection, filterGroups, sortId, summary} =
    useLoaderData();
  const location = useLocation();
  const isFiltered = activeChips.length > 0;
  const isEmpty = collection.products.nodes.length === 0;

  return (
    <div className="collection">
      <StructuredData
        data={collectionJsonLd(collection, {url: canonicalUrl})}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link prefetch="intent" to="/">
          Home
        </Link>
        <span className="crumb-sep" aria-hidden="true">
          /
        </span>
        <Link prefetch="intent" to="/collections">
          Collections
        </Link>
        <span className="crumb-sep" aria-hidden="true">
          /
        </span>
        <span aria-current="page">{collection.title}</span>
      </nav>
      <div className="collection-header">
        <span className="eyebrow">Collection</span>
        <h1>{collection.title}</h1>
        {collection.description ? (
          <p className="collection-description">{collection.description}</p>
        ) : null}
      </div>

      <CollectionControls
        chips={activeChips}
        groups={filterGroups}
        sortId={sortId}
        summary={summary}
      />

      {isEmpty ? (
        <div className="collection-empty">
          <h2>
            {isFiltered ? 'Nothing matches that mix' : 'Nothing here yet'}
          </h2>
          <p>
            {isFiltered
              ? 'Try removing a filter — price and availability narrow results fastest.'
              : 'This collection has no published products right now.'}
          </p>
          {isFiltered ? (
            <Link
              className="btn btn-primary"
              preventScrollReset
              to={`${location.pathname}${clearFiltersSearch(location.search)}`}
            >
              Clear filters
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/collections">
              Browse all collections
            </Link>
          )}
        </div>
      ) : (
        <PaginatedResourceSection
          connection={collection.products}
          resourcesClassName="products-grid"
        >
          {({node: product, index}) => (
            <ProductItem
              key={product.id}
              product={product}
              index={index}
              loading={index < 4 ? 'eager' : 'lazy'}
            />
          )}
        </PaginatedResourceSection>
      )}

      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
    }
    variants(first: 1) {
      nodes {
        id
        availableForSale
      }
    }
  }
`;

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        url
        altText
        width
        height
      }
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor,
        filters: $filters,
        sortKey: $sortKey,
        reverse: $reverse
      ) {
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
`;

/** @typedef {import('./+types/collections.$handle').Route} Route */
/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
