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
 * VOLT instrument field.
 *
 * The hero card reads as a precision measurement instrument observing the
 * product: calibrated rings locked on the subject, one live arc revolving on
 * the outer ring, a faint sweep, a fine grid for scale, a ruler along the
 * bottom edge, and a reticle that answers the pointer. Palette is the store
 * accent system (amber #ff8a3d -> gold #ffc46b) so the layer belongs to the
 * same visual world as the rest of the UI. Nothing here implies telemetry:
 * it is spatial composition, not data.
 */
const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_motion;
uniform float u_strength;
uniform float u_activity;
uniform float u_scroll;

// Store accent tokens (app.css --accent / --accent-2), kept in sync by hand.
const vec3 AMBER = vec3(1.0, 0.541, 0.239);
const vec3 GOLD  = vec3(1.0, 0.769, 0.420);
const vec3 EMBER = vec3(1.0, 0.388, 0.180);
const vec3 FLARE = vec3(1.0, 0.890, 0.720);

const float TAU = 6.28318530718;

float lineAt(float x, float radius, float width) {
  return 1.0 - smoothstep(width, width * 2.4, abs(x - radius));
}

// Wrapped angular distance to an angle.
float angDist(float a, float b) {
  return abs(atan(sin(a - b), cos(a - b)));
}

float hash(vec2 p) {
  return fract(p.x * 1913.7 + p.y * 913.37);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 toAspect = vec2(aspect, 1.0);

  // Early-out for regions no element can reach: keeps the quiet parts of the
  // frame free on fill-rate-limited (including software-rendered) devices.
  float pointerDist = length((uv - u_pointer) * toAspect);
  bool nearPointer = pointerDist < 0.34;
  bool inRulerBand = uv.y < 0.13;
  vec2 focal = vec2(0.5, 0.56);
  vec2 delta = (uv - focal) * toAspect;
  float radius = length(delta);
  bool inField = radius < 0.62;
  if (!inField && !inRulerBand && !nearPointer) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // The product is the measured subject: rings lock to the frame, not to
  // the pointer. The pointer gets its own reticle further down.
  float phase = u_time * u_motion;
  float parallax = u_scroll * 0.045 * u_motion;

  // Vertical edge masks: keep the frame borders quiet.
  float edgeMask = smoothstep(0.015, 0.14, uv.y) * smoothstep(0.985, 0.86, uv.y);
  float radialMask = smoothstep(0.60, 0.12, radius) * smoothstep(0.03, 0.10, radius);

  vec3 signal = vec3(0.0);
  float weight = 0.0;
  vec3 col;
  float a;

  // -- Calibrated rings, live arc and its head marker -------------------
  // Radii stay inside 0.5 * aspect so every ring clears the frame on the
  // horizontal axis (portrait card, aspect ~0.81). The whole polar group is
  // band-gated: pixels outside the ring field skip the atan entirely.
  if (radius < 0.46) {
    float rings =
      lineAt(radius, 0.16, 0.0035) * 0.34 +
      lineAt(radius, 0.27, 0.0035) * 0.22 +
      lineAt(radius, 0.38, 0.0035) * 0.15;
    col = mix(AMBER, GOLD, 0.35);
    a = rings * radialMask * edgeMask;
    signal += col * a;
    weight += a;

    float angle = atan(delta.y, delta.x);
    float arcCenter = phase * 0.40;
    float arc = 1.0 - smoothstep(0.85, 1.30, angDist(angle, arcCenter));
    a = arc * lineAt(radius, 0.38, 0.0035) * 0.50 * radialMask * edgeMask;
    col = EMBER;
    signal += col * a;
    weight += a;

    // Arc head: a small bright marker riding the outer ring.
    vec2 headPos =
      focal + vec2(cos(arcCenter), sin(arcCenter)) * 0.38 / toAspect;
    float headDist = length((uv - headPos) * toAspect);
    a = (1.0 - smoothstep(0.004, 0.020, headDist)) * 0.55 * edgeMask;
    col = GOLD;
    signal += col * a;
    weight += a;
  }

  // -- Fine grid: square cells, fades with distance, drifts on scroll --
  if (radius < 0.55) {
    vec2 guv = (uv - vec2(0.0, parallax)) * toAspect * 17.0;
    vec2 g = abs(fract(guv) - 0.5);
    float grid = 1.0 - smoothstep(0.435, 0.47, max(g.x, g.y));
    a = grid * smoothstep(0.55, 0.10, radius) * 0.085
        * smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x) * edgeMask;
    col = AMBER;
    signal += col * a;
    weight += a;
  }

  // -- Ruler along the bottom edge: the instrument signature -----------
  if (inRulerBand) {
    float rulerX = uv.x * 34.0;
    float tickIndex = floor(rulerX + 0.5);
    float k = abs(fract(rulerX) - 0.5);
    float tick = 1.0 - smoothstep(0.40, 0.46, k);
    float major = step(mod(tickIndex, 4.0), 0.5);
    float rulerTop = mix(0.062, 0.105, major);
    a = tick
        * smoothstep(rulerTop + 0.012, rulerTop - 0.012, uv.y)
        * smoothstep(0.0, 0.018, uv.y)
        * smoothstep(0.0, 0.04, uv.x) * smoothstep(1.0, 0.96, uv.x)
        * 0.20;
    col = mix(AMBER, GOLD, 0.5);
    signal += col * a;
    weight += a;
  }

  // -- Pointer reticle: the operator's mark ----------------------------
  vec2 pd = (uv - u_pointer) * toAspect;
  float ax = abs(pd.x);
  float ay = abs(pd.y);
  float armH = (1.0 - smoothstep(0.004, 0.009, abs(ay - 0.050)))
      * step(0.045, ax) * (1.0 - smoothstep(0.071, 0.076, ax));
  float armV = (1.0 - smoothstep(0.004, 0.009, abs(ax - 0.050)))
      * step(0.045, ay) * (1.0 - smoothstep(0.071, 0.076, ay));
  float reticle = clamp(armH + armV, 0.0, 1.0) * (0.30 + 0.55 * u_activity);
  a = reticle;
  col = GOLD;
  signal += col * a;
  weight += a;

  // Center dot of the reticle.
  a = (1.0 - smoothstep(0.0035, 0.0090, length(pd))) * 0.65;
  col = FLARE;
  signal += col * a;
  weight += a;

  // Entry pulse: one ring expands from the pointer as activity decays.
  float pulseRadius = (1.0 - u_activity) * 0.30;
  a = (1.0 - smoothstep(0.004, 0.014, abs(length(pd) - pulseRadius)))
      * u_activity * 0.40;
  col = GOLD;
  signal += col * a;
  weight += a;

  // Static dither inside signal areas only: kills gradient banding without
  // the shimmer or full-coverage noise of a temporal grain.
  float dither = (hash(floor(gl_FragCoord.xy * 0.5)) - 0.5) * 0.024;
  weight += dither * smoothstep(0.0, 0.06, weight);

  float alpha = clamp(weight, 0.0, 0.9) * u_strength;
  vec3 color = weight > 0.001 ? signal / weight : vec3(0.0);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

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

const FOCAL = {x: 0.5, y: 0.56};

/**
 * Tiny purpose-built WebGL layer for the homepage product composition. It uses
 * one fullscreen triangle, one draw call and no textures. Rendering is lazy,
 * visibility-aware, frame-capped and can be disabled independently at runtime.
 * @param {{strength?: number}} props
 */
export function HeroSignalField({strength = 1}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const features = document.documentElement.dataset.features || '';
    if (!canvas || !features.includes('webglHero')) return undefined;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const constrained =
      window.innerWidth < 720 ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4);
    let dprCap = constrained ? 1 : 1.5;
    // The frame cap starts from the hardware tier and is lowered after the
    // context exists if the renderer turns out to be software rasterization
    // (CI containers, thin clients): real GPUs keep the full rate.
    let fpsCap = reducedMotion ? 0 : constrained ? 24 : 40;
    let gl;
    let program;
    let buffer;
    let uniforms;
    let frame = 0;
    let visible = false;
    let disposed = false;
    let startedAt = 0;
    let lastFrameAt = 0;
    let frameAverage = 0;
    let samples = 0;
    let pointerX = FOCAL.x;
    let pointerY = FOCAL.y;
    let targetX = pointerX;
    let targetY = pointerY;
    let activity = 0;
    let scrollProgress = 0;

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
        powerPreference: constrained ? 'low-power' : 'high-performance',
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
      });
      if (!gl) {
        canvas.dataset.renderState = 'fallback';
        return false;
      }
      const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
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
        resolution: gl.getUniformLocation(program, 'u_resolution'),
        pointer: gl.getUniformLocation(program, 'u_pointer'),
        time: gl.getUniformLocation(program, 'u_time'),
        motion: gl.getUniformLocation(program, 'u_motion'),
        strength: gl.getUniformLocation(program, 'u_strength'),
        activity: gl.getUniformLocation(program, 'u_activity'),
        scroll: gl.getUniformLocation(program, 'u_scroll'),
      };
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      if (!reducedMotion) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo
          ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
          : '';
        if (/swiftshader|software|llvmpipe|basic render/i.test(renderer)) {
          fpsCap = 15;
          canvas.dataset.quality = 'efficient';
        }
      }
      canvas.dataset.renderState = 'ready';
      return true;
    };

    const resize = () => {
      if (!gl) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const render = (time) => {
      frame = 0;
      if (disposed || !visible || document.hidden || !gl || !program) return;
      const interval = fpsCap ? 1000 / fpsCap : Infinity;
      if (lastFrameAt && time - lastFrameAt < interval) {
        frame = requestAnimationFrame(render);
        return;
      }
      if (!startedAt) startedAt = time;
      const delta = lastFrameAt ? time - lastFrameAt : interval;
      lastFrameAt = time;
      if (fpsCap && samples < 120) {
        frameAverage = frameAverage
          ? frameAverage * 0.94 + delta * 0.06
          : delta;
        samples += 1;
        if (samples === 90 && frameAverage > 28 && dprCap > 1) {
          dprCap = 1;
          resize();
          canvas.dataset.quality = 'balanced';
        }
      }
      pointerX += (targetX - pointerX) * 0.12;
      pointerY += (targetY - pointerY) * 0.12;
      activity = Math.max(0, activity - delta / 1400);
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.pointer, pointerX, pointerY);
      gl.uniform1f(uniforms.time, (time - startedAt) / 1000);
      gl.uniform1f(uniforms.motion, reducedMotion ? 0 : 1);
      gl.uniform1f(uniforms.strength, strength);
      gl.uniform1f(uniforms.activity, activity);
      gl.uniform1f(uniforms.scroll, scrollProgress);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (fpsCap) frame = requestAnimationFrame(render);
    };

    const requestRender = () => {
      if (!frame && visible && !document.hidden) {
        frame = requestAnimationFrame(render);
      }
    };
    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      targetX = Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / rect.width),
      );
      targetY =
        1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      activity = 1;
      requestRender();
    };
    const onPointerLeave = () => {
      targetX = FOCAL.x;
      targetY = FOCAL.y;
    };
    const onScroll = () => {
      // Approximate hero scroll progress without a layout read.
      scrollProgress = Math.min(
        1,
        Math.max(0, window.scrollY / window.innerHeight),
      );
    };
    const onVisibility = () => {
      if (document.hidden && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        lastFrameAt = 0;
        requestRender();
      }
    };
    const onContextLost = (event) => {
      event.preventDefault();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      program = null;
      buffer = null;
      uniforms = null;
      canvas.dataset.renderState = 'lost';
    };
    const onContextRestored = () => {
      if (disposed) return;
      gl = null;
      if (createProgram()) {
        resize();
        requestRender();
      }
    };

    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
          return;
        }
        if (!gl && !createProgram()) return;
        resize();
        requestRender();
      },
      {rootMargin: '160px'},
    );
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reducedMotion) requestRender();
    });

    intersection.observe(canvas);
    resizeObserver.observe(canvas);
    canvas.addEventListener('pointermove', onPointerMove, {passive: true});
    canvas.addEventListener('pointerleave', onPointerLeave, {passive: true});
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('scroll', onScroll, {passive: true});

    return () => {
      disposed = true;
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('scroll', onScroll);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      if (frame) cancelAnimationFrame(frame);
      destroyProgram();
      gl = null;
    };
  }, [strength]);

  return (
    <canvas
      aria-hidden="true"
      className="hero-signal-field"
      data-render-state="idle"
      ref={canvasRef}
    />
  );
}
