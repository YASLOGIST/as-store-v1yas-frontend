import {useEffect, useRef, useState} from 'react';

const MODEL_VIEWER_MODULE =
  'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js';

/** Feature-gated, interaction-adjacent model viewer. The dependency is fetched
 * only when an actual Shopify Model3d source enters the viewport. */
export function ProductModelViewer({enabled, image, model}) {
  const hostRef = useRef(null);
  const [ready, setReady] = useState(
    () =>
      typeof customElements !== 'undefined' &&
      Boolean(customElements.get('model-viewer')),
  );
  const source = model?.sources?.find((item) =>
    ['model/gltf-binary', 'model/gltf+json'].includes(item.mimeType),
  );

  useEffect(() => {
    if (!enabled || !source || ready) return undefined;
    const host = hostRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let script = document.querySelector(
          `script[src="${MODEL_VIEWER_MODULE}"]`,
        );
        if (!script) {
          script = document.createElement('script');
          script.type = 'module';
          script.src = MODEL_VIEWER_MODULE;
          document.head.append(script);
        }
        script.addEventListener(
          'load',
          () => setReady(Boolean(customElements.get('model-viewer'))),
          {once: true},
        );
      },
      {rootMargin: '300px'},
    );
    if (host) observer.observe(host);
    return () => observer.disconnect();
  }, [enabled, ready, source]);

  if (!enabled || !source) return null;
  return (
    <section
      className="product-model"
      ref={hostRef}
      aria-label="Interactive 3D product view"
    >
      {ready ? (
        <model-viewer
          alt={model.alt || 'Interactive product model'}
          ar
          camera-controls
          interaction-prompt="auto"
          loading="lazy"
          poster={model.previewImage?.url || image?.url}
          reveal="interaction"
          src={source.url}
        />
      ) : image?.url ? (
        <img alt={image.altText || ''} loading="lazy" src={image.url} />
      ) : (
        <p>Interactive model available when loaded.</p>
      )}
    </section>
  );
}
