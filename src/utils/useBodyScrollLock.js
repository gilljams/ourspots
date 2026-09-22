import { useEffect } from 'react';

/**
 * Locks background scrolling while a fullscreen modal is open.
 *
 * Reference counted, because these modals nest: CreateObjectModal hosts the
 * list, table and text editors. Without counting, closing an inner modal would
 * release the lock while the outer one is still open.
 */

let lockCount = 0;
let savedScrollY = 0;

export function useBodyScrollLock(enabled = true, bgColor = '#111827') {
  useEffect(() => {
    if (!enabled) return;

    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      document.documentElement.style.backgroundColor = bgColor;
      document.body.style.backgroundColor = bgColor;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.documentElement.style.backgroundColor = '';
        document.body.style.backgroundColor = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
