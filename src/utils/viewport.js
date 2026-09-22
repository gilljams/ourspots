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
  if (debugEl) writeDebug(vp);
}

let debugEl = null;

function writeDebug(vp) {
  const active = document.activeElement;
  debugEl.textContent = [
    `vh ${vp ? Math.round(vp.height) : '-'}  vt ${vp ? Math.round(vp.offsetTop) : '-'}`,
    `inner ${window.innerHeight}  scrollY ${Math.round(window.scrollY)}`,
    `vpScroll ${vp ? Math.round(vp.pageTop) : '-'}  bodyPos ${document.body.style.position || 'static'}`,
    `focus ${active ? active.tagName.toLowerCase() : 'none'}`,
  ].join('\n');
}

function installDebugOverlay() {
  debugEl = document.createElement('div');
  debugEl.style.cssText = [
    'position:fixed',
    'left:4px',
    'top:calc(var(--app-vt) + 4px)',
    'z-index:99999',
    'background:rgba(0,0,0,.8)',
    'color:#0f0',
    'font:11px/1.35 monospace',
    'white-space:pre',
    'padding:4px 6px',
    'border-radius:4px',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(debugEl);
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

  if (new URLSearchParams(window.location.search).has('vpdebug')) {
    if (document.body) installDebugOverlay();
    else document.addEventListener('DOMContentLoaded', installDebugOverlay, { once: true });
  }

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
