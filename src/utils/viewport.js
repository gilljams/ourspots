/**
 * Single source of truth for the visual viewport, written straight to CSS
 * custom properties on <html>:
 *
 *   --app-vh  height of the area actually visible (shrinks with the keyboard)
 *   --app-vt  how far down that area starts inside the layout viewport
 *
 * Consumers style themselves in pure CSS, so layout follows the keyboard in the
 * same frame instead of waiting for a React render.
 *
 * iOS needs the rAF pass: Safari animates the keyboard without firing an event
 * per frame, and on dismissal it sometimes fires none at all.
 */

let installed = false;
let rafId = null;
let trackUntil = 0;

function write() {
  const vp = window.visualViewport;
  const root = document.documentElement;
  root.style.setProperty('--app-vh', `${vp ? vp.height : window.innerHeight}px`);
  root.style.setProperty('--app-vt', `${vp ? vp.offsetTop : 0}px`);
}

function track(duration = 700) {
  trackUntil = Math.max(trackUntil, performance.now() + duration);
  if (rafId !== null) return;
  const step = () => {
    write();
    if (performance.now() < trackUntil) {
      rafId = requestAnimationFrame(step);
    } else {
      rafId = null;
    }
  };
  rafId = requestAnimationFrame(step);
}

export function installViewportTracking() {
  if (installed) return;
  installed = true;

  write();

  const vp = window.visualViewport;
  if (vp) {
    vp.addEventListener('resize', write);
    vp.addEventListener('scroll', write);
  }
  window.addEventListener('resize', write);
  window.addEventListener('orientationchange', () => track(900));
  window.addEventListener('pageshow', () => track(300));

  // Keyboard opening and closing
  document.addEventListener('focusin', () => track());
  document.addEventListener('focusout', () => track());
}
