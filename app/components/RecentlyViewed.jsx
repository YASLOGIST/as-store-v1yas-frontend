import {useEffect, useState} from 'react';
import {Link} from 'react-router';

const STORAGE_KEY = 'yas:recently-viewed:v1';
const LIMIT = 4;

/** Client-only history built exclusively from products the shopper actually saw. */
export function RecentlyViewed({product}) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const previous = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const safePrevious = Array.isArray(previous) ? previous : [];
      setItems(safePrevious.filter((item) => item.handle !== product.handle));
      const variant = product.selectedOrFirstAvailableVariant;
      const current = {
        handle: product.handle,
        title: product.title,
        image: variant?.image?.url || product.featuredImage?.url || null,
        price: variant?.price?.amount || null,
        currency: variant?.price?.currencyCode || null,
      };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          [
            current,
            ...safePrevious.filter((item) => item.handle !== product.handle),
          ].slice(0, LIMIT),
        ),
      );
    } catch {
      // Storage can be disabled; product browsing remains fully functional.
    }
  }, [product]);

  if (!items.length) return null;
  const locale = document.documentElement.lang || 'en';
  return (
    <section
      className="recently-viewed"
      aria-labelledby="recently-viewed-heading"
    >
      <span className="eyebrow">Your history</span>
      <h2 id="recently-viewed-heading">Recently viewed</h2>
      <div className="recently-viewed-grid">
        {items.map((item) => (
          <Link
            className="recently-viewed-item reveal"
            key={item.handle}
            prefetch="intent"
            to={`/products/${item.handle}`}
            viewTransition
          >
            {item.image ? <img alt="" loading="lazy" src={item.image} /> : null}
            <span>{item.title}</span>
            {item.price && item.currency ? (
              <small>
                {new Intl.NumberFormat(locale, {
                  style: 'currency',
                  currency: item.currency,
                }).format(Number(item.price))}
              </small>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
