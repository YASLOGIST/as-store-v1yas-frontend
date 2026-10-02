export const MODEL_VIEWER_MODULE =
  'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js';

export const MODEL_VIEWER_TAG = 'model-viewer';

/** Shared across mounts so the module is requested at most once per document. */
let definitionPromise = null;

/** Test seam: drops the memoised promise. */
export function resetModelViewerLoader() {
  definitionPromise = null;
}

export function isModelViewerDefined() {
  return (
    typeof customElements !== 'undefined' &&
    Boolean(customElements.get(MODEL_VIEWER_TAG))
  );
}

/**
 * Resolve once `<model-viewer>` is upgraded and usable.
 *
 * Listening for the script tag's `load` event is not sufficient: when a second
 * component mounts after the tag has already loaded, that event never fires
 * again and the viewer stays stuck on its poster forever. Custom element
 * registration is the only signal that is correct in every ordering, so the
 * script tag is used purely as a transport and `whenDefined` as the gate.
 *
 * @returns {Promise<void>}
 */
export function loadModelViewer() {
  if (
    typeof document === 'undefined' ||
    typeof customElements === 'undefined'
  ) {
    return Promise.reject(new Error('model-viewer-no-dom'));
  }
  if (isModelViewerDefined()) return Promise.resolve();
  if (definitionPromise) return definitionPromise;

  definitionPromise = new Promise((resolve, reject) => {
    let script = document.querySelector(`script[src="${MODEL_VIEWER_MODULE}"]`);
    if (!script) {
      script = document.createElement('script');
      script.type = 'module';
      script.crossOrigin = 'anonymous';
      script.src = MODEL_VIEWER_MODULE;
      document.head.append(script);
    }
    script.addEventListener(
      'error',
      () => reject(new Error('model-viewer-unavailable')),
      {once: true},
    );
    customElements.whenDefined(MODEL_VIEWER_TAG).then(() => resolve(), reject);
  });

  // A transient CDN failure must not poison later mounts.
  definitionPromise.catch(() => {
    definitionPromise = null;
  });

  return definitionPromise;
}
