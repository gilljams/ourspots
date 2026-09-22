import { useEffect } from 'react';
import { useBodyScrollLock } from './useBodyScrollLock';

/**
 * Styling for a fullscreen modal that has to survive the iOS keyboard.
 *
 * Returns plain CSS referencing the app-wide viewport variables (utils/viewport.js),
 * so the browser resizes the modal directly. Nothing here lives in React state -
 * that is deliberate, it is what keeps the modal in step with the keyboard
 * rather than a few frames behind it.
 *
 * @param {Object} options
 * @param {string} [options.bgColor='#111827'] - Background applied to body while locked
 * @param {number} [options.headerHeight=52] - Fixed header height to subtract from content
 * @param {number} [options.toolbarHeight=0] - Additional fixed chrome to subtract
 * @param {boolean} [options.lockBody=true] - Lock background scrolling
 * @param {boolean} [options.safeArea=true] - Offset for the notch/status bar
 * @param {Function} [options.onCleanup] - Extra cleanup to run on unmount (e.g. clear undo timers)
 * @returns {{ panelProps: Object, contentStyle: Object }}
 *   Spread `panelProps` on the panel: besides the sizing it tags the element so
 *   outer modals know not to run their own scroll handling inside it.
 */
export function useFullscreenModal({
  bgColor = '#111827',
  headerHeight = 52,
  toolbarHeight = 0,
  lockBody = true,
  safeArea = true,
  onCleanup,
} = {}) {
  useBodyScrollLock(lockBody, bgColor);

  useEffect(() => () => onCleanup?.(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const top = safeArea ? 'calc(var(--app-vt) + env(safe-area-inset-top))' : 'var(--app-vt)';
  const height = safeArea ? 'calc(var(--app-vh) - env(safe-area-inset-top))' : 'var(--app-vh)';

  return {
    panelProps: { style: { top, height }, 'data-fullscreen-modal': '' },
    contentStyle: { height: `calc(${height} - ${headerHeight + toolbarHeight}px)` },
  };
}
