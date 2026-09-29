import {CartForm} from '@shopify/hydrogen';

/**
 * Mutation-aware add button that prevents duplicate submissions and exposes its
 * progress to assistive technology.
 * @param {{
 *   analytics?: unknown;
 *   children: React.ReactNode | ((isLoading: boolean) => React.ReactNode);
 *   className?: string;
 *   disabled?: boolean;
 *   lines: Array<OptimisticCartLineInput>;
 *   onClick?: () => void;
 * }}
 */
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
      {(fetcher) => {
        const isLoading = fetcher.state !== 'idle';
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
              type="submit"
              className={className}
              onClick={onClick}
              disabled={disabled || isLoading}
            >
              {typeof children === 'function' ? children(isLoading) : children}
            </button>
          </>
        );
      }}
    </CartForm>
  );
}

/** @typedef {import('@shopify/hydrogen').OptimisticCartLineInput} OptimisticCartLineInput */
