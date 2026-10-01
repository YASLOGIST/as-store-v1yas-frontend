import {useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {AddToCartButton} from './AddToCartButton';
import {useAsideActions} from './Aside';

/**
 * Variant and quantity selection with URL-synchronized options.
 * @param {{
 *   productOptions: MappedProductOptions[];
 *   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
 * }}
 */
export function ProductForm({productOptions, selectedVariant}) {
  const navigate = useNavigate();
  const {open} = useAsideActions();
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="product-form">
      {productOptions.map((option) => {
        if (option.optionValues.length === 1) return null;

        return (
          <fieldset className="product-options" key={option.name}>
            <legend>{option.name}</legend>
            <div className="product-options-grid">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value;
                const optionClass = `product-options-item${
                  selected ? ' selected' : ''
                }${available ? '' : ' unavailable'}`;

                if (isDifferentProduct) {
                  return (
                    <Link
                      aria-current={selected ? 'page' : undefined}
                      className={optionClass}
                      key={option.name + name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${handle}?${variantUriQuery}`}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </Link>
                  );
                }

                return (
                  <button
                    aria-pressed={selected}
                    type="button"
                    className={optionClass}
                    key={option.name + name}
                    disabled={!exists}
                    onClick={() => {
                      if (!selected) {
                        void navigate(`?${variantUriQuery}`, {
                          replace: true,
                          preventScrollReset: true,
                        });
                      }
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="product-purchase-row">
        <div className="quantity-selector" aria-label="Quantity">
          <button
            aria-label="Decrease quantity"
            disabled={quantity === 1}
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            type="button"
          >
            −
          </button>
          <output aria-live="polite" aria-label={`Quantity ${quantity}`}>
            {quantity}
          </output>
          <button
            aria-label="Increase quantity"
            disabled={quantity === 99}
            onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            type="button"
          >
            +
          </button>
        </div>
        <AddToCartButton
          className="add-to-cart"
          disabled={!selectedVariant || !selectedVariant.availableForSale}
          onClick={() => open('cart')}
          lines={
            selectedVariant
              ? [
                  {
                    merchandiseId: selectedVariant.id,
                    quantity,
                    selectedVariant,
                  },
                ]
              : []
          }
        >
          {(isLoading) =>
            isLoading
              ? `Adding ${quantity}…`
              : selectedVariant?.availableForSale
                ? `Add ${quantity > 1 ? `${quantity} ` : ''}to cart`
                : 'Sold out'
          }
        </AddToCartButton>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   swatch?: Maybe<ProductOptionValueSwatch> | undefined;
 *   name: string;
 * }}
 */
function ProductOptionSwatch({swatch, name}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <span className="product-option-with-label">
      <span
        aria-hidden="true"
        className="product-option-label-swatch"
        style={{backgroundColor: color || 'transparent'}}
      >
        {image ? <img src={image} alt="" height="24" width="24" /> : null}
      </span>
      <span>{name}</span>
    </span>
  );
}

/** @typedef {import('@shopify/hydrogen').MappedProductOptions} MappedProductOptions */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Maybe} Maybe */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').ProductOptionValueSwatch} ProductOptionValueSwatch */
/** @typedef {import('storefrontapi.generated').ProductFragment} ProductFragment */
