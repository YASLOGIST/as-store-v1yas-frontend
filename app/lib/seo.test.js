import {describe, expect, it} from 'vitest';
import {
  breadcrumbJsonLd,
  buildRouteMeta,
  collectionJsonLd,
  productJsonLd,
  websiteJsonLd,
} from './seo';

describe('buildRouteMeta', () => {
  it('builds a full SEO meta array with defaults', () => {
    const meta = buildRouteMeta({title: 'Home'});

    const title = meta.find((m) => 'title' in m);
    expect(title?.title).toBe('Home · YAS Store');

    expect(meta).toContainEqual({
      name: 'description',
      content: expect.any(String),
    });
    expect(meta).toContainEqual({name: 'twitter:card', content: 'summary'});
    expect(meta).toContainEqual({property: 'og:type', content: 'website'});
  });

  it('uses the bare brand title when title matches the brand', () => {
    const meta = buildRouteMeta({title: 'YAS Store'});
    expect(meta.find((m) => 'title' in m)?.title).toBe('YAS Store');
  });

  it('falls back to the brand title when no title is given', () => {
    const meta = buildRouteMeta({});
    expect(meta.find((m) => 'title' in m)?.title).toBe('YAS Store');
  });

  it('includes canonical, image and large-image card when provided', () => {
    const meta = buildRouteMeta({
      title: 'Widget',
      canonical: 'https://example.com/products/widget',
      image: 'https://cdn.example.com/widget.jpg',
    });

    expect(meta).toContainEqual({
      rel: 'canonical',
      href: 'https://example.com/products/widget',
    });
    expect(meta).toContainEqual({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    expect(meta).toContainEqual({
      property: 'og:image',
      content: 'https://cdn.example.com/widget.jpg',
    });
  });

  it('can opt out of indexing', () => {
    const meta = buildRouteMeta({noIndex: true});
    expect(meta).toContainEqual({
      name: 'robots',
      content: 'noindex, nofollow',
    });
  });
});

describe('productJsonLd', () => {
  it('maps a Storefront product to schema.org Product with an offer', () => {
    const ld = productJsonLd(
      /** @type {any} */ ({
        title: 'Neural Headset',
        description: 'A headset.',
        vendor: 'YAS Labs',
        featuredImage: {url: 'https://cdn.example.com/h.jpg'},
        selectedOrFirstAvailableVariant: {
          sku: 'NH-1',
          availableForSale: true,
          price: {amount: '199.00', currencyCode: 'USD'},
        },
      }),
      {url: 'https://example.com/products/neural-headset'},
    );

    expect(ld['@type']).toBe('Product');
    expect(ld.name).toBe('Neural Headset');
    expect(ld.brand.name).toBe('YAS Labs');
    expect(ld.offers.price).toBe('199.00');
    expect(ld.offers.priceCurrency).toBe('USD');
    expect(ld.offers.availability).toBe('https://schema.org/InStock');
    expect(ld.offers.url).toBe('https://example.com/products/neural-headset');
  });

  it('marks unavailable products as OutOfStock', () => {
    const ld = productJsonLd(
      /** @type {any} */ ({
        title: 'Sold Out Thing',
        variants: {nodes: [{availableForSale: false}]},
        priceRange: {minVariantPrice: {amount: '5.00', currencyCode: 'USD'}},
      }),
    );

    expect(ld.offers.availability).toBe('https://schema.org/OutOfStock');
  });
});

describe('collectionJsonLd', () => {
  it('builds a CollectionPage with an ItemList', () => {
    const ld = collectionJsonLd(
      /** @type {any} */ ({
        title: 'Gear',
        description: 'All the gear.',
        products: {
          nodes: [
            {handle: 'a', title: 'A'},
            {handle: 'b', title: 'B'},
          ],
        },
      }),
    );

    expect(ld['@type']).toBe('CollectionPage');
    expect(ld.mainEntity.itemListElement).toHaveLength(2);
    expect(ld.mainEntity.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      url: '/products/a',
      name: 'A',
    });
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers crumbs from 1', () => {
    const ld = breadcrumbJsonLd([
      {name: 'Home', url: '/'},
      {name: 'Products', url: '/products'},
      {name: 'Widget'},
    ]);

    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement.map((c) => c.position)).toEqual([1, 2, 3]);
    expect(ld.itemListElement[2]).not.toHaveProperty('item');
  });
});

describe('websiteJsonLd', () => {
  it('includes a SearchAction', () => {
    const ld = websiteJsonLd({shopName: 'YAS Store', url: 'https://x.com'});
    expect(ld['@type']).toBe('WebSite');
    expect(ld.potentialAction.target).toBe(
      'https://x.com/search?q={search_term_string}',
    );
  });
});
