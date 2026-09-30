import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

/**
 * React Router 7.9.x Configuration for Hydrogen
 *
 * This configuration uses the official Hydrogen preset to provide optimal
 * React Router settings for Shopify Oxygen deployment. The preset enables
 * validated performance optimizations while ensuring compatibility.
 */
export default {
  presets: [hydrogenPreset()],
  // Opt in while still on v7 so request/data-route changes are exercised before
  // the eventual v8 upgrade rather than arriving as an untested breaking change.
  future: {
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
  },
};

/** @typedef {import('@react-router/dev/config').Config} Config */
