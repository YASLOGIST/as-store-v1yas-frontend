import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Accessible drawer with focus containment, focus restoration, escape handling,
 * scroll locking, and isolated landmarks.
 * @param {{
 *   children?: React.ReactNode;
 *   type: AsideType;
 *   heading: React.ReactNode;
 * }}
 */
export function Aside({children, heading, type}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;
  const panelRef = useRef(null);
  const headingId = useId();

  useEffect(() => {
    if (!expanded) return undefined;

    const abortController = new AbortController();
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const panel = panelRef.current;
    document.body.style.overflow = 'hidden';

    function getFocusableElements() {
      return panel
        ? Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
            (element) => element instanceof HTMLElement,
          )
        : [];
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (!focusable.length) {
        event.preventDefault();
        panel?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, {
      signal: abortController.signal,
    });
    const animationFrame = requestAnimationFrame(() => {
      const autofocus = panel?.querySelector('[data-autofocus]');
      if (autofocus instanceof HTMLElement) autofocus.focus();
      else getFocusableElements()[0]?.focus();
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      abortController.abort();
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [close, expanded]);

  return (
    <div
      aria-hidden={!expanded}
      className={`overlay ${expanded ? 'expanded' : ''}`}
      data-drawer={type}
    >
      <button
        aria-label={`Close ${String(heading).toLowerCase()}`}
        className="close-outside"
        onClick={close}
        tabIndex={-1}
        type="button"
      />
      <aside
        aria-labelledby={headingId}
        aria-modal={expanded || undefined}
        className="drawer"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header>
          <h2 id={headingId}>{heading}</h2>
          <button className="close reset" onClick={close} aria-label="Close">
            &times;
          </button>
        </header>
        <div className="drawer-content">{children}</div>
      </aside>
    </div>
  );
}

const AsideContext = createContext(null);

Aside.Provider = function AsideProvider({children}) {
  const [type, setType] = useState('closed');
  const close = useCallback(() => setType('closed'), []);
  const open = useCallback((nextType) => setType(nextType), []);
  const value = useMemo(() => ({type, open, close}), [close, open, type]);

  return (
    <AsideContext.Provider value={value}>{children}</AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}

/** @typedef {'search' | 'cart' | 'mobile' | 'closed'} AsideType */
/**
 * @typedef {{
 *   type: AsideType;
 *   open: (mode: AsideType) => void;
 *   close: () => void;
 * }} AsideContextValue
 */
