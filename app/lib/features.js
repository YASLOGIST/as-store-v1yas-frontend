const DEFAULTS = {
  premiumMotion: true,
  pointerEffects: true,
  productTilt: true,
  modelViewer: false,
  quickView: true,
  recentlyViewed: true,
};

/** Public, non-sensitive kill switches. Oxygen environment changes can disable
 * risky visual features independently without a source-code deployment. */
export function getFeatureFlags(env) {
  return Object.fromEntries(
    Object.entries(DEFAULTS).map(([name, fallback]) => {
      const key = `PUBLIC_FEATURE_${name.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`;
      const value = env?.[key];
      return [name, value == null ? fallback : value === 'true'];
    }),
  );
}
