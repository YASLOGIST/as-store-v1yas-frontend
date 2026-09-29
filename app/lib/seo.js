/**
 * SEO toolkit — structured meta tags and JSON-LD (schema.org) helpers.
 *
 * Usage in a route `meta` function:
 *   export const meta = ({data}) => buildRouteMeta({title, description, ...});
 *
 * Usage inside a component:
 *   <StructuredData data={productJsonLd(product)} />
 */

const DEFAULT_TITLE = 'YAS Store';
const TITLE_SEPARATOR = '·';

/**
 * Build a full route meta array with SEO/OpenGraph/Twitter defaults.
 * Values that are omitted fall back to sane defaults.
 * @param {RouteMetaInput} input
 * @returns {import('react-router').RouteMatchMeta[]}
 */
export function buildRouteMeta({
  title,
  description = 'High-tech gear, engineered for tomorrow. Built on Shopify Hydrogen.',
  canonical,
  image,
  type = 'website',
  noIndex = false,
}) {
  const fullTitle = title
    ? title === DEFAULT_TITLE
      ? title
      : `${title} ${TITLE_SEPARATOR} ${DEFAULT_TITLE}`
    : DEFAULT_TITLE;

  const meta = [
    {title: fullTitle},
    {name: 'description', content: description},

    // OpenGraph
    {property: 'og:title', content: fullTitle},
    {property: 'og:description', content: description},
    {property: 'og:type', content: type},
    {property: 'og:site_name', content: DEFAULT_TITLE},
    ...(image ? [{property: 'og:image', content: image}] : []),
    ...(canonical ? [{property: 'og:url', content: canonical}] : []),

    // Twitter
    {name: 'twitter:card', content: image ? 'summary_large_image' : 'summary'},
    {name: 'twitter:title', content: fullTitle},
    {name: 'twitter:description', content: description},
    ...(image ? [{name: 'twitter:image', content: image}] : []),

    ...(canonical ? [{rel: 'canonical', href: canonical}] : []),
    ...(noIndex ? [{name: 'robots', content: 'noindex, nofollow'}] : []),
  ];

  return meta;
}

/**
 * Absolute URL helper for canonical/og:url tags based on the request.
 * @param {Request | {url: string}} request
 * @param {string} [pathnameOverride]
 * @returns {string}
 */
export function requestCanonicalUrl(request, pathnameOverride) {
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  if (pathnameOverride) url.pathname = pathnameOverride;
  return url.toString();
}

/**
 * BreadcrumbList JSON-LD from a list of {name, url} crumbs.
 * @param {{name: string, url: string}[]} crumbs
 */
export function breadcrumbJsonLd(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.url ? {item: crumb.url} : {}),
    })),
  };
}

/**
 * Product JSON-LD.
 * @param {ProductLdInput} product
 * @param {{url?: string, currency?: string}} [options]
 */
export function productJsonLd(product, options = {}) {
  const variant =
    product.selectedOrFirstAvailableVariant ??
    product.variants?.nodes?.[0] ??
    null;

  const price = variant?.price ?? product.priceRange?.minVariantPrice ?? null;
  const availability = variant?.availableForSale
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description
      ? String(product.description).slice(0, 5000)
      : undefined,
    sku: variant?.sku ?? undefined,
    barcode: variant?.barcode ?? undefined,
    image: product.featuredImage?.url ? [product.featuredImage.url] : undefined,
    brand: {'@type': 'Brand', name: product.vendor || 'YAS Store'},
    url: options.url,
    offers: price
      ? {
          '@type': 'Offer',
          url: options.url,
          priceCurrency: price.currencyCode ?? options.currency ?? 'USD',
          price: price.amount,
          availability,
          itemCondition: 'https://schema.org/NewCondition',
        }
      : undefined,
  };
}

/**
 * CollectionPage + ItemList JSON-LD.
 * @param {CollectionLdInput} collection
 * @param {{url?: string}} [options]
 */
export function collectionJsonLd(collection, options = {}) {
  const baseUrl = options.url ? new URL(options.url).origin : '';
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.title,
    description: collection.description ?? undefined,
    url: options.url,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: (collection.products?.nodes ?? []).map(
        (product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${baseUrl}/products/${product.handle}`,
          name: product.title,
        }),
      ),
    },
  };
}

/**
 * BlogPosting JSON-LD.
 * @param {ArticleLdInput} article
 */
export function articleJsonLd(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description ?? undefined,
    excerpt: article.excerpt ?? undefined,
    image: article.image?.url ? [article.image.url] : undefined,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {'@type': 'Person', name: article.author?.name ?? 'YAS Store'},
  };
}

/**
 * WebSite + Organization JSON-LD for the root layout.
 * @param {{shopName: string, url?: string}} [options]
 */
export function websiteJsonLd({shopName = DEFAULT_TITLE, url} = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: shopName,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url ?? ''}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * @typedef {Object} RouteMetaInput
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [canonical]
 * @property {string} [image]
 * @property {'website' | 'product' | 'article'} [type]
 * @property {boolean} [noIndex]
 *
 * @typedef {Object} ProductLdInput
 * @property {string} title
 * @property {string} [description]
 * @property {string} [vendor]
 * @property {{url?: string}} [featuredImage]
 * @property {{nodes?: Array<{sku?: string, barcode?: string, availableForSale?: boolean, price?: MoneyLike}>}} [variants]
 * @property {{sku?: string, barcode?: string, availableForSale?: boolean, price?: MoneyLike, image?: {url?: string}}} [selectedOrFirstAvailableVariant]
 * @property {{minVariantPrice?: MoneyLike}} [priceRange]
 *
 * @typedef {Object} CollectionLdInput
 * @property {string} title
 * @property {string} [description]
 * @property {{nodes?: Array<{handle: string, title: string}>}} [products]
 *
 * @typedef {Object} ArticleLdInput
 * @property {string} title
 * @property {string} [description]
 * @property {string} [excerpt]
 * @property {{url?: string}} [image]
 * @property {string} [publishedAt]
 * @property {{name?: string}} [author]
 *
 * @typedef {{amount: string, currencyCode?: string}} MoneyLike
 */
