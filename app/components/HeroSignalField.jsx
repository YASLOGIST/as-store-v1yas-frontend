import {useEffect, useRef} from 'react';

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Fragment program for the hero "instrument viewport".
 *
 * Art direction: the storefront accent is amber (#ff8a3d -> #ffc46b) on
 * graphite. The field reads as calibrated optics sitting in front of merchant
 * photography — selection contours, a calibration lattice, one travelling
 * measurement band and a rim that ignites near the pointer. No second hue is
 * introduced, so the layer never competes with the product.
 *
 * Cost control: one fullscreen triangle, no textures, no loops, no dynamic
 * branching. `SMOOTH_LINES` is injected at compile time when
 * OES_standard_derivatives is present, so line widths resolve in screen space
 * instead of UV space (crisp at any DPR) without a runtime branch.
 */
const FRAGMENT_SHADER = `
precision mediump float;

varying vec2 v_uv;

uniform vec2 u_aspect;    // (width/height, 1.0), computed once per resize
uniform vec2 u_pointer;   // smoothed pointer, 0..1
uniform float u_time;     // seconds, already multiplied by motion on the CPU
uniform float u_focus;    // 0 = pointer away, 1 = pointer engaged
uniform float u_strength; // art-direction gain from the route

const vec2 SWEEP_AXIS = vec2(0.8211, 0.5708); // normalize(vec2(0.82, 0.57))
const vec3 EMBER = vec3(1.0, 0.541, 0.239);   // #ff8a3d
const vec3 FLARE = vec3(1.0, 0.769, 0.420);   // #ffc46b

#ifdef SMOOTH_LINES
// Screen-space line: constant apparent weight regardless of resolution.
float lineMask(float field, float weight) {
  float w = fwidth(field) * weight;
  return 1.0 - smoothstep(0.0, w, abs(field));
}
#else
float lineMask(float field, float weight) {
  return 1.0 - smoothstep(0.0, weight * 0.011, abs(field));
}
#endif

// Cheap, well-distributed hash (no transcendentals) used only for dithering.
float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = v_uv;

  // The focal point leans toward the pointer but never fully tracks it: the
  // field keeps its composition instead of chasing the cursor.
  vec2 focal = mix(vec2(0.56, 0.52), u_pointer, 0.22 + 0.10 * u_focus);
  vec2 delta = (uv - focal) * u_aspect;
  float radius = length(delta);
  float t = u_time;

  // 1. Selection contours — concentric rings that tighten around the pointer.
  // Mostly dormant until the pointer engages: the ring is a response, not decor.
  float rings = sin(radius * 26.0 - t * 1.6);
  float contour = lineMask(rings, 1.3);
  contour *= smoothstep(0.58, 0.10, radius) * smoothstep(0.03, 0.14, radius);
  contour *= 0.34 + 0.66 * u_focus;

  // 2. Calibration lattice — pushed to the periphery so the product centre
  // stays optically clean.
  vec2 cell = uv * vec2(13.0, 17.0) + vec2(t * 0.045, 0.0);
  vec2 g = abs(fract(cell) - 0.5);
  float lattice = lineMask(0.5 - max(g.x, g.y), 1.0);
  lattice *= smoothstep(0.30, 0.86, radius) * 0.085;

  // 3. Measurement band — one slow raking highlight along a fixed diagonal.
  float axis = dot(uv, SWEEP_AXIS);
  float sweepPos = fract(t * 0.045) * 2.0 - 0.45;
  float band = exp2(-abs(axis - sweepPos) * 48.0);
  band *= smoothstep(0.02, 0.38, uv.y) * smoothstep(1.0, 0.62, uv.y);

  // 4. Rim ignition — the frame edge warms where the pointer approaches it.
  vec2 edge = min(uv, 1.0 - uv);
  float rim = exp2(-min(edge.x, edge.y) * 86.0);
  rim *= smoothstep(0.92, 0.18, radius) * (0.35 + 0.65 * u_focus);

  // 5. Presence bloom — short-falloff warmth, only while engaged.
  float bloom = exp2(-radius * 3.4) * 0.085 * u_focus;

  float energy = clamp(band + contour * 0.55 + rim, 0.0, 1.0);
  vec3 color = mix(EMBER, FLARE, energy);

  float alpha = contour * 0.12 + band * 0.095 + lattice + rim * 0.075 + bloom;

  // Legibility guard: the caption plate sits in the lower band of the frame,
  // so the field steps back there instead of layering texture under type.
  alpha *= mix(0.22, 1.0, smoothstep(0.04, 0.34, uv.y));

  // Temporal dither: kills 8-bit banding in the soft falloffs.
  alpha += (hash(floor(gl_FragCoord.xy) + floor(t * 8.0)) - 0.5) * 0.02;

  // Only the outermost sliver is faded, so the rim survives.
  alpha *= smoothstep(0.0, 0.035, uv.y) * smoothstep(0.0, 0.03, 1.0 - uv.y);
  alpha = clamp(alpha * u_strength, 0.0, 1.0);

  gl_FragColor = vec4(color * alpha, alpha); // premultiplied
}
`;

const HOME_X = 0.56;
const HOME_Y = 0.52;

/** CPU rasterisers: a fullscreen fragment program is genuinely expensive here,
 * so the field drops to its cheapest tier instead of competing with layout. */
const SOFTWARE_RENDERER =
  /swiftshader|llvmpipe|softwarerasterizer|basic render|software adapter/i;

function detectSoftwareRenderer(gl) {
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info
      ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return SOFTWARE_RENDERER.test(String(renderer));
  } catch {
    return false;
  }
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Purpose-built WebGL layer for the homepage product composition: one
 * fullscreen triangle, one program, one draw call, zero textures.
 *
 * Runtime discipline
 * - Rendering starts only when the canvas intersects the viewport and stops on
 *   exit, tab hide and context loss.
 * - The hot loop allocates nothing and writes no React state; uniforms that
 *   cannot change between frames are uploaded only when they actually change.
 * - Quality is adaptive in both directions: sustained long frames step the
 *   device pixel ratio and the frame cap down, sustained headroom restores one
 *   step, with hysteresis so it cannot oscillate.
 * - Teardown deletes the buffer and program and explicitly releases the drawing
 *   buffer through WEBGL_lose_context.
 *
 * @param {{strength?: number}} props
 */
export function HeroSignalField({strength = 1}) {
  const canvasRef = useRef(null);
  const strengthRef = useRef(strength);
  strengthRef.current = strength;

  useEffect(() => {
    const canvas = canvasRef.current;
    const features = document.documentElement.dataset.features || '';
    if (!canvas || !features.includes('webglHero')) return undefined;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const constrained =
      window.innerWidth < 720 ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4);

    // Ladder walked by the adaptive controller. Index 0 is the best quality
    // this device is allowed to attempt.
    const ladder = constrained
      ? [
          {dpr: 1, fps: 24},
          {dpr: 0.8, fps: 20},
          {dpr: 0.6, fps: 18},
        ]
      : [
          {dpr: 1.25, fps: 40},
          {dpr: 1, fps: 32},
          {dpr: 0.8, fps: 24},
          {dpr: 0.6, fps: 18},
        ];

    let tier = 0;
    let tierFloor = 0; // best tier this device is allowed to climb back to
    let reducedMotion = motionQuery.matches;
    let gl = null;
    let program = null;
    let buffer = null;
    let uniforms = null;
    let loseContext = null;
    let frame = 0;
    let resizeFrame = 0;
    let visible = false;
    let disposed = false;
    let contextLost = false;
    let startedAt = 0;
    let lastFrameAt = 0;
    let clock = 0; // motion-scaled time, so pausing motion never jumps
    let costAverage = 0;
    let overBudget = 0;
    let underBudget = 0;
    let pointerX = HOME_X;
    let pointerY = HOME_Y;
    let targetX = HOME_X;
    let targetY = HOME_Y;
    let focus = 0;
    let targetFocus = 0;
    // Dirty flags: these uniforms are uploaded only when they change.
    let aspectDirty = true;
    let strengthDirty = true;
    let uploadedStrength = -1;

    const destroyProgram = () => {
      if (!gl) return;
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      buffer = null;
      program = null;
      uniforms = null;
    };

    const createProgram = () => {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: constrained ? 'low-power' : 'high-performance',
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      });
      if (!gl) {
        canvas.dataset.renderState = 'fallback';
        return false;
      }

      // Compile-time feature select: no per-fragment branch, no second program.
      const derivatives = gl.getExtension('OES_standard_derivatives');
      const fragmentSource = derivatives
        ? `#extension GL_OES_standard_derivatives : enable\n#define SMOOTH_LINES\n${FRAGMENT_SHADER}`
        : FRAGMENT_SHADER;

      const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
      if (!vertex || !fragment) {
        if (vertex) gl.deleteShader(vertex);
        if (fragment) gl.deleteShader(fragment);
        canvas.dataset.renderState = 'fallback';
        return false;
      }

      program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        destroyProgram();
        canvas.dataset.renderState = 'fallback';
        return false;
      }

      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      gl.useProgram(program);
      const position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      uniforms = {
        aspect: gl.getUniformLocation(program, 'u_aspect'),
        pointer: gl.getUniformLocation(program, 'u_pointer'),
        time: gl.getUniformLocation(program, 'u_time'),
        focus: gl.getUniformLocation(program, 'u_focus'),
        strength: gl.getUniformLocation(program, 'u_strength'),
      };

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.STENCIL_TEST);
      gl.disable(gl.SCISSOR_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      loseContext = gl.getExtension('WEBGL_lose_context');
      if (detectSoftwareRenderer(gl)) {
        tierFloor = ladder.length - 1;
        tier = tierFloor;
        canvas.dataset.renderer = 'software';
      }
      contextLost = false;
      aspectDirty = true;
      strengthDirty = true;
      uploadedStrength = -1;
      costAverage = 0;
      overBudget = 0;
      underBudget = 0;
      canvas.dataset.renderState = 'ready';
      canvas.dataset.quality = tier === 0 ? 'full' : 'balanced';
      resize();
      return true;
    };

    const resize = () => {
      if (!gl || contextLost) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // Hard device cap first, then the art-directed tier cap.
      const dpr = Math.min(window.devicePixelRatio || 1, 2, ladder[tier].dpr);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        aspectDirty = true;
      }
    };

    const applyTier = (next) => {
      if (next === tier || next < tierFloor || next >= ladder.length) return;
      tier = next;
      costAverage = 0;
      overBudget = 0;
      underBudget = 0;
      canvas.dataset.quality = tier === 0 ? 'full' : 'balanced';
      resize();
    };

    const render = (time) => {
      frame = 0;
      if (disposed || contextLost || !visible || document.hidden) return;
      if (!gl || !program) return;

      const fpsCap = reducedMotion ? 0 : ladder[tier].fps;
      const interval = fpsCap ? 1000 / fpsCap : Infinity;
      if (lastFrameAt && time - lastFrameAt < interval - 0.5) {
        frame = requestAnimationFrame(render);
        return;
      }
      if (!startedAt) startedAt = time;
      const delta = lastFrameAt ? Math.min(time - lastFrameAt, 100) : interval;
      lastFrameAt = time;

      // Adaptive quality. `delta` includes the throttle wait, so the signal is
      // how far the real frame overruns its own budget, not raw frame time.
      if (fpsCap) {
        costAverage = costAverage ? costAverage * 0.9 + delta * 0.1 : delta;
        if (costAverage > interval * 1.6) {
          overBudget += 1;
          underBudget = 0;
          if (overBudget > 45) applyTier(tier + 1);
        } else if (costAverage < interval * 1.12) {
          underBudget += 1;
          overBudget = 0;
          if (underBudget > 420) applyTier(tier - 1);
        }
      }

      // Frame-rate independent easing: identical feel at 24fps and 48fps.
      const step = delta * 0.001;
      const ease = 1 - Math.exp(-step * 7.5);
      pointerX += (targetX - pointerX) * ease;
      pointerY += (targetY - pointerY) * ease;
      focus += (targetFocus - focus) * (1 - Math.exp(-step * 4.5));
      clock += reducedMotion ? 0 : step;

      if (aspectDirty) {
        gl.uniform2f(
          uniforms.aspect,
          canvas.width / Math.max(canvas.height, 1),
          1,
        );
        aspectDirty = false;
      }
      if (strengthDirty || uploadedStrength !== strengthRef.current) {
        uploadedStrength = strengthRef.current;
        gl.uniform1f(uniforms.strength, uploadedStrength);
        strengthDirty = false;
      }
      gl.uniform2f(uniforms.pointer, pointerX, pointerY);
      gl.uniform1f(uniforms.time, clock);
      gl.uniform1f(uniforms.focus, focus);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (fpsCap) {
        frame = requestAnimationFrame(render);
      } else if (
        Math.abs(targetX - pointerX) > 0.001 ||
        Math.abs(targetY - pointerY) > 0.001 ||
        Math.abs(targetFocus - focus) > 0.01
      ) {
        // Reduced motion: still settle the pointer response, then stop.
        frame = requestAnimationFrame(render);
      }
    };

    const requestRender = () => {
      if (!frame && visible && !document.hidden && !contextLost) {
        frame = requestAnimationFrame(render);
      }
    };
    const stopRender = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetX = Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / rect.width),
      );
      targetY =
        1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      targetFocus = 1;
      requestRender();
    };
    const onPointerLeave = () => {
      targetX = HOME_X;
      targetY = HOME_Y;
      targetFocus = 0;
      requestRender();
    };
    const onVisibility = () => {
      if (document.hidden) {
        stopRender();
      } else {
        lastFrameAt = 0;
        requestRender();
      }
    };
    const onMotionChange = (event) => {
      reducedMotion = event.matches;
      lastFrameAt = 0;
      requestRender();
    };
    const onContextLost = (event) => {
      event.preventDefault();
      contextLost = true;
      stopRender();
      program = null;
      buffer = null;
      uniforms = null;
      loseContext = null;
      canvas.dataset.renderState = 'lost';
    };
    const onContextRestored = () => {
      if (disposed) return;
      gl = null;
      startedAt = 0;
      lastFrameAt = 0;
      if (createProgram()) {
        resize();
        requestRender();
      }
    };

    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          stopRender();
          return;
        }
        if (!gl && !createProgram()) return;
        lastFrameAt = 0;
        resize();
        requestRender();
      },
      {rootMargin: '160px'},
    );

    // Resize is coalesced to one rAF: layout thrash during window drags cannot
    // trigger repeated drawing-buffer reallocation.
    const resizeObserver = new ResizeObserver(() => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        resize();
        requestRender();
      });
    });

    intersection.observe(canvas);
    resizeObserver.observe(canvas);
    canvas.addEventListener('pointermove', onPointerMove, {passive: true});
    canvas.addEventListener('pointerleave', onPointerLeave, {passive: true});
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    document.addEventListener('visibilitychange', onVisibility);
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', onMotionChange);
    }

    return () => {
      disposed = true;
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', onMotionChange);
      }
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      stopRender();
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      destroyProgram();
      // Release the drawing buffer now instead of waiting for GC of the canvas.
      if (loseContext) loseContext.loseContext();
      loseContext = null;
      gl = null;
    };
    // The GL context is created once. `strength` is read through a ref inside
    // the loop, so changing it never rebuilds the context.
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="hero-signal-field"
      data-render-state="idle"
      ref={canvasRef}
    />
  );
}
