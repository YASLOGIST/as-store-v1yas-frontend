import {Link, useRouteLoaderData} from 'react-router';
import {useEffect, useRef, useState} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAsideActions} from '~/components/Aside';
import {LogoMark} from '~/components/Icons';

/**
 * Product card with hover states, status badges and one-tap quick add.
 * Quick-add only renders when variant data is present in the fragment.
 * Uses a “stretched link” pattern so the whole card is clickable while
 * keeping valid HTML (no nested interactive elements).
 * @param {{
 *   product:
 *     | CollectionItemFragment
 *     | ProductItemFragment
 *     | RecommendedProductFragment;
 *   loading?: 'eager' | 'lazy';
 *   index?: number;
 * }}
 */
export function ProductItem({product, loading, index}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  const {open} = useAsideActions();
  const rootData = useRouteLoaderData('root');
  const quickViewEnabled = rootData?.features?.quickView !== false;
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [wished, setWished] = useState(false);

  useEffect(() => {
    try {
      const values = JSON.parse(
        localStorage.getItem('yas:wishlist:v1') || '[]',
      );
      setWished(Array.isArray(values) && values.includes(product.id));
    } catch {
      setWished(false);
    }
  }, [product.id]);

  const toggleWishlist = () => {
    setWished((current) => {
      const next = !current;
      try {
        const values = JSON.parse(
          localStorage.getItem('yas:wishlist:v1') || '[]',
        );
        const items = new Set(Array.isArray(values) ? values : []);
        if (next) items.add(product.id);
        else items.delete(product.id);
        localStorage.setItem('yas:wishlist:v1', JSON.stringify([...items]));
      } catch {
        // Storage is optional; preserve the in-session state.
      }
      return next;
    });
  };

  const variant = product.variants?.nodes?.[0];
  const price = product.priceRange?.minVariantPrice;
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;
  const onSale = Boolean(
    price &&
    compareAtPrice &&
    Number(compareAtPrice.amount) > Number(price.amount),
  );
  const soldOut = variant ? !variant.availableForSale : false;
  const salePercent = onSale
    ? Math.round(
        (1 - Number(price.amount) / Number(compareAtPrice.amount)) * 100,
      )
    : 0;

  return (
    <div
      className="product-item reveal"
      style={index != null ? {'--stagger': `${index * 60}ms`} : undefined}
    >
      <div className="product-item-media">
        {(onSale || soldOut) && (
          <div className="product-item-badges">
            {soldOut ? (
              <span className="badge badge-soldout">Sold out</span>
            ) : onSale ? (
              <span className="badge badge-sale">Save {salePercent}%</span>
            ) : null}
          </div>
        )}
        {image ? (
          <Image
            alt={image.altText || product.title}
            aspectRatio="1/1"
            data={image}
            loading={loading ?? 'lazy'}
            sizes="(min-width: 75em) 300px, (min-width: 45em) 33vw, 50vw"
          />
        ) : (
          <div className="product-item-placeholder" aria-hidden="true">
            <LogoMark size={52} />
          </div>
        )}
        <button
          aria-label={`${wished ? 'Remove' : 'Add'} ${product.title} ${wished ? 'from' : 'to'} wishlist`}
          aria-pressed={wished}
          className="product-wishlist reset"
          onClick={toggleWishlist}
          type="button"
        >
          <span aria-hidden="true">{wished ? '♥' : '♡'}</span>
        </button>
        {quickViewEnabled ? (
          <button
            className="product-quick-view reset"
            data-testid="quick-view-open"
            onClick={() => setQuickViewOpen(true)}
            type="button"
          >
            Quick view<span className="sr-only"> {product.title}</span>
          </button>
        ) : null}
        {variant && !soldOut ? (
          <div className="product-quick-add">
            <AddToCartButton
              lines={[
                {
                  merchandiseId: variant.id,
                  quantity: 1,
                },
              ]}
              analytics={{
                products: [product],
              }}
              onClick={() => open('cart')}
            >
              {(isLoading) =>
                isLoading ? (
                  'Adding…'
                ) : (
                  <>
                    + Quick add<span className="sr-only"> {product.title}</span>
                  </>
                )
              }
            </AddToCartButton>
          </div>
        ) : null}
      </div>
      <div className="product-item-info">
        <Link
          className="product-item-title"
          prefetch="viewport"
          to={variantUrl}
          viewTransition
        >
          <h4>{product.title}</h4>
        </Link>
        <small>
          {price ? <Money data={price} /> : null}
          {onSale && compareAtPrice ? (
            <s>
              <Money data={compareAtPrice} />
            </s>
          ) : null}
        </small>
      </div>
      {quickViewEnabled ? (
        <ProductQuickView
          image={image}
          onClose={() => setQuickViewOpen(false)}
          open={quickViewOpen}
          price={price}
          product={product}
          variant={variant}
          variantUrl={variantUrl}
        />
      ) : null}
    </div>
  );
}

function ProductQuickView({
  image,
  onClose,
  open,
  price,
  product,
  variant,
  variantUrl,
}) {
  const dialogRef = useRef(null);
  const {open: openAside} = useAsideActions();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby={`quick-view-${product.id}`}
      className="quick-view"
      data-testid="quick-view"
      onCancel={onClose}
      onClose={onClose}
      ref={dialogRef}
    >
      <button
        className="quick-view-close reset"
        onClick={onClose}
        aria-label="Close quick view"
      >
        ×
      </button>
      {image ? (
        <Image
          alt={image.altText || product.title}
          aspectRatio="1/1"
          data={image}
          loading="lazy"
          sizes="(min-width: 45em) 42vw, 90vw"
        />
      ) : (
        <div className="product-item-placeholder" aria-hidden="true">
          <LogoMark size={52} />
        </div>
      )}
      <div className="quick-view-content">
        <span className="eyebrow">Quick view</span>
        <h2 id={`quick-view-${product.id}`}>{product.title}</h2>
        {price ? <Money data={price} /> : null}
        <div className="quick-view-actions">
          <Link
            to={variantUrl}
            viewTransition
            onClick={onClose}
            className="btn btn-ghost"
          >
            Full details
          </Link>
          {variant?.availableForSale ? (
            <AddToCartButton
              className="btn btn-primary"
              lines={[{merchandiseId: variant.id, quantity: 1}]}
              onClick={() => {
                onClose();
                openAside('cart');
              }}
            >
              {(loading) => (loading ? 'Adding…' : 'Add to cart')}
            </AddToCartButton>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {import('storefrontapi.generated').CollectionItemFragment} CollectionItemFragment */
/** @typedef {import('storefrontapi.generated').RecommendedProductFragment} RecommendedProductFragment */
