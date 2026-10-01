import {useFetcher, useNavigate} from 'react-router';
import {useEffect, useRef} from 'react';
import {getSearchUrl} from '~/lib/search';
import {useAsideActions} from './Aside';

export const SEARCH_ENDPOINT = '/search';
const SEARCH_DEBOUNCE_MS = 180;

/**
 * Predictive search form with bounded request frequency and encoded navigation.
 * @param {SearchFormPredictiveProps}
 */
export function SearchFormPredictive({
  children,
  className = 'predictive-search-form',
  ...props
}) {
  const fetcher = useFetcher({key: 'search'});
  const inputRef = useRef(null);
  const debounceTimer = useRef(undefined);
  const navigate = useNavigate();
  const aside = useAsideActions();

  function goToSearch() {
    const term = inputRef.current?.value ?? '';
    window.clearTimeout(debounceTimer.current);
    void navigate(getSearchUrl(term));
    inputRef.current?.blur();
    aside.close();
  }

  function handleSubmit(event) {
    event.preventDefault();
    goToSearch();
  }

  /** @param {React.ChangeEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>} event */
  function fetchResults(event) {
    const value = event.currentTarget.value;
    window.clearTimeout(debounceTimer.current);

    const submit = () => {
      void fetcher.submit(
        {q: value, limit: 5, predictive: true},
        {method: 'GET', action: SEARCH_ENDPOINT},
      );
    };

    if (!value.trim()) submit();
    else debounceTimer.current = window.setTimeout(submit, SEARCH_DEBOUNCE_MS);
  }

  useEffect(() => {
    inputRef.current?.setAttribute('type', 'search');
    return () => window.clearTimeout(debounceTimer.current);
  }, []);

  if (typeof children !== 'function') return null;

  return (
    <fetcher.Form {...props} className={className} onSubmit={handleSubmit}>
      {children({inputRef, fetcher, fetchResults, goToSearch})}
    </fetcher.Form>
  );
}

/**
 * @typedef {(args: {
 *   fetchResults: (event: React.ChangeEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => void;
 *   goToSearch: () => void;
 *   inputRef: React.MutableRefObject<HTMLInputElement | null>;
 *   fetcher: Fetcher<PredictiveSearchReturn>;
 * }) => React.ReactNode} SearchFormPredictiveChildren
 */
/**
 * @typedef {Omit<FormProps, 'children'> & {
 *   children: SearchFormPredictiveChildren | null;
 * }} SearchFormPredictiveProps
 */

/** @typedef {import('react-router').FormProps} FormProps */
/** @template T @typedef {import('react-router').Fetcher<T>} Fetcher */
/** @typedef {import('~/lib/search').PredictiveSearchReturn} PredictiveSearchReturn */
