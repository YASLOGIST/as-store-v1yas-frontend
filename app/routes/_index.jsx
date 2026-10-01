import {Await, useLoaderData, Link} from 'react-router';
import {Fragment, Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import {ProductItem} from '~/components/ProductItem';
import {ProductGridSkeleton} from '~/components/Skeleton';
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
      <Hero />
      <TechMarquee />
      <FeaturedCollection collection={data.featuredCollection} />
      <RecommendedProducts products={data.recommendedProducts} />
      <ValueProps />
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <HeroVisual />
      <div className="hero-inner">
        <span className="badge hero-badge">
          <span className="pulse" aria-hidden="true" />
          Next-generation storefront
        </span>
        <h1>
          Gear from the <span className="gradient-text">future</span>,
          <br />
          shipped today.
        </h1>
        <p className="hero-sub">
          A curated catalog of high-tech essentials for builders, makers and
          explorers — rendered at the speed of light on Shopify Hydrogen.
        </p>
        <div className="hero-actions">
          <Link
            className="btn btn-primary"
            to="/collections"
            prefetch="intent"
            viewTransition
            data-magnetic
          >
            Shop the catalog
            <IconArrowRight />
          </Link>
          <Link className="btn btn-ghost" to="/search" prefetch="intent">
            <IconBolt />
            Explore everything
          </Link>
        </div>
        <dl className="hero-stats">
          <div className="hero-stat">
            <dd>Edge</dd>
            <dt>Global delivery</dt>
          </div>
          <div className="hero-stat">
            <dd>100%</dd>
            <dt>Server rendered</dt>
          </div>
          <div className="hero-stat">
            <dd>Live</dd>
            <dt>Streamed pages</dt>
          </div>
        </dl>
      </div>
    </section>
  );
}

/** Decorative CSS scene: composited transforms only, zero image/3D payload. */
function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <span className="hero-orbit hero-orbit-one">
        <span className="hero-orbit-node" />
      </span>
      <span className="hero-orbit hero-orbit-two">
        <span className="hero-orbit-node" />
      </span>
      <span className="hero-core">
        <span className="hero-core-mark">Y</span>
      </span>
      <span className="hero-scan" />
    </div>
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
    <section className="home-section">
      <div className="section-head">
        <div>
          <span className="eyebrow">Featured drop</span>
          <h2>Fresh off the line</h2>
        </div>
      </div>
      <Link
        className="featured-collection reveal"
        to={`/collections/${collection.handle}`}
      >
        {image && (
          <div className="featured-collection-image">
            <Image
              data={image}
              fetchpriority="high"
              loading="eager"
              sizes="100vw"
            />
          </div>
        )}
        <div className="featured-collection-caption">
          <div>
            <span className="badge hero-badge">Collection</span>
            <h1>{collection.title}</h1>
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
    <section className="home-section">
      <div className="section-head">
        <div>
          <span className="eyebrow">Top picks</span>
          <h2>Recommended products</h2>
        </div>
        <Link className="btn btn-ghost section-cta" to="/collections">
          View all
          <IconArrowRight />
        </Link>
      </div>
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response
                ? response.products.nodes.map((product, index) => (
                    <ProductItem
                      key={product.id}
                      product={product}
                      index={index}
                      loading="lazy"
                    />
                  ))
                : null}
            </div>
          )}
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
    <section className="home-section">
      <div className="section-head">
        <div>
          <span className="eyebrow">Why us</span>
          <h2>Built like the future</h2>
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
