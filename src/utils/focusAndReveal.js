/**
 * Focus an input and bring it into view.
 *
 * Only ever call this in response to a user action (row added, Enter pressed).
 * Calling it in response to losing focus makes two fields claim focus from each
 * other in a loop - see the ExpandableInput note in manifest.md.
 */
export function focusAndReveal(el, { delay = 100, block = 'center' } = {}) {
  if (!el) return;
  el.focus();
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block }), delay);
}
