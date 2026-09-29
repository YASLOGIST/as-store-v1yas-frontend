import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
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
  const {open} = useAside();

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
        <Link className="product-item-title" prefetch="intent" to={variantUrl}>
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
    </div>
  );
}

/** @typedef {import('storefrontapi.generated').ProductItemFragment} ProductItemFragment */
/** @typedef {import('storefrontapi.generated').CollectionItemFragment} CollectionItemFragment */
/** @typedef {import('storefrontapi.generated').RecommendedProductFragment} RecommendedProductFragment */
