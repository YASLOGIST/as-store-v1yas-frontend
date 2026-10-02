import {beforeEach, describe, expect, it, vi} from 'vitest';
import {resetWishlistCache, toggleWishlist} from './wishlist';

describe('wishlist store', () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    });
    resetWishlistCache();
  });

  it('toggles an id on and off and persists it once', () => {
    expect(toggleWishlist('gid://a')).toBe(true);
    expect(JSON.parse(localStorage.getItem('yas:wishlist:v1'))).toEqual([
      'gid://a',
    ]);
    expect(toggleWishlist('gid://a')).toBe(false);
    expect(JSON.parse(localStorage.getItem('yas:wishlist:v1'))).toEqual([]);
  });

  it('survives corrupt stored values', () => {
    localStorage.setItem('yas:wishlist:v1', '{not json');
    resetWishlistCache();
    expect(toggleWishlist('gid://b')).toBe(true);
  });

  it('keeps unrelated entries when toggling', () => {
    toggleWishlist('gid://a');
    toggleWishlist('gid://b');
    toggleWishlist('gid://a');
    expect(JSON.parse(localStorage.getItem('yas:wishlist:v1'))).toEqual([
      'gid://b',
    ]);
  });
});
