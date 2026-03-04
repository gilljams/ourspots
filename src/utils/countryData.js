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

/**
 * Fetch country data from REST Countries and build a formatted fact block.
 * Returns { title, flag, content } or throws on error.
 */
export async function fetchCountryFacts(countryCode) {
  const res = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,capital,currencies,languages,region,subregion,population,flag,timezones,car,idd,cca2`);
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
  ].filter(line => line !== null);

  if (nativeName && nativeName !== name) {
    lines.unshift(`*${nativeName}*`);
    lines.splice(1, 0, '');
  }

  return {
    title: `${flag} ${name}`,
    flag,
    content: lines.join('\n'),
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
