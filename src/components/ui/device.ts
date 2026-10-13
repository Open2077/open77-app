/**
 * Device-capability probes shared by the home page effects. Browser-only: call
 * them from effects, never during render.
 */

/** Device pixel ratio, capped lower on hardware that would struggle with it. */
export function getPixelRatio(max = 2): number {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const cores = navigator.hardwareConcurrency || 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 700px)").matches;
  const constrained = connection?.saveData === true || cores <= 4 || (coarse && narrow);
  return Math.min(window.devicePixelRatio || 1, constrained ? Math.min(max, 1.25) : max);
}

/**
 * The WebGL glitch on the character art only runs in desktop Chromium. Firefox,
 * Safari and touch devices keep the plain image.
 */
export function supportsGlitchFrame(): boolean {
  const ua = navigator.userAgent;
  const excluded =
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches ||
    /Firefox\//.test(ua) ||
    (/Safari\//.test(ua) && !/Chrome\/|Chromium\//.test(ua));
  return !excluded && /Chrome\/|Chromium\//.test(ua);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
