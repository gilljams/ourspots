import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { STORAGE_KEYS } from './storageKeys';

/**
 * Durable queue for GPS pins.
 *
 * Holds every pin that is not yet committed to an object:
 *   - targetObjectId set  -> waiting to be written to that object
 *   - targetObjectId null -> loose pin, user turns it into an object later
 *
 * Writes go through arrayUnion with a stable block id, which makes retries
 * idempotent: replaying the same pin cannot produce a duplicate location block.
 * That matters because a page reload loses the in-flight promise while Firestore
 * may still replay its own queued write.
 */

const QUEUE_KEY = STORAGE_KEYS.CAPTURE_QUEUE;

export function readCaptures() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCaptures(list) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable - keep going with what is in memory
  }
  return list;
}

export function addCapture({ lat, lng, accuracy = null, targetObjectId = null, note = '' }) {
  const capture = {
    id: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    lat,
    lng,
    accuracy,
    note,
    targetObjectId: targetObjectId || null,
    capturedAt: Date.now(),
    attempts: 0,
    lastError: null,
  };
  writeCaptures([...readCaptures(), capture]);
  return capture;
}

export function removeCapture(id) {
  return writeCaptures(readCaptures().filter(c => c.id !== id));
}

export function updateCapture(id, patch) {
  return writeCaptures(readCaptures().map(c => (c.id === id ? { ...c, ...patch } : c)));
}

export function capturesForObject(objectId) {
  return readCaptures().filter(c => c.targetObjectId === objectId);
}

export function pendingSyncCount() {
  return readCaptures().filter(c => c.targetObjectId).length;
}

/**
 * The block written to the object. Must be reproducible field for field so a
 * retry unions onto the identical value instead of appending a second copy.
 */
export function buildLocationBlock(capture) {
  return {
    type: 'location',
    data: {
      captureId: capture.id,
      lat: capture.lat,
      lng: capture.lng,
      accuracy: capture.accuracy ?? null,
      capturedAt: capture.capturedAt,
      address: '',
      note: capture.note || '',
      isPrimary: false,
    },
  };
}

/**
 * Attempts every targeted pin. Resolves once all attempts settle.
 * `onChange` fires whenever the queue changes so the UI can follow along.
 *
 * While offline `updateDoc` stays unresolved rather than rejecting, so a flush
 * can remain in flight for a long time. The guard keeps overlapping flushes from
 * piling up pending writes for the same pin.
 */
let flushInFlight = false;

export async function flushCaptures(db, { onChange } = {}) {
  if (flushInFlight) return { synced: 0, failed: 0 };
  const targeted = readCaptures().filter(c => c.targetObjectId);
  if (targeted.length === 0) return { synced: 0, failed: 0 };

  flushInFlight = true;
  let synced = 0;
  let failed = 0;

  try {
    for (const capture of targeted) {
      try {
        await updateDoc(doc(db, 'objects', capture.targetObjectId), {
          blocks: arrayUnion(buildLocationBlock(capture)),
          updatedAt: Timestamp.now(),
        });
        removeCapture(capture.id);
        synced++;
      } catch (err) {
        updateCapture(capture.id, {
          attempts: (capture.attempts || 0) + 1,
          lastError: err?.message || 'Okänt fel',
        });
        failed++;
      }
      onChange?.(readCaptures());
    }
  } finally {
    flushInFlight = false;
  }

  return { synced, failed };
}

/**
 * Folds the two older stores into this queue:
 *   ourspots_captures           - loose pins, plain array
 *   ourspots_pending_locations  - per object, { [objectId]: [...] }
 * Both are removed once folded in, so this runs at most once per device.
 */
export function migrateLegacyStores() {
  let migrated = 0;
  const existing = readCaptures();
  const added = [];

  try {
    const legacyCaptures = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAPTURES) || '[]');
    for (const c of legacyCaptures) {
      if (typeof c?.lat !== 'number' || typeof c?.lng !== 'number') continue;
      added.push({
        id: c.id || `cap_${c.timestamp || Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        lat: c.lat,
        lng: c.lng,
        accuracy: c.accuracy ?? null,
        note: c.note || '',
        targetObjectId: null,
        capturedAt: c.timestamp || Date.now(),
        attempts: 0,
        lastError: null,
      });
      migrated++;
    }
    localStorage.removeItem(STORAGE_KEYS.CAPTURES);
  } catch {
    // Nothing usable in the old store
  }

  try {
    const legacyPending = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_LOCATIONS) || '{}');
    for (const [objectId, list] of Object.entries(legacyPending)) {
      for (const p of list || []) {
        if (typeof p?.lat !== 'number' || typeof p?.lng !== 'number') continue;
        added.push({
          id: p.id || `cap_${p.timestamp || Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          lat: p.lat,
          lng: p.lng,
          accuracy: p.accuracy ?? null,
          note: '',
          targetObjectId: objectId,
          capturedAt: p.timestamp || Date.now(),
          attempts: 0,
          lastError: null,
        });
        migrated++;
      }
    }
    localStorage.removeItem(STORAGE_KEYS.PENDING_LOCATIONS);
  } catch {
    // Nothing usable in the old store
  }

  if (added.length > 0) writeCaptures([...existing, ...added]);
  return migrated;
}
