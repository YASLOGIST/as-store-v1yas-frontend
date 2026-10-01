import {getSitemap} from '@shopify/hydrogen';

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, params, context: {storefront}}) {
  const response = await getSitemap({
    storefront,
    request,
    params,
    // This storefront does not define locale-prefixed routes. Emitting Shopify's
    // example EN-US/EN-CA/FR-CA paths here created crawlable URLs that only 404ed.
    // Publish canonical, reachable routes until locale path routing is introduced.
    getLink: buildSitemapLink,
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}

/**
 * Canonical URL builder kept independent of locale metadata because this route
 * tree currently has no locale path segment.
 * @param {{type: string; baseUrl: string; handle: string}}
 */
export function buildSitemapLink({type, baseUrl, handle}) {
  return `${baseUrl}/${type}/${encodeURIComponent(handle)}`;
}

/** @typedef {import('./+types/sitemap.$type.$page[.xml]').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
