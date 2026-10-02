import {Await, useLoaderData, useRouteLoaderData, Link} from 'react-router';
import {Suspense} from 'react';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  useNonce,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {ShareButton} from '~/components/ShareButton';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {breadcrumbJsonLd, buildRouteMeta, productJsonLd} from '~/lib/seo';
import {StructuredData} from '~/components/StructuredData';
import {RecentlyViewed} from '~/components/RecentlyViewed';
import {ProductModelViewer} from '~/components/ProductModelViewer';
import {ProductItem} from '~/components/ProductItem';
import {ProductGridSkeleton} from '~/components/Skeleton';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data, matches}) => {
  const product = data?.product;
  const origin = matches?.[0]?.data?.origin ?? '';
  return buildRouteMeta({
    title: product?.seo?.title || product?.title,
    description: product?.seo?.description || product?.description,
    canonical:
      origin && product?.handle
        ? `${origin}/products/${product.handle}`
        : undefined,
    image: product?.featuredImage?.url,
    type: 'product',
  });
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  const criticalData = await loadCriticalData(args);
  const deferredData = loadDeferredData(args, criticalData.product.id);
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

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      cache: storefront.CacheShort(),
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
    canonicalUrl: `${new URL(request.url).origin}/products/${product.handle}`,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData({context}, productId) {
  const recommendations = context.storefront
    .query(PRODUCT_RECOMMENDATIONS_QUERY, {
      cache: context.storefront.CacheShort(),
      variables: {productId},
    })
    .then((result) => result.productRecommendations ?? [])
    .catch(() => []);
  return {recommendations};
}

export default function Product() {
  /** @type {LoaderReturnData} */
  const {product, canonicalUrl, recommendations} = useLoaderData();
  const rootData = useRouteLoaderData('root');

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant?.selectedOptions ?? []);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml, vendor} = product;
  const nonce = useNonce();

  return (
    <div className="product" data-testid="product-page">
      <StructuredData
        nonce={nonce}
        data={productJsonLd(
          {...product, selectedOrFirstAvailableVariant: selectedVariant},
          {url: canonicalUrl},
        )}
      />
      <StructuredData
        nonce={nonce}
        data={breadcrumbJsonLd([
          {name: 'Home', url: '/'},
          {name: 'Products', url: '/collections'},
          {name: product.title},
        ])}
      />
      <div className="product-media-stack">
        <ProductImage image={selectedVariant?.image} />
        <ProductModelViewer
          enabled={Boolean(rootData?.features?.modelViewer)}
          image={selectedVariant?.image}
          model={product.media?.nodes?.find(
            (media) => media.__typename === 'Model3d',
          )}
        />
      </div>
      <div className="product-main">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link prefetch="intent" to="/">
            Home
          </Link>
          <span className="crumb-sep" aria-hidden="true">
            /
          </span>
          <Link prefetch="intent" to="/collections">
            Products
          </Link>
          <span className="crumb-sep" aria-hidden="true">
            /
          </span>
          <span aria-current="page">{title}</span>
        </nav>
        {vendor ? <span className="eyebrow">{vendor}</span> : null}
        <h1>{title}</h1>
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        {selectedVariant?.quantityAvailable > 0 &&
        selectedVariant.quantityAvailable <= 5 ? (
          <p className="low-stock" role="status">
            Only {selectedVariant.quantityAvailable} left in stock
          </p>
        ) : null}
        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />
        <ShareButton title={title} url={canonicalUrl} />
        <ul className="product-assurances" aria-label="Purchase assurances">
          <li>Secure Shopify checkout</li>
          <li>Encrypted session</li>
          <li>Live inventory</li>
        </ul>
        <div className="product-description">
          <h5>Description</h5>
          <div
            className="article-content"
            dangerouslySetInnerHTML={{__html: descriptionHtml}}
          />
        </div>
      </div>
      <section
        className="product-cross-sell"
        aria-labelledby="cross-sell-heading"
      >
        <span className="eyebrow">Pairs well</span>
        <h2 id="cross-sell-heading">You may also like</h2>
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <Await resolve={recommendations}>
            {(items) =>
              items.length ? (
                <div className="recommended-products-grid">
                  {items.slice(0, 4).map((item, index) => (
                    <ProductItem key={item.id} product={item} index={index} />
                  ))}
                </div>
              ) : (
                <p className="empty-state">
                  No related products are available yet.
                </p>
              )
            }
          </Await>
        </Suspense>
      </section>
      {rootData?.features?.recentlyViewed !== false ? (
        <RecentlyViewed product={product} />
      ) : null}
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    quantityAvailable
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
`;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    featuredImage {
      url
      altText
    }
    media(first: 10) {
      nodes {
        __typename
        alt
        previewImage {
          url
        }
        ... on Model3d {
          sources {
            url
            mimeType
            format
            filesize
          }
        }
      }
    }
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const PRODUCT_RECOMMENDATIONS_QUERY = `#graphql
  query ProductRecommendations(
    $country: CountryCode
    $language: LanguageCode
    $productId: ID!
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId) {
      id
      title
      handle
      featuredImage {
        id
        url
        altText
        width
        height
      }
      priceRange {
        minVariantPrice { amount currencyCode }
      }
      compareAtPriceRange {
        minVariantPrice { amount currencyCode }
      }
      variants(first: 1) {
        nodes { id availableForSale }
      }
    }
  }
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
`;

/** @typedef {import('./+types/products.$handle').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
