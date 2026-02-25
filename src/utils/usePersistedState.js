import { useState, useEffect } from 'react';

/**
 * useState that auto-persists to localStorage.
 *
 * @param {string} key          - localStorage key (use STORAGE_KEYS constant)
 * @param {*}      defaultValue - fallback when nothing is stored
 * @param {object} [opts]
 * @param {'boolean'|'string'|'json'} [opts.type='boolean'] - serialization strategy
 *   • 'boolean' – stores 'true'/'false', reads back as boolean
 *   • 'string'  – stores/reads raw string
 *   • 'json'    – JSON.stringify / JSON.parse
 * @param {boolean} [opts.defaultTrue=false] - when true, treat missing/null as true
 *   (used for settings that default to "on")
 *
 * @returns {[value, setValue]} same API as useState
 */
export function usePersistedState(key, defaultValue, opts = {}) {
  const { type = 'boolean', defaultTrue = false } = opts;

  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return defaultValue;
      if (type === 'json') return JSON.parse(saved);
      if (type === 'string') return saved;
      // boolean
      return defaultTrue ? saved !== 'false' : saved === 'true';
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else if (type === 'json') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, String(value));
      }
    } catch {
      // Quota exceeded or private mode — silently ignore
    }
  }, [key, value, type]);

  return [value, setValue];
}
