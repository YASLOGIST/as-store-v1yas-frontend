import {describe, expect, it} from 'vitest';
import {getFeatureFlags} from './features';

describe('public visual feature flags', () => {
  it('uses safe defaults with model loading opt-in', () => {
    expect(getFeatureFlags({})).toMatchObject({
      premiumMotion: true,
      pointerEffects: true,
      productTilt: true,
      modelViewer: false,
      quickView: true,
      recentlyViewed: true,
    });
  });

  it('supports independent runtime kill switches', () => {
    expect(
      getFeatureFlags({
        PUBLIC_FEATURE_PREMIUM_MOTION: 'false',
        PUBLIC_FEATURE_QUICK_VIEW: 'false',
        PUBLIC_FEATURE_MODEL_VIEWER: 'true',
      }),
    ).toMatchObject({
      premiumMotion: false,
      quickView: false,
      modelViewer: true,
    });
  });
});
