/**
 * Shared behavior for the crawler-facing resource routes (robots, sitemaps).
 *
 * These routes have a different failure contract from pages: an HTML 500 is the
 * worst answer we can give a crawler, because Google treats repeated 5xx on
 * robots.txt as "stop fetching this host" and a broken sitemap as a persistent
 * index error. Degrade to a still-valid document, or to an explicitly temporary
 * 503 the crawler is expected to retry.
 */

/** Cache lifetime for a complete, trusted crawler document. */
export const CRAWLER_CACHE_SECONDS = 60 * 60 * 24;

/** Short lifetime for a degraded document so the full version returns soon. */
export const CRAWLER_DEGRADED_CACHE_SECONDS = 60 * 5;

/**
 * Plain-text 503 with a retry hint, used when sitemap data cannot be built.
 * @param {unknown} error
 * @param {{resource: string}} options
 */
export function crawlerUnavailable(error, {resource}) {
  console.error(`[crawler:${resource}] upstream failure`, error);

  return new Response(`${resource} temporarily unavailable\n`, {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': String(CRAWLER_DEGRADED_CACHE_SECONDS),
    },
  });
}

/**
 * A thrown `Response` (404, redirect) is an intentional routing decision and
 * must pass through untouched; only real faults become a 503.
 * @param {unknown} error
 */
export function isThrownResponse(error) {
  return error instanceof Response;
}
