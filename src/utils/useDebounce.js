import { useState, useEffect } from 'react';

/**
 * Debounce a value by the given delay (ms).
 * Useful for search inputs to avoid filtering on every keystroke.
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
