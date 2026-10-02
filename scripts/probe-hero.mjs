// Programmatic probe of the WebGL hero: render state, pixel palette,
// frame pacing, and interaction response. No vision required.
import {chromium} from '@playwright/test';
import {chromiumArgs, chromiumExecutable} from './prepare-chromium.mjs';

const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:3000';
const browser = await chromium.launch({
  executablePath: chromiumExecutable,
  args: chromiumArgs,
});
const page = await browser.newPage({viewport: {width: 1440, height: 960}});
// Force preserveDrawingBuffer so readPixels can sample the live frame.
await page.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, options) {
    return original.call(this, type, {...options, preserveDrawingBuffer: true});
  };
});
await page.goto(BASE + '/', {waitUntil: 'networkidle'}).catch(() => {});
await page.waitForTimeout(2500);

const probe = await page.evaluate(() => {
  const canvas = document.querySelector('.hero-signal-field');
  const out = {exists: !!canvas};
  if (!canvas) return out;
  out.renderState = canvas.dataset.renderState;
  out.quality = canvas.dataset.quality || null;
  out.cssOpacity = getComputedStyle(canvas).opacity;
  out.box = canvas.getBoundingClientRect().toJSON();
  const gl = canvas.getContext('webgl');
  if (!gl) {
    out.gl = 'context-unavailable-for-probe';
    return out;
  }
  // Read center region pixels of the live canvas.
  const w = canvas.width,
    h = canvas.height;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let sumR = 0,
    sumG = 0,
    sumB = 0,
    opaque = 0,
    total = w * h;
  let maxA = 0;
  for (let i = 0; i < total; i++) {
    const a = px[i * 4 + 3];
    if (a > 8) {
      sumR += px[i * 4];
      sumG += px[i * 4 + 1];
      sumB += px[i * 4 + 2];
      opaque++;
    }
    if (a > maxA) maxA = a;
  }
  out.pixels = {
    total,
    nonTransparent: opaque,
    coveragePct: +((opaque / total) * 100).toFixed(2),
    avgColor: opaque
      ? [
          Math.round(sumR / opaque),
          Math.round(sumG / opaque),
          Math.round(sumB / opaque),
        ]
      : null,
    maxAlpha: maxA,
  };
  out.devicePixelRatio = window.devicePixelRatio;
  out.hwConcurrency = navigator.hardwareConcurrency;
  out.features = document.documentElement.dataset.features;
  return out;
});
console.warn(JSON.stringify(probe, null, 2));

// Frame pacing probe around the hero.
const pacing = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const frames = [];
      let last = performance.now();
      const tick = (t) => {
        frames.push(t - last);
        last = t;
        if (frames.length < 90) requestAnimationFrame(tick);
        else {
          frames.sort((a, b) => a - b);
          resolve({
            median: +frames[45].toFixed(1),
            p95: +frames[85].toFixed(1),
            max: +frames[89].toFixed(1),
          });
        }
      };
      requestAnimationFrame(tick);
    }),
);
console.warn('pacing', JSON.stringify(pacing));

await browser.close();
