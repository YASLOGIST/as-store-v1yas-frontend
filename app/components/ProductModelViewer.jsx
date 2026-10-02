import {useCallback, useEffect, useRef, useState} from 'react';
import {isModelViewerDefined, loadModelViewer} from '~/lib/modelViewerLoader';

const GLTF_MIME_TYPES = ['model/gltf-binary', 'model/gltf+json'];

/**
 * Feature-gated 3D product view.
 *
 * Payload discipline: nothing is fetched until a real Shopify `Model3d` source
 * scrolls near the viewport, and the Shopify image stays visible until the
 * element is defined, so a CDN failure or disabled JS degrades to the photo.
 *
 * Spatial UX: orbit, zoom and field of view are clamped so the product cannot
 * be flipped under the floor, lost off-screen, or zoomed into geometry.
 * Vertical touch gestures stay with the page, never the model, so the viewer
 * cannot trap a scrolling thumb.
 *
 * @param {{enabled?: boolean, image?: object, model?: object}} props
 */
export function ProductModelViewer({enabled, image, model}) {
  const hostRef = useRef(null);
  const viewerRef = useRef(null);
  const [status, setStatus] = useState(() =>
    typeof customElements !== 'undefined' && customElements.get('model-viewer')
      ? 'ready'
      : 'idle',
  );
  const source = model?.sources?.find((item) =>
    GLTF_MIME_TYPES.includes(item.mimeType),
  );
  const poster = model?.previewImage?.url || image?.url;

  useEffect(() => {
    if (!enabled || !source || status === 'ready' || status === 'failed') {
      return undefined;
    }
    const host = hostRef.current;
    if (!host) return undefined;
    // Hydration-safe: the server always renders the image, and an already
    // registered element (second product view) promotes on the client.
    if (isModelViewerDefined()) {
      setStatus('ready');
      return undefined;
    }
    let cancelled = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setStatus('loading');
        loadModelViewer().then(
          () => !cancelled && setStatus('ready'),
          () => !cancelled && setStatus('failed'),
        );
      },
      {rootMargin: '300px'},
    );
    observer.observe(host);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [enabled, source, status]);

  // Release GPU resources on unmount instead of waiting for the element's own
  // teardown: clearing `src` disposes the parsed scene, textures and buffers.
  useEffect(
    () => () => {
      const viewer = viewerRef.current;
      if (viewer) viewer.src = '';
    },
    [],
  );

  const resetView = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.cameraOrbit = '28deg 76deg 105%';
    viewer.fieldOfView = 'auto';
  }, []);

  if (!enabled || !source) return null;

  return (
    <section
      className="product-model"
      data-state={status}
      ref={hostRef}
      aria-label="Interactive 3D product view"
    >
      {status === 'ready' ? (
        <>
          <model-viewer
            alt={model.alt || 'Interactive 3D view of this product'}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            camera-orbit="28deg 76deg 105%"
            disable-pan
            environment-image="neutral"
            exposure="0.95"
            field-of-view="30deg"
            interaction-prompt="auto"
            interpolation-decay="160"
            loading="lazy"
            max-camera-orbit="auto 100deg 160%"
            max-field-of-view="40deg"
            min-camera-orbit="auto 25deg 70%"
            min-field-of-view="18deg"
            poster={poster}
            ref={viewerRef}
            reveal="interaction"
            shadow-intensity="0.85"
            shadow-softness="0.9"
            src={source.url}
            tone-mapping="neutral"
            touch-action="pan-y"
          />
          <button
            className="product-model-reset"
            onClick={resetView}
            type="button"
          >
            Reset view
          </button>
        </>
      ) : image?.url ? (
        <img alt={image.altText || ''} loading="lazy" src={image.url} />
      ) : (
        <p>3D view loads when this section is in view.</p>
      )}
    </section>
  );
}
