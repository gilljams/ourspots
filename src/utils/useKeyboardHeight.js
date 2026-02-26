import { useState, useEffect, useCallback } from 'react';

/**
 * Lightweight hook for tracking iOS virtual keyboard state.
 * Uses window.visualViewport to detect when the keyboard opens/closes
 * and returns values that modals can use to stay above the keyboard.
 *
 * For full-screen editors (ListEditor, SimpleTableEditor, BlockEditor),
 * use useFullscreenModal instead — it also handles body scroll lock and
 * background color.
 *
 * Usage in a sheet/drawer modal:
 *   const { viewportHeight, keyboardVisible } = useKeyboardHeight();
 *   // On mobile, set modal height to viewportHeight instead of h-full
 *   style={{ height: keyboardVisible ? `${viewportHeight}px` : undefined }}
 *
 * @returns {{ viewportHeight: number, keyboardVisible: boolean, keyboardHeight: number }}
 */
export function useKeyboardHeight() {
  const [viewportHeight, setViewportHeight] = useState(
    () => window.visualViewport?.height || window.innerHeight
  );

  const update = useCallback(() => {
    const vp = window.visualViewport;
    if (vp) {
      setViewportHeight(vp.height);
    }
  }, []);

  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;

    vp.addEventListener('resize', update);
    vp.addEventListener('scroll', update);

    // Initial read
    update();

    return () => {
      vp.removeEventListener('resize', update);
      vp.removeEventListener('scroll', update);
    };
  }, [update]);

  const keyboardHeight = Math.max(0, window.innerHeight - viewportHeight);
  const keyboardVisible = keyboardHeight > 80; // Ignore small changes (toolbar)

  return { viewportHeight, keyboardVisible, keyboardHeight };
}
