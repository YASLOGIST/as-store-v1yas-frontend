import {useEffect, useRef} from 'react';

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_motion;
uniform float u_strength;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = v_uv;
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  vec2 focal = mix(vec2(0.58, 0.48), u_pointer, 0.18);
  vec2 delta = (uv - focal) * aspect;
  float radius = length(delta);
  float phase = u_time * 0.34 * u_motion;

  // Sparse selection contours: a restrained spatial cue around the product,
  // not simulated telemetry.
  float contour = 1.0 - smoothstep(0.012, 0.035,
    abs(sin(radius * 31.0 - phase)));
  contour *= smoothstep(0.72, 0.10, radius) * smoothstep(0.05, 0.20, radius);

  vec2 sweepDirection = normalize(vec2(0.82, 0.57));
  float sweepPosition = fract(phase * 0.055) * 2.2 - 0.6;
  float sweep = 1.0 - smoothstep(0.0, 0.055,
    abs(dot(uv, sweepDirection) - sweepPosition));
  sweep *= smoothstep(0.08, 0.48, uv.y) * smoothstep(0.98, 0.58, uv.y);

  vec2 grid = abs(fract((uv + vec2(phase * 0.002, 0.0)) * vec2(12.0, 15.0)) - 0.5);
  float calibration = (1.0 - smoothstep(0.475, 0.5, max(grid.x, grid.y))) * 0.16;
  calibration *= smoothstep(0.85, 0.25, radius);

  float grain = (hash(floor(gl_FragCoord.xy * 0.5) + floor(phase * 5.0)) - 0.5) * 0.028;
  vec3 violet = vec3(0.486, 0.361, 1.0);
  vec3 cyan = vec3(0.133, 0.827, 0.933);
  vec3 color = mix(violet, cyan, clamp(uv.x * 0.9 + uv.y * 0.2, 0.0, 1.0));
  float alpha = (contour * 0.12 + sweep * 0.11 + calibration + grain) * u_strength;
  alpha *= smoothstep(0.02, 0.16, uv.y) * smoothstep(0.02, 0.14, 1.0 - uv.y);
  gl_FragColor = vec4(color * max(alpha, 0.0), max(alpha, 0.0));
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

/**
 * Tiny purpose-built WebGL layer for the homepage product composition. It uses
 * one fullscreen triangle, one draw call and no textures. Rendering is lazy,
 * visibility-aware, frame-capped and can be disabled independently at runtime.
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
    const fpsCap = reducedMotion ? 0 : constrained ? 24 : 40;
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
    let pointerX = 0.58;
    let pointerY = 0.48;
    let targetX = pointerX;
    let targetY = pointerY;

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
      };
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
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
      pointerX += (targetX - pointerX) * 0.08;
      pointerY += (targetY - pointerY) * 0.08;
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.pointer, pointerX, pointerY);
      gl.uniform1f(uniforms.time, (time - startedAt) / 1000);
      gl.uniform1f(uniforms.motion, reducedMotion ? 0 : 1);
      gl.uniform1f(uniforms.strength, strength);
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
      requestRender();
    };
    const onPointerLeave = () => {
      targetX = 0.58;
      targetY = 0.48;
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

    return () => {
      disposed = true;
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
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
