import {Await, useLoaderData, Link} from 'react-router';
import {Fragment, Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import {ProductItem} from '~/components/ProductItem';
import {ProductGridSkeleton} from '~/components/Skeleton';
import {HeroSignalField} from '~/components/HeroSignalField';
import {
  IconArrowRight,
  IconBolt,
  IconGlobe,
  IconRocket,
  IconShield,
} from '~/components/Icons';
import {buildRouteMeta} from '~/lib/seo';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({matches}) => {
  const origin = matches?.[0]?.data?.origin;
  return buildRouteMeta({
    title: 'YAS Store',
    description:
      'High-tech gear, engineered for tomorrow. Discover the catalog — built on Shopify Hydrogen.',
    canonical: origin ? `${origin}/` : undefined,
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
async function loadCriticalData({context}) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY, {
      cache: context.storefront.CacheShort(),
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {
    featuredCollection: collections.nodes[0],
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData({context}) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY, {
      cache: context.storefront.CacheShort(),
    })
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
  };
}

export default function Homepage() {
  /** @type {LoaderReturnData} */
  const data = useLoaderData();
  return (
    <div className="home">
      <Hero collection={data.featuredCollection} />
      <TechMarquee />
      <FeaturedCollection collection={data.featuredCollection} />
      <RecommendedProducts products={data.recommendedProducts} />
      <ValueProps />
    </div>
  );
}

/**
 * Editorial hero that uses merchant media when available and retains a
 * zero-payload visual fallback for stores without collection artwork.
 * @param {{collection?: FeaturedCollectionFragment}}
 */
function Hero({collection}) {
  const collectionUrl = collection?.handle
    ? `/collections/${collection.handle}`
    : '/collections';

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="badge hero-badge">
            <span className="pulse" aria-hidden="true" />
            New systems for everyday life
          </span>
          <h1 id="hero-title">
            Objects for the <span className="gradient-text">next idea.</span>
          </h1>
          <p className="hero-sub">
            Considered tools for builders, makers and curious minds. Useful by
            design, selected to last, and ready to ship.
          </p>
          <div className="hero-actions">
            <Link
              className="btn btn-primary"
              to={collectionUrl}
              prefetch="intent"
              viewTransition
              data-magnetic
            >
              Shop the latest edit
              <IconArrowRight />
            </Link>
            <Link
              className="hero-text-link"
              to="/collections"
              prefetch="intent"
            >
              Browse all collections
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <dl className="hero-stats" aria-label="Store experience">
            <div className="hero-stat">
              <dt>Checkout</dt>
              <dd>Secure</dd>
            </div>
            <div className="hero-stat">
              <dt>Delivery</dt>
              <dd>Edge-fast</dd>
            </div>
            <div className="hero-stat">
              <dt>Discovery</dt>
              <dd>Predictive</dd>
            </div>
          </dl>
        </div>
        <HeroVisual collection={collection} collectionUrl={collectionUrl} />
      </div>
    </section>
  );
}

/**
 * Product-led hero scene. Merchant imagery remains the focal point while the
 * composited CSS telemetry layer gives pointer depth without another payload.
 * @param {{collection?: FeaturedCollectionFragment; collectionUrl: string}}
 */
function HeroVisual({collection, collectionUrl}) {
  return (
    <Link
      className="hero-visual"
      to={collectionUrl}
      prefetch="intent"
      aria-label={`Explore ${collection?.title ?? 'the latest collection'}`}
    >
      <span className="hero-visual-frame">
        {collection?.image ? (
          <Image
            alt=""
            data={collection.image}
            fetchpriority="high"
            loading="eager"
            sizes="(min-width: 70em) 600px, (min-width: 48em) 48vw, 92vw"
          />
        ) : (
          <span className="hero-visual-fallback">
            <span className="hero-core-mark">Y</span>
          </span>
        )}
        <HeroSignalField strength={collection?.image ? 0.72 : 1} />
        <span className="hero-visual-shade" />
        <span className="hero-visual-label">
          <span>Featured / 01</span>
          <strong>{collection?.title ?? 'The latest edit'}</strong>
        </span>
      </span>
      <span className="hero-orbit hero-orbit-one">
        <span className="hero-orbit-node" />
      </span>
      <span className="hero-orbit hero-orbit-two">
        <span className="hero-orbit-node" />
      </span>
      <span className="hero-coordinate hero-coordinate-top">YAS—01</span>
      <span className="hero-coordinate hero-coordinate-bottom">
        SELECTED / 2026
      </span>
    </Link>
  );
}

/** Scrolling tech-values strip between hero and catalog. */
function TechMarquee() {
  const items = [
    'Secure Shopify checkout',
    'Edge-rendered pages',
    'Predictive discovery',
    'Optimized media',
    'Accessible interactions',
    'Private sessions',
  ];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <Fragment key={copy}>
            {items.map((item) => (
              <span key={item} className="marquee-item">
                {item}
              </span>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   collection: FeaturedCollectionFragment;
 * }}
 */
function FeaturedCollection({collection}) {
  if (!collection) return null;
  const image = collection?.image;
  return (
    <section className="home-section" aria-labelledby="featured-title">
      <div className="section-head">
        <div>
          <span className="eyebrow">Featured drop</span>
          <h2 id="featured-title">Fresh off the line</h2>
        </div>
      </div>
      <Link
        className="featured-collection reveal"
        to={`/collections/${collection.handle}`}
      >
        <div className="featured-collection-image">
          {image ? (
            <Image
              alt={image.altText || collection.title}
              data={image}
              loading="lazy"
              sizes="(min-width: 82.5em) 1320px, 100vw"
            />
          ) : (
            <span className="featured-collection-fallback" aria-hidden="true">
              <span>YAS / EDIT</span>
            </span>
          )}
        </div>
        <div className="featured-collection-caption">
          <div>
            <span className="badge hero-badge">Collection</span>
            <h3>{collection.title}</h3>
            <p>Explore the complete collection</p>
          </div>
          <span className="btn btn-primary">
            Shop now
            <IconArrowRight />
          </span>
        </div>
      </Link>
    </section>
  );
}

/**
 * @param {{
 *   products: Promise<RecommendedProductsQuery | null>;
 * }}
 */
function RecommendedProducts({products}) {
  return (
    <section className="home-section" aria-labelledby="recommended-title">
      <div className="section-head">
        <div>
          <span className="eyebrow">The current edit</span>
          <h2 id="recommended-title">Selected for you</h2>
        </div>
        <Link className="btn btn-ghost section-cta" to="/collections">
          View all
          <IconArrowRight />
        </Link>
      </div>
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <Await resolve={products}>
          {(response) => {
            const products = response?.products?.nodes ?? [];
            if (!products.length) {
              return (
                <div className="catalog-empty" role="status">
                  <span className="eyebrow">Catalog update</span>
                  <h3>New objects are being added.</h3>
                  <p>
                    Browse every collection while the latest edit is prepared.
                  </p>
                  <Link className="btn btn-ghost" to="/collections">
                    Explore collections <IconArrowRight />
                  </Link>
                </div>
              );
            }
            return (
              <div className="recommended-products-grid">
                {products.map((product, index) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    index={index}
                    loading="lazy"
                  />
                ))}
              </div>
            );
          }}
        </Await>
      </Suspense>
    </section>
  );
}

function ValueProps() {
  const props = [
    {
      icon: <IconRocket />,
      title: 'Fast, everywhere',
      body: 'Streamed edge rendering and optimized media keep every interaction responsive.',
    },
    {
      icon: <IconShield />,
      title: 'Secure by default',
      body: 'Shopify checkout, hardened cookies, origin checks and strict CSP headers.',
    },
    {
      icon: <IconBolt />,
      title: 'Instant search',
      body: 'Predictive results as you type — products, collections and articles.',
    },
    {
      icon: <IconGlobe />,
      title: 'Accessible by design',
      body: 'Keyboard-first navigation, clear focus states and reduced-motion support.',
    },
  ];
  return (
    <section
      className="home-section home-section-values"
      aria-labelledby="values-title"
    >
      <div className="section-head">
        <div>
          <span className="eyebrow">Store standard</span>
          <h2 id="values-title">The details are infrastructure.</h2>
        </div>
      </div>
      <div className="value-props">
        {props.map((valueProp) => (
          <div key={valueProp.title} className="value-prop reveal">
            <span className="value-prop-icon">{valueProp.icon}</span>
            <h4>{valueProp.title}</h4>
            <p>{valueProp.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
`;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
    variants(first: 1) {
      nodes {
        id
        availableForSale
      }
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
`;

/** @typedef {import('./+types/_index').Route} Route */
/** @typedef {import('storefrontapi.generated').FeaturedCollectionFragment} FeaturedCollectionFragment */
/** @typedef {import('storefrontapi.generated').RecommendedProductsQuery} RecommendedProductsQuery */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
