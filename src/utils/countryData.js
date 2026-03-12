/**
 * Electrical plug/socket standards by country code (ISO 3166-1 alpha-2).
 * Source: IEC World Plugs / Wikipedia.
 * Format: { voltage, frequency, plugTypes[] }
 */
const ELECTRICAL_STANDARDS = {
  AF: { v: '220V', hz: '50Hz', plugs: ['C', 'F'] },
  AL: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  DZ: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  AD: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  AO: { v: '220V', hz: '50Hz', plugs: ['C'] },
  AR: { v: '220V', hz: '50Hz', plugs: ['C', 'I'] },
  AM: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  AU: { v: '230V', hz: '50Hz', plugs: ['I'] },
  AT: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  AZ: { v: '220V', hz: '50Hz', plugs: ['C', 'F'] },
  BH: { v: '230V', hz: '50Hz', plugs: ['G'] },
  BD: { v: '220V', hz: '50Hz', plugs: ['C', 'D', 'G', 'K'] },
  BE: { v: '230V', hz: '50Hz', plugs: ['C', 'E'] },
  BZ: { v: '110/220V', hz: '60Hz', plugs: ['A', 'B', 'G'] },
  BJ: { v: '220V', hz: '50Hz', plugs: ['C', 'E'] },
  BT: { v: '230V', hz: '50Hz', plugs: ['D', 'F', 'G'] },
  BO: { v: '230V', hz: '50Hz', plugs: ['A', 'C'] },
  BA: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  BW: { v: '230V', hz: '50Hz', plugs: ['D', 'G'] },
  BR: { v: '127/220V', hz: '60Hz', plugs: ['C', 'N'] },
  BN: { v: '240V', hz: '50Hz', plugs: ['G'] },
  BG: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  KH: { v: '230V', hz: '50Hz', plugs: ['A', 'C', 'G'] },
  CM: { v: '220V', hz: '50Hz', plugs: ['C', 'E'] },
  CA: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  CL: { v: '220V', hz: '50Hz', plugs: ['C', 'L'] },
  CN: { v: '220V', hz: '50Hz', plugs: ['A', 'C', 'I'] },
  CO: { v: '110V', hz: '60Hz', plugs: ['A', 'B'] },
  CR: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  HR: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  CU: { v: '110/220V', hz: '60Hz', plugs: ['A', 'B', 'C', 'L'] },
  CY: { v: '230V', hz: '50Hz', plugs: ['G'] },
  CZ: { v: '230V', hz: '50Hz', plugs: ['C', 'E'] },
  DK: { v: '230V', hz: '50Hz', plugs: ['C', 'E', 'F', 'K'] },
  DO: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  EC: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  EG: { v: '220V', hz: '50Hz', plugs: ['C', 'F'] },
  SV: { v: '115V', hz: '60Hz', plugs: ['A', 'B'] },
  EE: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  ET: { v: '220V', hz: '50Hz', plugs: ['C', 'E', 'F', 'L'] },
  FJ: { v: '240V', hz: '50Hz', plugs: ['I'] },
  FI: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  FR: { v: '230V', hz: '50Hz', plugs: ['C', 'E'] },
  DE: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  GH: { v: '230V', hz: '50Hz', plugs: ['D', 'G'] },
  GR: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  GT: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  HN: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  HK: { v: '220V', hz: '50Hz', plugs: ['G'] },
  HU: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  IS: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  IN: { v: '230V', hz: '50Hz', plugs: ['C', 'D', 'M'] },
  ID: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  IR: { v: '220V', hz: '50Hz', plugs: ['C', 'F'] },
  IQ: { v: '230V', hz: '50Hz', plugs: ['C', 'D', 'G'] },
  IE: { v: '230V', hz: '50Hz', plugs: ['G'] },
  IL: { v: '230V', hz: '50Hz', plugs: ['C', 'H'] },
  IT: { v: '230V', hz: '50Hz', plugs: ['C', 'F', 'L'] },
  JM: { v: '110V', hz: '50Hz', plugs: ['A', 'B'] },
  JP: { v: '100V', hz: '50/60Hz', plugs: ['A', 'B'] },
  JO: { v: '230V', hz: '50Hz', plugs: ['B', 'C', 'D', 'F', 'G', 'J'] },
  KZ: { v: '220V', hz: '50Hz', plugs: ['C', 'F'] },
  KE: { v: '240V', hz: '50Hz', plugs: ['G'] },
  KR: { v: '220V', hz: '60Hz', plugs: ['C', 'F'] },
  KW: { v: '240V', hz: '50Hz', plugs: ['G'] },
  LA: { v: '230V', hz: '50Hz', plugs: ['A', 'B', 'C', 'E', 'F'] },
  LV: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  LB: { v: '230V', hz: '50Hz', plugs: ['C', 'D', 'G'] },
  LT: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  LU: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  MO: { v: '220V', hz: '50Hz', plugs: ['D', 'G'] },
  MG: { v: '220V', hz: '50Hz', plugs: ['C', 'E'] },
  MY: { v: '240V', hz: '50Hz', plugs: ['G'] },
  MV: { v: '230V', hz: '50Hz', plugs: ['D', 'G'] },
  MT: { v: '230V', hz: '50Hz', plugs: ['G'] },
  MU: { v: '230V', hz: '50Hz', plugs: ['C', 'G'] },
  MX: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  MA: { v: '220V', hz: '50Hz', plugs: ['C', 'E'] },
  MZ: { v: '220V', hz: '50Hz', plugs: ['C', 'F', 'M'] },
  MM: { v: '230V', hz: '50Hz', plugs: ['C', 'D', 'F', 'G'] },
  NA: { v: '220V', hz: '50Hz', plugs: ['D', 'M'] },
  NP: { v: '230V', hz: '50Hz', plugs: ['C', 'D', 'M'] },
  NL: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  NZ: { v: '230V', hz: '50Hz', plugs: ['I'] },
  NI: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  NG: { v: '230V', hz: '50Hz', plugs: ['D', 'G'] },
  NO: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  OM: { v: '240V', hz: '50Hz', plugs: ['G'] },
  PK: { v: '230V', hz: '50Hz', plugs: ['C', 'D'] },
  PA: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  PY: { v: '220V', hz: '50Hz', plugs: ['C'] },
  PE: { v: '220V', hz: '60Hz', plugs: ['A', 'B', 'C'] },
  PH: { v: '220V', hz: '60Hz', plugs: ['A', 'B', 'C'] },
  PL: { v: '230V', hz: '50Hz', plugs: ['C', 'E'] },
  PT: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  QA: { v: '240V', hz: '50Hz', plugs: ['D', 'G'] },
  RO: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  RU: { v: '220V', hz: '50Hz', plugs: ['C', 'F'] },
  SA: { v: '220V', hz: '60Hz', plugs: ['A', 'B', 'G'] },
  SN: { v: '230V', hz: '50Hz', plugs: ['C', 'D', 'E', 'K'] },
  RS: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  SG: { v: '230V', hz: '50Hz', plugs: ['G'] },
  SK: { v: '230V', hz: '50Hz', plugs: ['C', 'E'] },
  SI: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  ZA: { v: '230V', hz: '50Hz', plugs: ['C', 'D', 'M', 'N'] },
  ES: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  LK: { v: '230V', hz: '50Hz', plugs: ['D', 'G'] },
  SE: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  CH: { v: '230V', hz: '50Hz', plugs: ['C', 'J'] },
  TW: { v: '110V', hz: '60Hz', plugs: ['A', 'B'] },
  TZ: { v: '230V', hz: '50Hz', plugs: ['D', 'G'] },
  TH: { v: '220V', hz: '50Hz', plugs: ['A', 'B', 'C', 'O'] },
  TN: { v: '230V', hz: '50Hz', plugs: ['C', 'E'] },
  TR: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  UA: { v: '230V', hz: '50Hz', plugs: ['C', 'F'] },
  AE: { v: '230V', hz: '50Hz', plugs: ['G'] },
  GB: { v: '230V', hz: '50Hz', plugs: ['G'] },
  US: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  UY: { v: '220V', hz: '50Hz', plugs: ['C', 'F', 'L'] },
  UZ: { v: '220V', hz: '50Hz', plugs: ['C', 'F'] },
  VE: { v: '120V', hz: '60Hz', plugs: ['A', 'B'] },
  VN: { v: '220V', hz: '50Hz', plugs: ['A', 'C'] },
  ZM: { v: '230V', hz: '50Hz', plugs: ['C', 'D', 'G'] },
  ZW: { v: '220V', hz: '50Hz', plugs: ['D', 'G'] },
};

// Sweden uses C/F — countries with same plugs need no adapter
const SWEDEN_PLUGS = ['C', 'F'];

/**
 * Check if adapter is needed from Sweden
 * Returns: 'Nej' | 'Ja' | 'Kanske (delvis kompatibelt)'
 */
function adapterNeeded(plugTypes) {
  if (!plugTypes || plugTypes.length === 0) return 'Okänt';
  const hasCompatible = plugTypes.some(p => SWEDEN_PLUGS.includes(p));
  const allCompatible = plugTypes.every(p => SWEDEN_PLUGS.includes(p));
  if (allCompatible) return 'Nej';
  if (hasCompatible) return 'Nej (C/F finns)';
  return 'Ja';
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

/**
 * Fetch monthly average temperatures for a location using Open-Meteo Historical API.
 * Averages the last 5 complete years of daily data → 12 monthly means.
 * Returns formatted climate table string, or null on failure.
 */
async function fetchClimateData(lat, lng) {
  if (lat == null || lng == null) return null;
  try {
    // Use 5 recent complete years for a good average
    const endYear = new Date().getFullYear() - 1;
    const startYear = endYear - 4;
    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startYear}-01-01&end_date=${endYear}-12-31&daily=temperature_2m_mean&timezone=auto`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const times = data.daily?.time;
    const temps = data.daily?.temperature_2m_mean;
    if (!times || !temps || times.length === 0) return null;

    // Group by month and average
    const monthSums = new Array(12).fill(0);
    const monthCounts = new Array(12).fill(0);
    for (let i = 0; i < times.length; i++) {
      if (temps[i] == null) continue;
      const month = parseInt(times[i].substring(5, 7), 10) - 1; // 0-11
      monthSums[month] += temps[i];
      monthCounts[month]++;
    }
    const monthAvgs = monthSums.map((sum, i) =>
      monthCounts[i] > 0 ? Math.round(sum / monthCounts[i]) : null
    );
    if (monthAvgs.every(v => v === null)) return null;

    // Format as compact table
    const labels = MONTH_LABELS.map(m => m.padStart(4)).join('');
    const values = monthAvgs.map(v => (v !== null ? `${v}°` : ' -').padStart(4)).join('');
    return `🌡️ **Klimat (medeltemperatur):**\n\`\`\`\n${labels}\n${values}\n\`\`\``;
  } catch {
    return null;
  }
}

/**
 * Fetch a representative Wikipedia image for a country.
 * Uses the Wikipedia API to get the main page image (original size).
 * Returns URL string or null.
 */
async function fetchCountryImage(countryName) {
  try {
    const encoded = encodeURIComponent(countryName);
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    // originalimage has the full-res version; thumbnail is smaller
    return data.originalimage?.source || data.thumbnail?.source || null;
  } catch {
    return null;
  }
}

/**
 * Fetch country data from REST Countries and build a formatted fact block.
 * Returns { title, flag, content, lat, lng, address, imageUrl } or throws on error.
 */
export async function fetchCountryFacts(countryCode) {
  const res = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,capital,capitalInfo,latlng,currencies,languages,region,subregion,population,flag,timezones,car,idd,cca2`);
  if (!res.ok) throw new Error('Kunde inte hämta landsdata');
  const data = await res.json();

  const name = data.name?.common || countryCode;
  const nativeName = data.name?.nativeName ? Object.values(data.name.nativeName)[0]?.common : null;
  const flag = data.flag || '';
  const capital = data.capital?.[0] || 'Okänd';
  const region = data.subregion ? `${data.subregion}, ${data.region}` : data.region || '';
  const population = data.population ? (data.population / 1_000_000).toFixed(1) + ' milj.' : 'Okänt';
  const driveSide = data.car?.side === 'left' ? 'Vänster' : 'Höger';
  const timezones = data.timezones?.join(', ') || 'Okänt';
  const callingCode = data.idd?.root ? `${data.idd.root}${data.idd.suffixes?.[0] || ''}` : '';

  // Currencies
  const currencies = data.currencies
    ? Object.values(data.currencies).map(c => `${c.name}${c.symbol ? ` (${c.symbol})` : ''}`).join(', ')
    : 'Okänt';

  // Languages
  const languages = data.languages
    ? Object.values(data.languages).join(', ')
    : 'Okänt';

  // Electrical info
  const elec = ELECTRICAL_STANDARDS[data.cca2];
  const elecStr = elec
    ? `${elec.v} / ${elec.hz}, typ ${elec.plugs.join(', ')}`
    : 'Okänt';
  const adapterStr = elec ? adapterNeeded(elec.plugs) : 'Okänt';

  // Build markdown content
  const lines = [
    `**Huvudstad:** ${capital}`,
    `**Region:** ${region}`,
    `**Befolkning:** ${population}`,
    '',
    `**Valuta:** ${currencies}`,
    `**Språk:** ${languages}`,
    `**Tidszon:** ${timezones}`,
    callingCode ? `**Riktnummer:** ${callingCode}` : null,
    '',
    `**Körsida:** ${driveSide}`,
    `**El:** ${elecStr}`,
    `**Adapter från Sverige:** ${adapterStr}`,
    '',
    `[Läs mer på Wikipedia](https://en.wikipedia.org/wiki/${encodeURIComponent(name)})`,
  ].filter(line => line !== null);

  if (nativeName && nativeName !== name) {
    lines.unshift(`*${nativeName}*`);
    lines.splice(1, 0, '');
  }

  // Fetch Wikipedia image and climate data in parallel (don't block on failure)
  const countryLat = data.capitalInfo?.latlng?.[0] ?? data.latlng?.[0] ?? null;
  const countryLng = data.capitalInfo?.latlng?.[1] ?? data.latlng?.[1] ?? null;
  const [imageUrl, climateStr] = await Promise.all([
    fetchCountryImage(name),
    fetchClimateData(countryLat, countryLng),
  ]);

  // Insert climate before the Wikipedia link
  if (climateStr) {
    const wikiIdx = lines.findIndex(l => l.startsWith('[Läs mer'));
    if (wikiIdx !== -1) {
      lines.splice(wikiIdx, 0, climateStr, '');
    } else {
      lines.push('', climateStr);
    }
  }

  return {
    title: `${name} ${flag}`,
    flag,
    content: lines.join('\n'),
    lat: countryLat,
    lng: countryLng,
    address: name,
    imageUrl,
  };
}

/**
 * Fetch list of all countries (for the picker).
 * Returns sorted array of { code, name, flag }.
 */
export async function fetchCountryList() {
  const res = await fetch('https://restcountries.com/v3.1/all?fields=cca2,name,flag');
  if (!res.ok) throw new Error('Kunde inte hämta länder');
  const data = await res.json();
  return data
    .map(c => ({
      code: c.cca2,
      name: c.name?.common || c.cca2,
      flag: c.flag || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

/**
 * Search for places (countries, cities, landmarks) using Photon (OpenStreetMap).
 * Returns array of { name, displayName, lat, lng, type, country, countryCode, city }.
 */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lang=en`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.features.map(f => {
    const p = f.properties;
    const osmType = p.osm_value || p.type || '';
    // Detect if this is a country-level result
    const isCountry = osmType === 'country' || 
                      p.type === 'country' ||
                      (p.osm_key === 'place' && p.osm_value === 'country');
    return {
      name: p.name || '',
      displayName: [p.name, p.city, p.state, p.country].filter(Boolean).join(', '),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      type: isCountry ? 'country' : (osmType || 'place'),
      country: p.country || '',
      countryCode: p.countrycode?.toUpperCase() || '',
      city: p.city || p.county || '',
      state: p.state || '',
    };
  });
}

/**
 * Fetch facts about a non-country place (city, landmark, etc.) using Wikipedia.
 * Returns { title, content, lat, lng, address, imageUrl } or throws on error.
 */
export async function fetchPlaceFacts(name, lat, lng, { country = '', state = '', city = '' } = {}) {
  // Try Wikipedia summary – search with name first, fallback with more context
  let wikiData = null;
  for (const searchTerm of [name, `${name} ${country}`, `${name} ${state}`]) {
    try {
      const encoded = encodeURIComponent(searchTerm);
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
      );
      if (res.ok) {
        const d = await res.json();
        if (d.type !== 'disambiguation') {
          wikiData = d;
          break;
        }
      }
    } catch { /* try next */ }
  }

  const extract = wikiData?.extract || '';
  const imageUrl = wikiData?.originalimage?.source || wikiData?.thumbnail?.source || null;
  const wikiTitle = wikiData?.titles?.normalized || name;

  // Build location context line
  const locationParts = [city, state, country].filter(Boolean);
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : '';

  // Build markdown content
  const lines = [];
  if (locationStr) {
    lines.push(`**Plats:** ${locationStr}`);
    lines.push('');
  }
  if (extract) {
    lines.push(extract);
    lines.push('');
  }
  if (lat != null && lng != null) {
    lines.push(`**Koordinater:** ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
  }

  // Fetch climate data (don't block on failure)
  const climateStr = await fetchClimateData(lat, lng);
  if (climateStr) {
    lines.push('');
    lines.push(climateStr);
  }

  lines.push('');
  lines.push(`[Läs mer på Wikipedia](https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)})`);

  return {
    title: name,
    content: lines.join('\n'),
    lat,
    lng,
    address: locationStr || name,
    imageUrl,
  };
}
