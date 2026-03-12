import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

// Shared swipe-right-to-dismiss hook for modals
// Returns handlers, style, className, and ref to attach to the modal panel
// Also listens for Escape key to close on desktop.
//
// Usage:
//   const swipe = useSwipeToClose(onClose, { guardInteractive: true });
//   <div ref={swipe.ref} className={`... ${swipe.className}`}
//        style={{ ...swipe.style, ...otherStyles }}
//        {...swipe.handlers}>

const SWIPE_THRESHOLD = 30;   // px before swipe activates
const CLOSE_THRESHOLD = 150;  // px to trigger close (before resistance)
const RESISTANCE = 0.5;       // drag damping factor
const CLOSE_ANIM_MS = 200;    // slide-out animation duration

export function useSwipeToClose(onClose, { guardInteractive = false } = {}) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const ref = useRef(null);

  // Escape key closes the modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleTouchStart = useCallback((e) => {
    // Optionally skip swipe when touching interactive elements
    if (guardInteractive) {
      const target = e.target;
      if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('[role="button"]') || target.closest('pre')) {
        return;
      }
    }
    setTouchStart(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setIsSwipeActive(false);
  }, [guardInteractive]);

  const handleTouchMove = useCallback((e) => {
    if (touchStart === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStart;
    const deltaY = currentY - touchStartY;

    if (!isSwipeActive) {
      if (deltaX > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        setIsSwipeActive(true);
        e.preventDefault();
      } else if (Math.abs(deltaY) > 10) {
        setTouchStart(null);
        return;
      } else {
        return;
      }
    }

    if (deltaX > SWIPE_THRESHOLD) {
      e.preventDefault();
      const adjustedDelta = (deltaX - SWIPE_THRESHOLD) * RESISTANCE;
      setTouchDelta(adjustedDelta);
    }
  }, [touchStart, touchStartY, isSwipeActive]);

  const handleTouchEnd = useCallback(() => {
    if (touchDelta > CLOSE_THRESHOLD * RESISTANCE) {
      setTouchDelta(200);
      setTimeout(onClose, CLOSE_ANIM_MS);
    } else {
      setTouchDelta(0);
    }
    setTouchStart(null);
    setTouchStartY(null);
    setIsSwipeActive(false);
  }, [touchDelta, onClose]);

  const handlers = useMemo(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }), [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const style = useMemo(() => ({
    transform: `translateX(${touchDelta}px)`,
    opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1,
    touchAction: 'pan-y',
  }), [touchDelta]);

  // CSS transition class — applied to the modal panel
  const className = 'transition-transform duration-200 ease-out';

  return { ref, handlers, style, className, touchDelta };
}
