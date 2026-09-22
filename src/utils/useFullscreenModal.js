import { useState, useEffect, useRef } from 'react';

// Reference counted so a nested fullscreen modal closing does not release the
// outer modal's lock (CreateObjectModal hosts the list/table editors).
let bodyLockCount = 0;
let bodyLockScrollY = 0;

function acquireBodyLock(bgColor) {
  if (bodyLockCount === 0) {
    bodyLockScrollY = window.scrollY;
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${bodyLockScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
  }
  bodyLockCount++;
}

function releaseBodyLock() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) {
    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';
    window.scrollTo(0, bodyLockScrollY);
  }
}

/**
 * Hook for fullscreen modal viewport management and body scroll lock.
 * Used by ListEditorModal, SimpleTableEditorModal, MultiColumnTableEditorModal,
 * FullscreenTextEditor (BlockEditor) and CreateObjectModal to handle iOS keyboard correctly.
 *
 * @param {Object} options
 * @param {string} [options.bgColor='#1e293b'] - Background color during modal
 * @param {number} [options.headerHeight=52] - Fixed header height to subtract
 * @param {number} [options.toolbarHeight=0] - Fixed toolbar height to subtract
 * @param {boolean} [options.useRAF=false] - Use requestAnimationFrame for jitter-reduction (text editor)
 * @param {boolean} [options.lockBody=true] - Lock body scroll while mounted
 * @param {Function} [options.onCleanup] - Extra cleanup to run on unmount (e.g. clear undo timers)
 * @returns {{ viewportHeight: number, viewportOffset: number, contentHeight: number }}
 */
export function useFullscreenModal({
  bgColor = '#111827',
  headerHeight = 52,
  toolbarHeight = 0,
  useRAF = false,
  lockBody = true,
  onCleanup,
} = {}) {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [viewportOffset, setViewportOffset] = useState(0);
  const rafRef = useRef(null);
  const lastValuesRef = useRef({ height: 0, offset: 0 });

  useEffect(() => {
    const viewport = window.visualViewport;

    const updateLayout = () => {
      if (useRAF) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => applyLayout(viewport));
      } else {
        applyLayout(viewport);
      }
    };

    const applyLayout = (vp) => {
      if (vp) {
        const newHeight = vp.height;
        const newOffset = vp.offsetTop;
        if (useRAF) {
          // Only update if values changed significantly (reduce jitter)
          if (
            Math.abs(newHeight - lastValuesRef.current.height) > 2 ||
            Math.abs(newOffset - lastValuesRef.current.offset) > 2
          ) {
            lastValuesRef.current = { height: newHeight, offset: newOffset };
            setViewportHeight(newHeight);
            setViewportOffset(newOffset);
          }
        } else {
          setViewportHeight(newHeight);
          setViewportOffset(newOffset);
        }
      } else {
        setViewportHeight(window.innerHeight);
        setViewportOffset(0);
      }
    };

    // Lock first: it repositions the body, and no viewport event is guaranteed after
    if (lockBody) acquireBodyLock(bgColor);

    if (viewport) {
      viewport.addEventListener('resize', updateLayout);
      viewport.addEventListener('scroll', updateLayout);
    }
    window.addEventListener('resize', updateLayout);
    updateLayout();

    // iOS does not reliably fire a visualViewport resize when the keyboard is
    // dismissed, which would otherwise leave the modal stuck at keyboard height.
    const remeasureTimers = [];
    const handleFocusOut = () => {
      remeasureTimers.push(setTimeout(updateLayout, 100));
      remeasureTimers.push(setTimeout(updateLayout, 400));
    };
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      // Restore body
      if (lockBody) releaseBodyLock();

      // Remove listeners
      if (viewport) {
        viewport.removeEventListener('resize', updateLayout);
        viewport.removeEventListener('scroll', updateLayout);
      }
      window.removeEventListener('resize', updateLayout);
      document.removeEventListener('focusout', handleFocusOut);
      remeasureTimers.forEach(clearTimeout);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      // Extra cleanup (e.g. undo timers)
      onCleanup?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const contentHeight = viewportHeight - headerHeight - toolbarHeight;

  return { viewportHeight, viewportOffset, contentHeight };
}
