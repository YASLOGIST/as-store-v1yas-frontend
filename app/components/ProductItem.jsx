import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';

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
  const onSale =
    compareAtPrice &&
    Number(compareAtPrice.amount) > Number(price?.amount ?? '0');
  const soldOut = variant ? !variant.availableForSale : false;

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
              <span className="badge badge-sale">Sale</span>
            ) : null}
          </div>
        )}
        {image && (
          <Image
            alt={image.altText || product.title}
            aspectRatio="1/1"
            data={image}
            loading={loading}
            sizes="(min-width: 45em) 400px, 100vw"
          />
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
              + Quick add
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
