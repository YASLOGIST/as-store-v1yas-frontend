const PRODUCT_VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/\d+$/;
const CART_LINE_GID = /^gid:\/\/shopify\/CartLine\/[^\s]{1,512}$/;
const SHOPIFY_GID = /^gid:\/\/shopify\/[a-zA-Z]+\/[^\s]{1,512}$/;
const STOREFRONT_API_VERSION = /^20\d{2}-(01|04|07|10)$/;

export const MAX_CART_LINES = 25;
export const MAX_LINE_QUANTITY = 99;
export const MAX_SEARCH_LENGTH = 100;

/**
 * Normalize untrusted search input before sending it to Storefront API.
 * @param {unknown} value
 */
export function normalizeSearchTerm(value) {
  if (typeof value !== 'string') return '';

  return Array.from(
    replaceControlCharacters(value.normalize('NFKC'), ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
    .slice(0, MAX_SEARCH_LENGTH)
    .join('');
}

/** @param {unknown} value */
export function clampSearchLimit(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 5;
  return Math.min(10, Math.max(1, parsed));
}

/**
 * Parse Shopify cart permalinks without allowing malformed IDs, NaN quantities,
 * oversized carts, or resource-amplifying quantities.
 * @param {string} value
 * @returns {{merchandiseId: string; quantity: number}[]}
 */
export function parseCartPermalink(value) {
  const segments = value.split(',');
  if (!segments.length || segments.length > MAX_CART_LINES) {
    throw new Response('Invalid cart link', {status: 400});
  }

  return segments.map((segment) => {
    const match = /^(\d{1,32}):(\d{1,3})$/.exec(segment);
    if (!match) throw new Response('Invalid cart link', {status: 400});

    const quantity = Number(match[2]);
    if (quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new Response('Invalid cart quantity', {status: 400});
    }

    return {
      merchandiseId: `gid://shopify/ProductVariant/${match[1]}`,
      quantity,
    };
  });
}

/**
 * Validate the shape and bounded size of cart mutation inputs.
 * @param {string} action
 * @param {Record<string, any>} inputs
 */
export function assertCartInput(action, inputs = {}) {
  if (action.endsWith('LinesAdd')) {
    assertLines(inputs.lines, {allowZero: false, requireMerchandise: true});
  } else if (action.endsWith('LinesUpdate')) {
    assertLines(inputs.lines, {allowZero: true, requireLineId: true});
  } else if (action.endsWith('LinesRemove')) {
    assertStringArray(inputs.lineIds, CART_LINE_GID, MAX_CART_LINES);
  } else if (action.endsWith('DiscountCodesUpdate')) {
    assertCode(inputs.discountCode, true);
    assertCodeArray(inputs.discountCodes, 10);
  } else if (action.endsWith('GiftCardCodesAdd')) {
    assertCode(inputs.giftCardCode, true);
  } else if (action.endsWith('GiftCardCodesRemove')) {
    assertStringArray(inputs.giftCardCodes, SHOPIFY_GID, 10);
  }
}

/** @param {unknown} value */
export function sanitizeCommerceCode(value) {
  if (typeof value !== 'string') return '';
  return replaceControlCharacters(value, '').trim().slice(0, 255);
}

/** @param {unknown} value */
export function isStorefrontApiVersion(value) {
  return typeof value === 'string' && STOREFRONT_API_VERSION.test(value);
}

/**
 * Parse a hostname-only environment value and reject paths, credentials, ports,
 * and protocol confusion before it is interpolated into an upstream URL.
 * @param {unknown} value
 */
export function parseShopDomain(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Checkout domain is not configured');
  }

  const input = value.trim();
  if (input.includes('://') || /[\/@?#]/.test(input)) {
    throw new Error('Checkout domain must be a hostname');
  }

  const url = new URL(`https://${input}`);
  if (url.port || url.hostname !== input.toLowerCase()) {
    throw new Error('Checkout domain must be a hostname without a port');
  }

  return url.hostname;
}

function replaceControlCharacters(value, replacement) {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 ? replacement : character;
  }).join('');
}

function assertLines(
  lines,
  {allowZero, requireMerchandise = false, requireLineId = false},
) {
  if (!Array.isArray(lines) || !lines.length || lines.length > MAX_CART_LINES) {
    throw new Response('Invalid cart lines', {status: 400});
  }

  for (const line of lines) {
    if (!line || typeof line !== 'object') {
      throw new Response('Invalid cart line', {status: 400});
    }
    const minimum = allowZero ? 0 : 1;
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < minimum ||
      line.quantity > MAX_LINE_QUANTITY
    ) {
      throw new Response('Invalid cart quantity', {status: 400});
    }
    if (requireMerchandise && !PRODUCT_VARIANT_GID.test(line.merchandiseId)) {
      throw new Response('Invalid merchandise id', {status: 400});
    }
    if (requireLineId && !CART_LINE_GID.test(line.id)) {
      throw new Response('Invalid cart line id', {status: 400});
    }
  }
}

function assertCodeArray(value, max) {
  if (value == null) return;
  if (!Array.isArray(value) || value.length > max) {
    throw new Response('Invalid commerce codes', {status: 400});
  }
  value.forEach((code) => assertCode(code));
}

function assertCode(value, optional = false) {
  if (optional && (value == null || value === '')) return;
  if (sanitizeCommerceCode(value) !== value || !value) {
    throw new Response('Invalid commerce code', {status: 400});
  }
}

function assertStringArray(value, pattern, max) {
  if (!Array.isArray(value) || !value.length || value.length > max) {
    throw new Response('Invalid cart identifiers', {status: 400});
  }
  if (
    value.some((entry) => typeof entry !== 'string' || !pattern.test(entry))
  ) {
    throw new Response('Invalid cart identifier', {status: 400});
  }
}
