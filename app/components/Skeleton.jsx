/**
 * Suspense fallback primitives — shimmering placeholders that mirror
 * the layout of the content being streamed in.
 */

/**
 * @param {{count?: number}} props
 */
export function ProductGridSkeleton({count = 4}) {
  return (
    <div className="recommended-products-grid" aria-hidden="true">
      {Array.from({length: count}).map((_, i) => (
        // Static placeholder rows — index keys are intentional here.
        // eslint-disable-next-line react/no-array-index-key
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-image"></div>
      <div className="skeleton skeleton-line w-60"></div>
      <div className="skeleton skeleton-line w-40"></div>
    </div>
  );
}

/**
 * @param {{lines?: number}} props
 */
export function CartSkeleton({lines = 2}) {
  return (
    <div className="skeleton-card" aria-hidden="true">
      {Array.from({length: lines}).map((_, i) => (
        // Static placeholder rows — index keys are intentional here.
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="cart-skeleton-row">
          <div
            className="skeleton"
            style={{width: 80, height: 80, borderRadius: 12}}
          ></div>
          <div style={{flex: 1, display: 'grid', gap: '0.6rem'}}>
            <div className="skeleton skeleton-line w-60"></div>
            <div className="skeleton skeleton-line w-40"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TextSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-line"></div>
      <div className="skeleton skeleton-line w-60"></div>
    </div>
  );
}
