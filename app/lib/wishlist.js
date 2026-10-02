/**
 * Shared wishlist store.
 *
 * The list lives in `localStorage`, but a grid can hold dozens of cards and
 * each one used to parse storage in its own effect and then set its own state —
 * N reads, N parses and N post-hydration rerenders for one tiny array. This
 * module reads once, keeps the parsed value in memory, and notifies subscribers
 * on change, so the cost is constant regardless of how many cards are mounted.
 */
import {useSyncExternalStore} from 'react';

const STORAGE_KEY = 'yas:wishlist:v1';

/** @type {Set<string> | null} */
let cache = null;
const listeners = new Set();

function read() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cache = new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  const first = listeners.size === 0;
  listeners.add(listener);
  if (first && typeof window !== 'undefined') {
    // One storage read for the whole page, one notification to every card.
    const hydrated = cache !== null;
    read();
    if (!hydrated) queueMicrotask(emit);
    // Keep tabs in sync without polling.
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

function onStorage(event) {
  if (event.key && event.key !== STORAGE_KEY) return;
  cache = null;
  read();
  emit();
}

/** @param {string} id */
export function toggleWishlist(id) {
  const items = read();
  const next = !items.has(id);
  if (next) items.add(id);
  else items.delete(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...items]));
  } catch {
    // Storage is optional; the in-memory state still drives the UI.
  }
  emit();
  return next;
}

/**
 * Subscribe a component to one wishlist entry.
 * Server renders and the first client pass both return `false`, so the markup
 * matches and hydration stays quiet.
 * @param {string} id
 */
export function useIsWishlisted(id) {
  return useSyncExternalStore(
    subscribe,
    () => (cache ? cache.has(id) : false),
    () => false,
  );
}

/** Test seam: drop the in-memory copy. */
export function resetWishlistCache() {
  cache = null;
}
