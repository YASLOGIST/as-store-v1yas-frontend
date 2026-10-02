/**
 * Deterministic Storefront API stand-in for authorized local/browser testing.
 *
 * It is installed only when `E2E_MOCK_MODE=1`, and it answers the same shapes
 * the real API returns so routes, filters and pagination can be exercised
 * without network access or store credentials.
 */

const CURRENCY = 'USD';

/** @param {number} amount */
const money = (amount) => ({
  amount: amount.toFixed(2),
  currencyCode: CURRENCY,
});

/** The catalog fixture. The first entry is the canonical e2e product. */
const CATALOG = [
  {
    handle: 'volt-prototype',
    title: 'VOLT Prototype',
    vendor: 'YAS Labs',
    productType: 'Prototype',
    price: 129,
    compareAt: 149,
    available: true,
    quantityAvailable: 3,
    description:
      'A deterministic product fixture for authorized browser testing.',
  },
  {
    handle: 'arc-field-charger',
    title: 'ARC Field Charger',
    vendor: 'YAS Labs',
    productType: 'Power',
    price: 89,
    compareAt: null,
    available: true,
    quantityAvailable: 24,
    description: '100W GaN charger with pass-through and a braided cable.',
  },
  {
    handle: 'node-mesh-router',
    title: 'NODE Mesh Router',
    vendor: 'Halcyon',
    productType: 'Network',
    price: 219,
    compareAt: 259,
    available: true,
    quantityAvailable: 11,
    description: 'Tri-band mesh node with a passively cooled aluminium shell.',
  },
  {
    handle: 'drift-bench-light',
    title: 'DRIFT Bench Light',
    vendor: 'Halcyon',
    productType: 'Workspace',
    price: 64,
    compareAt: null,
    available: true,
    quantityAvailable: 40,
    description: 'CRI 97 task light with a stepless dimmer and clamp mount.',
  },
  {
    handle: 'lattice-tool-roll',
    title: 'LATTICE Tool Roll',
    vendor: 'Field Kit',
    productType: 'Carry',
    price: 48,
    compareAt: 60,
    available: false,
    quantityAvailable: 0,
    description: 'Waxed canvas roll sized for drivers, bits and a multimeter.',
  },
  {
    handle: 'signal-usb-analyzer',
    title: 'SIGNAL USB Analyzer',
    vendor: 'Field Kit',
    productType: 'Instrument',
    price: 312,
    compareAt: null,
    available: true,
    quantityAvailable: 6,
    description: 'Inline power and protocol analyzer with a colour readout.',
  },
];

/**
 * @param {string} origin
 * @param {{title: string}} item
 */
function image(origin, item) {
  return {
    id: `gid://shopify/MediaImage/${item.handle}`,
    url: `${origin}/og-image.jpg`,
    altText: `${item.title} product image`,
    width: 1200,
    height: 630,
  };
}

function variant(origin, item, index) {
  return {
    id: `gid://shopify/ProductVariant/${1001 + index}`,
    title: 'Default Title',
    availableForSale: item.available,
    quantityAvailable: item.quantityAvailable,
    sku: `${item.handle.toUpperCase()}-01`,
    price: money(item.price),
    compareAtPrice: item.compareAt ? money(item.compareAt) : null,
    unitPrice: null,
    image: image(origin, item),
    selectedOptions: [{name: 'Title', value: 'Default Title'}],
    product: {title: item.title, handle: item.handle},
  };
}

function product(origin, item, index = 0) {
  const selected = variant(origin, item, index);
  return {
    __typename: 'Product',
    id: `gid://shopify/Product/${1000 + index}`,
    title: item.title,
    vendor: item.vendor,
    handle: item.handle,
    productType: item.productType,
    description: item.description,
    descriptionHtml: `<p>${item.description}</p>`,
    featuredImage: image(origin, item),
    media: {nodes: []},
    encodedVariantExistence: 'v1_0:0',
    encodedVariantAvailability: 'v1_0:0',
    options: [
      {
        name: 'Title',
        optionValues: [
          {
            name: 'Default Title',
            firstSelectableVariant: selected,
            swatch: null,
          },
        ],
      },
    ],
    selectedOrFirstAvailableVariant: selected,
    adjacentVariants: [],
    variants: {nodes: [selected]},
    priceRange: {
      minVariantPrice: money(item.price),
      maxVariantPrice: money(item.price),
    },
    compareAtPriceRange: {
      minVariantPrice: money(item.compareAt ?? item.price),
    },
    seo: {title: item.title, description: item.description},
    trackingParameters: null,
    publishedAt: '2026-01-01T00:00:00Z',
  };
}

const COLLECTIONS = [
  {
    id: 'gid://shopify/Collection/1',
    handle: 'volt-essentials',
    title: 'VOLT Essentials',
    description: 'The short list: power, light and connection for a workbench.',
  },
  {
    id: 'gid://shopify/Collection/2',
    handle: 'field-kit',
    title: 'Field Kit',
    description: 'Gear that travels — carry, measure, repair.',
  },
];

function emptyCart() {
  return {
    id: 'gid://shopify/Cart/mock',
    checkoutUrl: '/cart',
    totalQuantity: 0,
    lines: {nodes: []},
    cost: {subtotalAmount: money(129), totalAmount: money(129)},
    discountCodes: [],
    appliedGiftCards: [],
  };
}

function cartWithLines(origin, lines = []) {
  const selected = variant(origin, CATALOG[0], 0);
  const quantity = lines.reduce(
    (sum, line) => sum + Number(line.quantity || 1),
    0,
  );
  return {
    ...emptyCart(),
    totalQuantity: quantity,
    lines: {
      nodes: quantity
        ? [
            {
              id: 'gid://shopify/CartLine/mock',
              quantity,
              attributes: [],
              merchandise: selected,
              cost: {
                totalAmount: money(129 * quantity),
                amountPerQuantity: money(129),
              },
            },
          ]
        : [],
    },
  };
}

/** Mirror the Storefront `filters`/`sortKey` semantics against the fixture. */
function applyCatalogQuery(items, variables = {}) {
  const filters = variables.filters || [];
  let result = items.filter((item) =>
    filters.every((filter) => {
      if (typeof filter.available === 'boolean') {
        return item.available === filter.available;
      }
      if (filter.productVendor) return item.vendor === filter.productVendor;
      if (filter.productType) return item.productType === filter.productType;
      if (filter.price) {
        const {min = 0, max = Number.POSITIVE_INFINITY} = filter.price;
        return item.price >= min && item.price <= max;
      }
      return true;
    }),
  );

  const sortKey = variables.sortKey || 'MANUAL';
  if (sortKey === 'PRICE') {
    result = [...result].sort((a, b) => a.price - b.price);
  } else if (sortKey === 'TITLE') {
    result = [...result].sort((a, b) => a.title.localeCompare(b.title));
  }
  if (variables.reverse) result = [...result].reverse();
  return result;
}

/** Build the `filters` facet list from the unfiltered catalog. */
function facetsFor(items) {
  const countBy = (predicate) => items.filter(predicate).length;
  const byKey = (key) => [...new Set(items.map((item) => item[key]))].sort();

  return [
    {
      id: 'filter.v.availability',
      label: 'Availability',
      type: 'LIST',
      values: [
        {
          id: 'filter.v.availability.1',
          label: 'In stock',
          count: countBy((item) => item.available),
          input: JSON.stringify({available: true}),
        },
        {
          id: 'filter.v.availability.0',
          label: 'Out of stock',
          count: countBy((item) => !item.available),
          input: JSON.stringify({available: false}),
        },
      ],
    },
    {
      id: 'filter.v.price',
      label: 'Price',
      type: 'LIST',
      values: [
        {
          id: 'filter.v.price.under-100',
          label: 'Under $100',
          count: countBy((item) => item.price < 100),
          input: JSON.stringify({price: {min: 0, max: 100}}),
        },
        {
          id: 'filter.v.price.100-250',
          label: '$100 – $250',
          count: countBy((item) => item.price >= 100 && item.price <= 250),
          input: JSON.stringify({price: {min: 100, max: 250}}),
        },
        {
          id: 'filter.v.price.250-plus',
          label: '$250 and up',
          count: countBy((item) => item.price > 250),
          input: JSON.stringify({price: {min: 250, max: 100000}}),
        },
      ],
    },
    {
      id: 'filter.p.product_type',
      label: 'Product type',
      type: 'LIST',
      values: byKey('productType').map((value) => ({
        id: `filter.p.product_type.${value}`,
        label: value,
        count: countBy((item) => item.productType === value),
        input: JSON.stringify({productType: value}),
      })),
    },
    {
      id: 'filter.p.vendor',
      label: 'Brand',
      type: 'LIST',
      values: byKey('vendor').map((value) => ({
        id: `filter.p.vendor.${value}`,
        label: value,
        count: countBy((item) => item.vendor === value),
        input: JSON.stringify({productVendor: value}),
      })),
    },
  ];
}

const PAGE_INFO = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
};

/** Install deterministic API behavior only when the explicit local E2E flag is on. */
export function applyMockStorefront(context, request) {
  const origin = new URL(request.url).origin;
  const nodes = CATALOG.map((item, index) => product(origin, item, index));
  const fixture = nodes[0];
  const collectionImage = (collection) => ({
    id: `gid://shopify/MediaImage/${collection.handle}`,
    url: `${origin}/og-image.jpg`,
    altText: `${collection.title} collection image`,
    width: 1200,
    height: 630,
  });

  context.storefront.query = async (query, options = {}) => {
    const variables = options.variables || {};

    if (query.includes('query Header')) {
      return {
        shop: {
          id: 'gid://shopify/Shop/1',
          name: 'YAS Mock Store',
          description: 'Local deterministic browser fixture',
          primaryDomain: {url: origin},
          brand: {logo: null},
        },
        menu: null,
      };
    }
    if (query.includes('query Footer')) return {menu: null};
    if (query.includes('query FeaturedCollection')) {
      return {
        collections: {
          nodes: [{...COLLECTIONS[0], image: collectionImage(COLLECTIONS[0])}],
        },
      };
    }
    if (query.includes('query RecommendedProducts')) {
      return {products: {nodes}};
    }
    if (query.includes('query ProductRecommendations')) {
      return {productRecommendations: nodes.slice(1, 5)};
    }
    if (query.includes('query StoreCollections')) {
      return {
        collections: {
          nodes: COLLECTIONS.map((collection) => ({
            ...collection,
            image: collectionImage(collection),
          })),
          pageInfo: PAGE_INFO,
        },
      };
    }
    if (query.includes('query Collection(')) {
      const base =
        variables.handle === 'field-kit'
          ? CATALOG.filter((item) => item.vendor === 'Field Kit')
          : CATALOG;
      const matched = applyCatalogQuery(base, variables);
      const collection =
        COLLECTIONS.find((item) => item.handle === variables.handle) ||
        COLLECTIONS[0];
      return {
        collection: {
          ...collection,
          handle: variables.handle || collection.handle,
          image: collectionImage(collection),
          products: {
            filters: facetsFor(base),
            nodes: matched.map((item) =>
              product(origin, item, CATALOG.indexOf(item)),
            ),
            pageInfo: PAGE_INFO,
          },
        },
      };
    }
    if (query.includes('query Catalog')) {
      return {
        products: {
          nodes: applyCatalogQuery(CATALOG, variables).map((item) =>
            product(origin, item, CATALOG.indexOf(item)),
          ),
          pageInfo: PAGE_INFO,
        },
      };
    }
    if (query.includes('query Product')) {
      const match =
        nodes.find((node) => node.handle === variables.handle) || fixture;
      return {product: match};
    }
    if (query.includes('query RegularSearch')) {
      return {
        products: {nodes, pageInfo: PAGE_INFO},
        pages: {nodes: []},
        articles: {nodes: []},
      };
    }
    if (query.includes('query PredictiveSearch')) {
      return {
        predictiveSearch: {
          products: nodes.slice(0, 4),
          collections: [],
          pages: [],
          articles: [],
          queries: [],
        },
      };
    }
    return {};
  };

  const mutation = (cart) => {
    context.session.set('e2eCart', cart);
    return {cart, errors: [], warnings: []};
  };
  Object.assign(context.cart, {
    get: async () => context.session.get('e2eCart') || emptyCart(),
    addLines: async (lines) => mutation(cartWithLines(origin, lines)),
    updateLines: async (lines) => mutation(cartWithLines(origin, lines)),
    removeLines: async () => mutation(emptyCart()),
    updateDiscountCodes: async () => mutation(emptyCart()),
    addGiftCardCodes: async () => mutation(emptyCart()),
    removeGiftCardCodes: async () => mutation(emptyCart()),
    updateBuyerIdentity: async () => mutation(emptyCart()),
    setCartId: () => new Headers(),
  });

  return context;
}
