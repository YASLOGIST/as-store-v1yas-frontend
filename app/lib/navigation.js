/**
 * Convert a Shopify menu URL into a safe internal or external navigation target.
 * Merchant-managed menu data is content, not trusted code: executable protocols
 * are dropped and same-store absolute links are normalized to relative paths.
 * @param {{url?: string | null; primaryDomainUrl?: string | null; publicStoreDomain?: string | null}} input
 * @returns {{href: string; external: boolean} | null}
 */
export function resolveMenuUrl({url, primaryDomainUrl, publicStoreDomain}) {
  if (typeof url !== 'string' || !url.trim()) return null;
  const value = url.trim();

  if (value.startsWith('/') && !value.startsWith('//')) {
    return {href: value, external: false};
  }

  if (value.startsWith('#')) return {href: value, external: false};

  if (/^(mailto:|tel:)/i.test(value)) {
    return {href: value, external: true};
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return null;

  const internalHosts = new Set(
    [hostFrom(primaryDomainUrl), hostFrom(publicStoreDomain)].filter(Boolean),
  );

  if (internalHosts.has(parsed.hostname)) {
    return {
      href: `${parsed.pathname}${parsed.search}${parsed.hash}`,
      external: false,
    };
  }

  return {href: parsed.toString(), external: true};
}

function hostFrom(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname;
  } catch {
    return null;
  }
}
