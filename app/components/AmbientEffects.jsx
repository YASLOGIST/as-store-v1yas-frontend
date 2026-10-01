import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';

const REVEAL_SELECTOR = '.reveal, [data-motion="reveal"]';

/**
 * Global VOLT motion runtime. Event delegation and IntersectionObserver keep the
 * implementation constant-size regardless of product count. Every frame writes
 * transform-driving custom properties only; React is never rerendered.
 */
export function AmbientEffects() {
  const lightRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const light = lightRef.current;
    const features = document.documentElement.dataset.features || '';
    if (!features.includes('premiumMotion')) return undefined;
    document.documentElement.dataset.motion = 'ready';
    const motionAllowed = window.matchMedia(
      '(prefers-reduced-motion: no-preference)',
    ).matches;
    const finePointer = window.matchMedia(
      '(hover: hover) and (pointer: fine)',
    ).matches;
    if (!motionAllowed) {
      document.documentElement.dataset.reducedMotion = 'true';
      document.querySelectorAll(REVEAL_SELECTOR).forEach((element) => {
        element.dataset.motionVisible = 'true';
      });
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.dataset.motionVisible = 'true';
          observer.unobserve(entry.target);
        }
      },
      {rootMargin: '0px 0px -8% 0px', threshold: 0.08},
    );
    const observeReveal = (root) => {
      if (root instanceof Element && root.matches(REVEAL_SELECTOR)) {
        observer.observe(root);
      }
      root
        .querySelectorAll?.(REVEAL_SELECTOR)
        .forEach((element) => observer.observe(element));
    };
    observeReveal(document);
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach(observeReveal);
      }
    });
    mutations.observe(document.body, {childList: true, subtree: true});

    if (!finePointer || !light || !features.includes('pointerEffects')) {
      return () => {
        mutations.disconnect();
        observer.disconnect();
      };
    }

    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;
    let target = null;
    const paint = () => {
      frame = 0;
      light.style.setProperty('--pointer-x', `${x}px`);
      light.style.setProperty('--pointer-y', `${y}px`);
      const hero = document.querySelector('.hero-visual');
      if (hero) {
        hero.style.setProperty(
          '--tilt-x',
          `${(y / innerHeight - 0.5) * -5}deg`,
        );
        hero.style.setProperty('--tilt-y', `${(x / innerWidth - 0.5) * 7}deg`);
      }
      if (target) {
        const bounds = target.getBoundingClientRect();
        target.style.setProperty(
          '--magnetic-x',
          `${(x - bounds.left - bounds.width / 2) * 0.12}px`,
        );
        target.style.setProperty(
          '--magnetic-y',
          `${(y - bounds.top - bounds.height / 2) * 0.12}px`,
        );
      }
    };
    const requestPaint = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onPointerMove = (event) => {
      x = event.clientX;
      y = event.clientY;
      const next = event.target.closest?.('[data-magnetic]') ?? null;
      if (target && target !== next) {
        target.style.removeProperty('--magnetic-x');
        target.style.removeProperty('--magnetic-y');
      }
      target = next;
      requestPaint();
    };
    const onScroll = () => {
      document
        .querySelector('.hero-visual')
        ?.style.setProperty(
          '--hero-depth',
          `${Math.min(scrollY, innerHeight) * 0.08}px`,
        );
      document
        .querySelector('.marquee-track')
        ?.style.setProperty(
          '--marquee-depth',
          `${Math.max(-300, scrollY * -0.18)}px`,
        );
    };

    window.addEventListener('pointermove', onPointerMove, {passive: true});
    window.addEventListener('scroll', onScroll, {passive: true});
    paint();
    return () => {
      mutations.disconnect();
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [location.key]);

  return (
    <div className="ambient-pointer-light" ref={lightRef} aria-hidden="true" />
  );
}
