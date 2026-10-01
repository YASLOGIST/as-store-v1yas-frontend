const money = {amount: '129.00', currencyCode: 'USD'};

function image(origin) {
  return {
    id: 'gid://shopify/MediaImage/mock',
    url: `${origin}/og-image.jpg`,
    altText: 'VOLT prototype product',
    width: 1200,
    height: 630,
  };
}

function variant(origin) {
  return {
    id: 'gid://shopify/ProductVariant/1001',
    title: 'Default Title',
    availableForSale: true,
    quantityAvailable: 3,
    sku: 'VOLT-001',
    price: money,
    compareAtPrice: {amount: '149.00', currencyCode: 'USD'},
    unitPrice: null,
    image: image(origin),
    selectedOptions: [{name: 'Title', value: 'Default Title'}],
    product: {title: 'VOLT Prototype', handle: 'volt-prototype'},
  };
}

function product(origin) {
  const selected = variant(origin);
  return {
    __typename: 'Product',
    id: 'gid://shopify/Product/1000',
    title: 'VOLT Prototype',
    vendor: 'YAS Labs',
    handle: 'volt-prototype',
    description:
      'A deterministic product fixture for authorized browser testing.',
    descriptionHtml:
      '<p>A deterministic product fixture for authorized browser testing.</p>',
    featuredImage: image(origin),
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
    priceRange: {minVariantPrice: money},
    compareAtPriceRange: {
      minVariantPrice: {amount: '149.00', currencyCode: 'USD'},
    },
    seo: {title: 'VOLT Prototype', description: 'Mock storefront product'},
    trackingParameters: null,
    publishedAt: '2026-01-01T00:00:00Z',
  };
}

function emptyCart() {
  return {
    id: 'gid://shopify/Cart/mock',
    checkoutUrl: '/cart',
    totalQuantity: 0,
    lines: {nodes: []},
    cost: {subtotalAmount: money, totalAmount: money},
    discountCodes: [],
    appliedGiftCards: [],
  };
}

function cartWithLines(origin, lines = []) {
  const selected = variant(origin);
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
              cost: {totalAmount: money, amountPerQuantity: money},
            },
          ]
        : [],
    },
  };
}

/** Install deterministic API behavior only when the explicit local E2E flag is on. */
export function applyMockStorefront(context, request) {
  const origin = new URL(request.url).origin;
  const fixture = product(origin);
  context.storefront.query = async (query) => {
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
          nodes: [
            {
              id: 'gid://shopify/Collection/1',
              title: 'VOLT Essentials',
              handle: 'volt-essentials',
              image: image(origin),
            },
          ],
        },
      };
    }
    if (query.includes('query RecommendedProducts')) {
      return {products: {nodes: [fixture]}};
    }
    if (query.includes('query ProductRecommendations')) {
      return {productRecommendations: [fixture]};
    }
    if (query.includes('query Product')) return {product: fixture};
    if (query.includes('query RegularSearch')) {
      return {
        products: {
          nodes: [fixture],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        },
        pages: {nodes: []},
        articles: {nodes: []},
      };
    }
    if (query.includes('query PredictiveSearch')) {
      return {
        predictiveSearch: {
          products: [fixture],
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
