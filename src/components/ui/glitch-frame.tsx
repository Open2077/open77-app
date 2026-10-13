"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { getPixelRatio, prefersReducedMotion, supportsGlitchFrame } from "./device";

import styles from "./glitch-frame.module.css";

/*
 * Scroll velocity, shared by every frame on the page.
 *
 * One listener tracks how fast the page scrolls; frames read the smoothed value
 * to tear their image along the scroll axis. Resizing suspends everything for a
 * moment so a window drag does not trigger the effect.
 */

const velocityListeners = new Set<() => void>();
const resizeListeners = new Set<() => void>();
const scrollVelocity = { x: 0, y: 0 };
let tracking = false;
let velocityFrame = 0;
let lastScrollY = 0;
let smoothed = 0;
let moving = false;
let resizing = false;
let resizeTimer = 0;
let settleUntil = 0;

const notifyVelocity = () => velocityListeners.forEach((listener) => listener());
const notifyResize = () => resizeListeners.forEach((listener) => listener());

function isSettling() {
  return resizing || performance.now() < settleUntil;
}

function resetVelocity() {
  smoothed = 0;
  scrollVelocity.x = 0;
  scrollVelocity.y = 0;
  moving = false;
  if (velocityFrame) {
    window.cancelAnimationFrame(velocityFrame);
    velocityFrame = 0;
  }
}

function onScroll() {
  if (isSettling()) {
    lastScrollY = window.scrollY;
    return;
  }
  if (!velocityFrame) velocityFrame = window.requestAnimationFrame(stepVelocity);
}

function onResize() {
  window.clearTimeout(resizeTimer);
  lastScrollY = window.scrollY;
  resetVelocity();
  if (!resizing) {
    resizing = true;
    notifyResize();
  }
  resizeTimer = window.setTimeout(() => {
    resizing = false;
    lastScrollY = window.scrollY;
    settleUntil = performance.now() + 280;
    window.requestAnimationFrame(() => {
      lastScrollY = window.scrollY;
      window.requestAnimationFrame(() => {
        lastScrollY = window.scrollY;
        notifyResize();
      });
    });
  }, 180);
}

function stepVelocity() {
  if (isSettling()) {
    lastScrollY = window.scrollY;
    resetVelocity();
    notifyVelocity();
    return;
  }
  const scrollY = window.scrollY;
  const delta = scrollY - lastScrollY;
  lastScrollY = scrollY;
  const target = Math.max(-1, Math.min(1, delta / 20));
  const rate = Math.abs(target) > Math.abs(smoothed) ? 0.38 : 0.07;
  smoothed += (target - smoothed) * rate;
  if (Math.abs(smoothed) > 0.02 || Math.abs(delta) > 0.5) moving = true;
  else if (Math.abs(smoothed) < 0.008 && Math.abs(delta) < 0.2) moving = false;
  // Pages that scroll sideways (the home track) mark it on <html data-scroll>.
  if (document.documentElement.dataset.scroll === "horizontal") {
    scrollVelocity.x = moving ? smoothed : 0;
    scrollVelocity.y = 0;
  } else {
    scrollVelocity.x = 0;
    scrollVelocity.y = moving ? -smoothed : 0;
  }
  if (!moving) {
    resetVelocity();
    notifyVelocity();
    return;
  }
  notifyVelocity();
  velocityFrame = window.requestAnimationFrame(stepVelocity);
}

/* The renderer: a full-screen quad sampling the image through the glitch shader. */

const VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform sampler2D uMap;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform vec2 uScroll;
uniform float uTime;
uniform float uAmount;
uniform float uDiameter;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 pixel = (vUv - uMouse) * uResolution;
  float reach = uDiameter * 0.5;
  float mask = smoothstep(reach, reach * 0.15, length(pixel)) * uAmount;
  float scrollMag = length(uScroll);

  if (mask <= 0.001 && scrollMag <= 0.001) {
    gl_FragColor = texture2D(uMap, vUv);
    return;
  }

  vec2 uv = vUv;
  float tick = floor(uTime * 18.0);
  float row = floor(uv.y * uResolution.y);

  if (mask > 0.001) {
    float n = hash(vec2(row, tick));
    float slice = step(0.55, n);
    uv.x += (n - 0.5) * slice * mask * (22.0 / uResolution.x);

    vec2 block = 6.0 / uResolution;
    vec2 snapped = (floor(uv / block) + 0.5) * block;
    float chunk = step(0.4, hash(vec2(floor(uv.x * uResolution.x / 6.0), row + tick)));
    uv = mix(uv, snapped, chunk * mask);
  }

  if (scrollMag > 0.001) {
    float scrollTick = floor(uTime * 24.0);
    float band = floor(row / 3.0);
    float n = hash(vec2(band, scrollTick));
    float slice = step(0.72, n);
    float amp = (n - 0.5) * slice;

    uv.x += uScroll.x * amp * (14.0 / uResolution.x);
    uv.y += uScroll.y * amp * (10.0 / uResolution.y);
  }

  vec2 shift = vec2(mask * (11.0 / uResolution.x), 0.0);
  shift.x += uScroll.x * (4.5 / uResolution.x);
  shift.y += uScroll.y * (3.5 / uResolution.y);

  vec2 baseUv = clamp(uv, 0.0, 1.0);
  vec4 base = texture2D(uMap, baseUv);
  vec4 red = texture2D(uMap, clamp(baseUv + shift, 0.0, 1.0));
  vec4 blue = texture2D(uMap, clamp(baseUv - shift, 0.0, 1.0));

  gl_FragColor = vec4(vec3(red.r, base.g, blue.b), base.a);
}
`;

type GlitchRenderer = {
  needsResize(): boolean;
  resize(): boolean;
  invalidate(): void;
  render(
    time: number,
    mouseX: number,
    mouseY: number,
    amount: number,
    diameter: number,
    scrollX: number,
    scrollY: number,
  ): boolean;
  dispose(): void;
};

async function createRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement): Promise<GlitchRenderer> {
  const THREE = await import("three");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    premultipliedAlpha: false,
  });
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(getPixelRatio());

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  const texture = new THREE.Texture();
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = false;

  const mouse = new THREE.Vector2(0.5, 0.5);
  const scroll = new THREE.Vector2(0, 0);
  const resolution = new THREE.Vector2(1, 1);
  const uniforms = {
    uMap: { value: texture },
    uMouse: { value: mouse },
    uResolution: { value: resolution },
    uScroll: { value: scroll },
    uTime: { value: 0 },
    uAmount: { value: 0 },
    uDiameter: { value: 500 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    premultipliedAlpha: false,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));

  let uploaded = false;
  let textureWidth = 0;
  let textureHeight = 0;
  let sourceWidth = 0;
  let width = 0;
  let height = 0;
  let ratio = 0;

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return false;
    const pixelRatio = getPixelRatio();
    resolution.set(w, h);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    if (width === w && height === h && ratio === pixelRatio) return false;
    width = w;
    height = h;
    ratio = pixelRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    uploaded = false;
    return true;
  };

  // The image is redrawn into a canvas at the backing-store size, so the shader
  // samples exactly what the <img> shows.
  const upload = () => {
    if (!image.complete || image.naturalWidth === 0) return false;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return false;
    if (uploaded && textureWidth === w && textureHeight === h && sourceWidth === image.naturalWidth) return true;
    if (textureWidth !== 0) texture.dispose();
    const source = document.createElement("canvas");
    source.width = Math.max(1, Math.round(w));
    source.height = Math.max(1, Math.round(h));
    const context = source.getContext("2d");
    if (context) {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, source.width, source.height);
    }
    texture.image = source;
    texture.needsUpdate = true;
    textureWidth = w;
    textureHeight = h;
    sourceWidth = image.naturalWidth;
    uploaded = true;
    return true;
  };

  return {
    needsResize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const pixelRatio = getPixelRatio();
      return w !== 0 && h !== 0 && (width !== w || height !== h || ratio !== pixelRatio);
    },
    resize,
    invalidate() {
      uploaded = false;
    },
    render(time, mouseX, mouseY, amount, diameter, scrollX, scrollY) {
      resize();
      if (!upload()) return false;
      mouse.set(mouseX, mouseY);
      scroll.set(scrollX, scrollY);
      uniforms.uTime.value = time;
      uniforms.uAmount.value = amount;
      uniforms.uDiameter.value = diameter;
      renderer.render(scene, camera);
      return true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

/**
 * Wraps a character image. Hovering it tears the pixels around the cursor with
 * an RGB split, and scrolling shears it along the scroll axis. The canvas only
 * shows while the effect is running; the image underneath is the resting state.
 */
export function GlitchFrame({ children, diameter = 260 }: { children: ReactNode; diameter?: number }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const diameterRef = useRef(diameter);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    diameterRef.current = diameter;
  }, [diameter]);

  useEffect(() => {
    // Capability detection needs the browser; the server renders the plain image.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(supportsGlitchFrame());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const image = frame?.querySelector("img") ?? null;
    if (!frame || !canvas || !image || prefersReducedMotion()) return;

    if (!tracking) {
      tracking = true;
      lastScrollY = window.scrollY;
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
    }

    let disposed = false;
    let raf = 0;
    let running = false;
    let hovering = false;
    let visible = false;
    let renderer: GlitchRenderer | null = null;
    let loading: Promise<void> | null = null;
    const target = { x: 0.5, y: 0.5 };
    const current = { x: 0.5, y: 0.5 };
    const pointer = { x: 0, y: 0 };
    let amount = 0;
    let resizePending = false;

    const setVisible = (next: boolean) => {
      if (visible === next) return;
      visible = next;
      if (styles.visible) canvas.classList.toggle(styles.visible, next);
      if (styles.live) frame.classList.toggle(styles.live, next);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const scrolling = () => Math.hypot(scrollVelocity.x, scrollVelocity.y) > 0.008;
    const inViewport = () => {
      const rect = frame.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    };

    const tick = (time: number) => {
      if (!running || disposed || !renderer) return;
      if (resizing) {
        stop();
        setVisible(false);
        return;
      }
      const sheared = scrolling() && !isSettling();
      if (!hovering && sheared && !inViewport()) {
        stop();
        setVisible(false);
        return;
      }
      if (hovering && sheared) aim(false);
      current.x += (target.x - current.x) * 0.65;
      current.y += (target.y - current.y) * 0.65;
      if (!visible) {
        const drawn = renderer.render(time * 0.001, current.x, current.y, 0, diameterRef.current, scrollVelocity.x, scrollVelocity.y);
        if (drawn) setVisible(true);
        if (hovering || sheared || drawn) raf = requestAnimationFrame(tick);
        else stop();
        return;
      }
      amount += (Number(hovering) - amount) * (hovering ? 0.28 : 0.14);
      renderer.render(time * 0.001, current.x, current.y, amount, diameterRef.current, scrollVelocity.x, scrollVelocity.y);
      if (!hovering && amount < 0.015 && !sheared) {
        amount = 0;
        stop();
        setVisible(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || !renderer || document.hidden || resizing) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const ensureRenderer = () =>
      renderer
        ? Promise.resolve()
        : (loading ??= createRenderer(canvas, image).then((created) => {
            if (disposed) created.dispose();
            else {
              renderer = created;
              renderer.resize();
            }
          }));
    const wake = () => {
      if (resizing) return;
      ensureRenderer()
        .then(() => {
          if (disposed || resizing) return;
          if (!hovering && amount <= 0 && (isSettling() || !scrolling())) return;
          start();
        })
        .catch(() => setVisible(false));
    };
    const aim = (snap: boolean) => {
      const rect = image.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      target.x = Math.min(1, Math.max(0, (pointer.x - rect.left) / rect.width));
      target.y = Math.min(1, Math.max(0, 1 - (pointer.y - rect.top) / rect.height));
      if (snap) {
        current.x = target.x;
        current.y = target.y;
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      aim(false);
    };
    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      hovering = true;
      onPointerMove(event);
      if (!resizing) wake();
    };
    const onPointerLeave = () => {
      hovering = false;
      if (!resizing && renderer) start();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      stop();
      setVisible(false);
    };
    const onVisibility = () => {
      if (document.hidden || resizing) stop();
      else if (hovering || amount > 0.015 || (scrolling() && !isSettling())) start();
    };
    const onImageLoad = () => {
      renderer?.invalidate();
      renderer?.resize();
    };
    const applyResize = () => {
      if (!renderer) {
        resizePending = false;
        if (hovering && !resizing) wake();
        return;
      }
      if (!renderer.needsResize()) {
        resizePending = false;
        if (hovering && !running && !resizing) wake();
        return;
      }
      stop();
      setVisible(false);
      renderer.resize();
      resizePending = false;
      if (hovering && !resizing) {
        aim(true);
        wake();
      }
    };
    const onVelocity = () => {
      if (resizing) {
        stop();
        setVisible(false);
        resizePending = true;
        return;
      }
      if (isSettling()) return;
      if (scrolling()) {
        if (!hovering && !inViewport()) {
          if (running) {
            stop();
            setVisible(false);
          }
          return;
        }
        if (renderer) start();
        else wake();
        return;
      }
      if (resizePending) applyResize();
      if (hovering) aim(true);
      if (!running && (hovering || amount > 0.015)) wake();
    };
    const onResizeState = () => {
      if (resizing) {
        stop();
        setVisible(false);
        resizePending = true;
        return;
      }
      applyResize();
    };
    const observer = new ResizeObserver(() => {
      if (resizing || scrolling()) {
        resizePending = true;
        return;
      }
      applyResize();
    });

    observer.observe(frame);
    velocityListeners.add(onVelocity);
    resizeListeners.add(onResizeState);
    frame.addEventListener("pointerenter", onPointerEnter);
    frame.addEventListener("pointermove", onPointerMove);
    frame.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("webglcontextlost", onContextLost);
    image.addEventListener("load", onImageLoad);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      stop();
      setVisible(false);
      observer.disconnect();
      velocityListeners.delete(onVelocity);
      resizeListeners.delete(onResizeState);
      frame.removeEventListener("pointerenter", onPointerEnter);
      frame.removeEventListener("pointermove", onPointerMove);
      frame.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      image.removeEventListener("load", onImageLoad);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer?.dispose();
    };
  }, [enabled]);

  return (
    <div ref={frameRef} className={styles.frame}>
      {children}
      {enabled ? <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" /> : null}
    </div>
  );
}
