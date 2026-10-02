import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  MODEL_VIEWER_MODULE,
  isModelViewerDefined,
  loadModelViewer,
  resetModelViewerLoader,
} from './modelViewerLoader';

/** Minimal script-element and registry doubles: enough to assert ordering. */
function installDom({defined = false} = {}) {
  const scripts = [];
  const registry = new Map();
  const pending = [];

  globalThis.customElements = {
    get: (name) => registry.get(name),
    whenDefined: (name) =>
      registry.has(name)
        ? Promise.resolve(registry.get(name))
        : new Promise((resolve) => pending.push({name, resolve})),
  };
  if (defined) registry.set('model-viewer', class {});

  const makeScript = () => ({
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
  });

  globalThis.document = {
    head: {append: (node) => scripts.push(node)},
    createElement: () => makeScript(),
    querySelector: (selector) =>
      selector.includes(MODEL_VIEWER_MODULE) ? (scripts[0] ?? null) : null,
  };

  return {
    scripts,
    define() {
      registry.set('model-viewer', class {});
      pending
        .filter((entry) => entry.name === 'model-viewer')
        .forEach((entry) => entry.resolve());
    },
    fail() {
      scripts[0]?.listeners.error?.();
    },
  };
}

afterEach(() => {
  resetModelViewerLoader();
  delete globalThis.customElements;
  delete globalThis.document;
  vi.restoreAllMocks();
});

describe('loadModelViewer', () => {
  it('resolves immediately when the element is already registered', async () => {
    const dom = installDom({defined: true});
    await expect(loadModelViewer()).resolves.toBeUndefined();
    expect(dom.scripts).toHaveLength(0);
    expect(isModelViewerDefined()).toBe(true);
  });

  it('injects the pinned module exactly once for concurrent mounts', async () => {
    const dom = installDom();
    const first = loadModelViewer();
    const second = loadModelViewer();
    expect(dom.scripts).toHaveLength(1);
    expect(dom.scripts[0].src).toBe(MODEL_VIEWER_MODULE);
    expect(dom.scripts[0].type).toBe('module');
    dom.define();
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  });

  it('resolves a late mount whose script tag already finished loading', async () => {
    const dom = installDom();
    const first = loadModelViewer();
    dom.define();
    await first;
    resetModelViewerLoader();
    // The script `load` event will never fire again — registration must gate.
    await expect(loadModelViewer()).resolves.toBeUndefined();
    expect(dom.scripts).toHaveLength(1);
  });

  it('rejects on a CDN failure and allows a later retry', async () => {
    const dom = installDom();
    const attempt = loadModelViewer();
    dom.fail();
    await expect(attempt).rejects.toThrow('model-viewer-unavailable');
    const retry = loadModelViewer();
    dom.define();
    await expect(retry).resolves.toBeUndefined();
  });

  it('rejects without a dom instead of throwing synchronously', async () => {
    delete globalThis.document;
    delete globalThis.customElements;
    await expect(loadModelViewer()).rejects.toThrow('model-viewer-no-dom');
  });
});
