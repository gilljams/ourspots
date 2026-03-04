import ncsColor from 'ncs-color';

/**
 * Attempt to convert a user-entered color code to HEX via the NCS system.
 * Accepts various formats:
 *   "S 3020-Y30R"        → "NCS S 3020-Y30R"
 *   "NCS S 3020-Y30R"    → as-is
 *   "3020-Y30R"           → "NCS 3020-Y30R"
 *   "5000-N"              → "NCS 5000-N"
 * Returns the hex string (e.g. "#a08c6e") or null if not a valid NCS code.
 */
export function ncsToHex(code) {
  if (!code || typeof code !== 'string') return null;

  let normalized = code.trim().toUpperCase();

  // Already starts with "NCS"
  if (normalized.startsWith('NCS')) {
    return ncsColor.hex(normalized);
  }

  // Starts with "S " (second edition) → prepend "NCS "
  if (/^S\s\d{4}-/.test(normalized)) {
    return ncsColor.hex('NCS ' + normalized);
  }

  // Bare code like "3020-Y30R" or "5000-N" → prepend "NCS "
  if (/^\d{4}-(N|[RGBY]\d{2}[RGBY]?)$/.test(normalized)) {
    return ncsColor.hex('NCS ' + normalized);
  }

  return null;
}
