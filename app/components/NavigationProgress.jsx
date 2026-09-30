import {useNavigation} from 'react-router';

/**
 * Global navigation feedback for both sighted and screen-reader users. The bar
 * is CSS-only and does not delay or intercept React Router navigation.
 */
export function NavigationProgress() {
  const navigation = useNavigation();
  const active = navigation.state !== 'idle';
  const message =
    navigation.state === 'submitting' ? 'Submitting changes' : 'Loading page';

  return (
    <>
      <div
        aria-hidden="true"
        className={`navigation-progress${active ? ' active' : ''}`}
      />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {active ? message : ''}
      </p>
    </>
  );
}
