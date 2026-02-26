import { useState, useEffect, useRef } from 'react';

/**
 * Hook for fullscreen modal viewport management and body scroll lock.
 * Used by ListEditorModal, SimpleTableEditorModal, MultiColumnTableEditorModal,
 * and FullscreenTextEditor (BlockEditor) to handle iOS keyboard correctly.
 *
 * @param {Object} options
 * @param {string} [options.bgColor='#1e293b'] - Background color during modal
 * @param {number} [options.headerHeight=52] - Fixed header height to subtract
 * @param {number} [options.toolbarHeight=0] - Fixed toolbar height to subtract
 * @param {boolean} [options.useRAF=false] - Use requestAnimationFrame for jitter-reduction (text editor)
 * @param {Function} [options.onCleanup] - Extra cleanup to run on unmount (e.g. clear undo timers)
 * @returns {{ viewportHeight: number, viewportOffset: number, contentHeight: number }}
 */
export function useFullscreenModal({
  bgColor = '#111827',
  headerHeight = 52,
  toolbarHeight = 0,
  useRAF = false,
  onCleanup,
} = {}) {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [viewportOffset, setViewportOffset] = useState(0);
  const scrollYRef = useRef(0);
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

    if (viewport) {
      viewport.addEventListener('resize', updateLayout);
      viewport.addEventListener('scroll', updateLayout);
    }
    window.addEventListener('resize', updateLayout);
    updateLayout();

    // Lock body scroll
    scrollYRef.current = window.scrollY;
    const scrollY = scrollYRef.current;
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore body
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollYRef.current);

      // Remove listeners
      if (viewport) {
        viewport.removeEventListener('resize', updateLayout);
        viewport.removeEventListener('scroll', updateLayout);
      }
      window.removeEventListener('resize', updateLayout);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      // Extra cleanup (e.g. undo timers)
      onCleanup?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const contentHeight = viewportHeight - headerHeight - toolbarHeight;

  return { viewportHeight, viewportOffset, contentHeight };
}
