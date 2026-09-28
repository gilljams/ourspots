import { readCaptures, addCapture } from './captureQueue';

/**
 * Local backup of every pinned coordinate.
 *
 * Exports both JSON and GPX on purpose: JSON round-trips back into the app with
 * full fidelity, GPX opens in Garmin, OsmAnd, Google Earth and the like, so the
 * pins survive even if this app does not.
 */

export function collectAllPins(objects = []) {
  const pins = [];

  for (const obj of objects) {
    const objectName = obj.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlöst objekt';
    (obj.blocks || []).forEach(b => {
      if (b.type !== 'location') return;
      if (b.data?.lat == null || b.data?.lng == null) return;
      pins.push({
        objectId: obj.id,
        objectName,
        lat: b.data.lat,
        lng: b.data.lng,
        accuracy: b.data.accuracy ?? null,
        capturedAt: b.data.capturedAt ?? null,
        note: b.data.note || '',
        address: b.data.address || '',
        pending: false,
      });
    });
  }

  for (const c of readCaptures()) {
    pins.push({
      objectId: c.targetObjectId,
      objectName: c.targetObjectId
        ? (objects.find(o => o.id === c.targetObjectId)?.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlöst objekt')
        : 'Ej kopplad pinne',
      lat: c.lat,
      lng: c.lng,
      accuracy: c.accuracy ?? null,
      capturedAt: c.capturedAt ?? null,
      note: c.note || '',
      address: '',
      pending: true,
    });
  }

  return pins;
}

export function buildBackupJson(pins) {
  return JSON.stringify({ format: 'ourspots-pins', version: 1, exportedAt: Date.now(), pins }, null, 2);
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ));
}

export function buildGpx(pins) {
  const waypoints = pins.map(p => {
    const name = p.note ? `${p.objectName} – ${p.note}` : p.objectName;
    const time = p.capturedAt ? `\n    <time>${new Date(p.capturedAt).toISOString()}</time>` : '';
    return `  <wpt lat="${p.lat}" lon="${p.lng}">\n    <name>${escapeXml(name)}</name>${time}\n  </wpt>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<gpx version="1.1" creator="OurSpots" xmlns="http://www.topografix.com/GPX/1/1">\n`
    + `${waypoints}\n</gpx>\n`;
}

export function downloadFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function backupFilename(extension) {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `ourspots-platser-${stamp}.${extension}`;
}

/**
 * Reads back either format. Returns plain coordinates - the caller decides what
 * to do with them.
 */
export function parseBackup(text) {
  const trimmed = text.trim();

  if (trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed);
    if (!Array.isArray(data.pins)) throw new Error('Filen saknar pinnar');
    return data.pins
      .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
      .map(p => ({
        lat: p.lat,
        lng: p.lng,
        accuracy: p.accuracy ?? null,
        note: p.note || p.objectName || '',
      }));
  }

  const doc = new DOMParser().parseFromString(trimmed, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Filen kunde inte läsas');
  return Array.from(doc.getElementsByTagName('wpt'))
    .map(wpt => ({
      lat: parseFloat(wpt.getAttribute('lat')),
      lng: parseFloat(wpt.getAttribute('lon')),
      accuracy: null,
      note: wpt.getElementsByTagName('name')[0]?.textContent || '',
    }))
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/**
 * Imported pins land in the queue as loose pins rather than being written back
 * onto objects. Restoring straight onto objects would risk duplicating places
 * that are already there, and the originals may not even exist any more.
 */
export function importPins(pins) {
  for (const p of pins) {
    addCapture({ lat: p.lat, lng: p.lng, accuracy: p.accuracy, note: p.note, targetObjectId: null });
  }
  return pins.length;
}
