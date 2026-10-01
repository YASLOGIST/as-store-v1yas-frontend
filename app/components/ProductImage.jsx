import {Image} from '@shopify/hydrogen';
import {LogoMark} from './Icons';

/**
 * @param {{
 *   image: ProductVariantFragment['image'];
 * }}
 */
export function ProductImage({image}) {
  if (!image) {
    return (
      <div
        className="product-image product-image-placeholder"
        data-testid="product-media"
        aria-hidden="true"
      >
        <LogoMark size={72} />
      </div>
    );
  }
  const trackFocalPoint = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    event.currentTarget.style.setProperty('--zoom-x', `${x.toFixed(1)}%`);
    event.currentTarget.style.setProperty('--zoom-y', `${y.toFixed(1)}%`);
  };

  return (
    <figure
      className="product-image product-image-zoom"
      data-testid="product-media"
      onPointerMove={trackFocalPoint}
    >
      <Image
        alt={image.altText || 'Product Image'}
        aspectRatio="1/1"
        data={image}
        key={image.id}
        sizes="(min-width: 45em) 50vw, 100vw"
      />
      <figcaption className="product-image-hint" aria-hidden="true">
        Move to inspect
      </figcaption>
    </figure>
  );
}

/** @typedef {import('storefrontapi.generated').ProductVariantFragment} ProductVariantFragment */
