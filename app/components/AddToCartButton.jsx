import {useEffect, useRef, useState} from 'react';
import {CartForm} from '@shopify/hydrogen';

/** Mutation-aware add button with loading and short-lived success morph. */
export function AddToCartButton({
  analytics,
  children,
  className,
  disabled = false,
  lines,
  onClick,
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher) => (
        <MutationButton
          analytics={analytics}
          className={className}
          disabled={disabled}
          fetcher={fetcher}
          onClick={onClick}
        >
          {children}
        </MutationButton>
      )}
    </CartForm>
  );
}

function MutationButton({
  analytics,
  children,
  className,
  disabled,
  fetcher,
  onClick,
}) {
  const isLoading = fetcher.state !== 'idle';
  const wasLoading = useRef(false);
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    let timer;
    if (wasLoading.current && !isLoading && fetcher.data?.cart) {
      setSucceeded(true);
      document.querySelector('.header-cta-cart')?.classList.add('cart-success');
      timer = setTimeout(() => {
        setSucceeded(false);
        document
          .querySelector('.header-cta-cart')
          ?.classList.remove('cart-success');
      }, 1200);
    }
    wasLoading.current = isLoading;
    return () => clearTimeout(timer);
  }, [fetcher.data, isLoading]);

  return (
    <>
      {analytics ? (
        <input
          name="analytics"
          type="hidden"
          value={JSON.stringify(analytics)}
        />
      ) : null}
      <button
        aria-busy={isLoading}
        className={`${className || ''}${succeeded ? ' add-succeeded' : ''}`}
        data-testid="add-to-cart"
        data-magnetic
        disabled={disabled || isLoading}
        onClick={onClick}
        type="submit"
      >
        {succeeded
          ? 'Added ✓'
          : typeof children === 'function'
            ? children(isLoading)
            : children}
      </button>
    </>
  );
}

/** @typedef {import('@shopify/hydrogen').OptimisticCartLineInput} OptimisticCartLineInput */
