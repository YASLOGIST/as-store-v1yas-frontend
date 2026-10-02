import {Link, useLocation, useNavigate, useNavigation} from 'react-router';
import {useId} from 'react';
import {
  SORT_OPTIONS,
  clearFiltersSearch,
  setSortSearch,
  toggleFilterSearch,
} from '~/lib/collectionFilters';

/**
 * Sort + facet controls for a collection grid.
 *
 * Every control is a plain link or a GET form: the grid stays usable with
 * JavaScript disabled, and each state is a real URL the shopper can share.
 *
 * @param {{
 *   groups: Array<{id: string, label: string, values: Array<{id: string, label: string, count: number, input: string, active: boolean}>, activeCount: number}>;
 *   chips: Array<{id: string, input: string, label: string, group: string}>;
 *   options?: Array<{id: string, label: string}>;
 *   sortId: string;
 *   summary: string;
 * }}
 */
export function CollectionControls({
  groups = [],
  chips = [],
  options = SORT_OPTIONS,
  sortId,
  summary,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const sortLabelId = useId();
  const search = location.search;
  const busy = navigation.state === 'loading';
  const hasFacets = groups.length > 0;

  return (
    <div className="collection-controls" data-busy={busy ? '' : undefined}>
      <div className="collection-toolbar">
        <p className="collection-count" aria-live="polite">
          {summary}
        </p>

        <form
          className="collection-sort"
          method="get"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('sort');
            navigate(`${location.pathname}${setSortSearch(search, value)}`, {
              preventScrollReset: true,
            });
          }}
        >
          {/* Preserve facets for the no-JS submit path. */}
          {chips.map((chip) => (
            <input
              key={chip.id}
              name="filter"
              type="hidden"
              value={
                typeof chip.input === 'string'
                  ? chip.input
                  : JSON.stringify(chip.input)
              }
            />
          ))}
          <label htmlFor={sortLabelId}>Sort</label>
          <select
            defaultValue={sortId}
            id={sortLabelId}
            key={sortId}
            name="sort"
            onChange={(event) =>
              navigate(
                `${location.pathname}${setSortSearch(
                  search,
                  event.currentTarget.value,
                )}`,
                {preventScrollReset: true},
              )
            }
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost sort-apply" type="submit">
            Apply sort
          </button>
        </form>
      </div>

      {chips.length > 0 && (
        <div className="filter-chips">
          <span className="filter-chips-label">Filtered by</span>
          <ul>
            {chips.map((chip) => (
              <li key={chip.id}>
                <Link
                  className="filter-chip"
                  preventScrollReset
                  to={`${location.pathname}${toggleFilterSearch(
                    search,
                    chip.input,
                  )}`}
                >
                  <bdi>{chip.label}</bdi>
                  <span aria-hidden="true">×</span>
                  <span className="sr-only"> — remove {chip.group} filter</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            className="filter-clear"
            preventScrollReset
            to={`${location.pathname}${clearFiltersSearch(search)}`}
          >
            Clear all
          </Link>
        </div>
      )}

      {hasFacets && (
        <details className="filter-panel" open>
          <summary>
            <span>Filters</span>
            <span className="filter-panel-count">
              {chips.length > 0 ? chips.length : null}
            </span>
          </summary>
          <div className="filter-groups">
            {groups.map((group) => (
              <fieldset className="filter-group" key={group.id}>
                <legend>{group.label}</legend>
                <ul>
                  {group.values.map((value) => (
                    <li key={value.id}>
                      <Link
                        className="filter-option"
                        data-active={value.active ? '' : undefined}
                        preventScrollReset
                        to={`${location.pathname}${toggleFilterSearch(
                          search,
                          value.input,
                        )}`}
                      >
                        <span className="filter-option-box" aria-hidden="true">
                          {value.active ? '✓' : ''}
                        </span>
                        <span className="filter-option-label">
                          <bdi>{value.label}</bdi>
                        </span>
                        <span className="filter-option-count">
                          {value.count}
                        </span>
                        <span className="sr-only">
                          {value.active ? ' (applied, select to remove)' : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
