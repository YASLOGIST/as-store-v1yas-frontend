import {useEffect, useState} from 'react';

/**
 * Progressive product sharing: native share sheet where supported, clipboard
 * fallback elsewhere, and a visible copyable URL when browser APIs are denied.
 * @param {{title: string; url: string}}
 */
export function ShareButton({title, url}) {
  const [status, setStatus] = useState('');
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!status) return undefined;
    const timeout = setTimeout(() => setStatus(''), 3000);
    return () => clearTimeout(timeout);
  }, [status]);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({title, url});
        setStatus('Shared');
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus('Link copied');
    } catch (error) {
      // AbortError means the user intentionally dismissed the native sheet.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShowFallback(true);
      setStatus('Copy the link below');
    }
  }

  return (
    <div className="product-share">
      <button className="btn btn-ghost" type="button" onClick={share}>
        Share product
      </button>
      <span className="product-share-status" aria-live="polite">
        {status}
      </span>
      {showFallback ? (
        <input
          aria-label="Product link"
          className="product-share-url"
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          value={url}
        />
      ) : null}
    </div>
  );
}
