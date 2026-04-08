import { useState, useEffect } from 'react';

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Round coordinates to ~1 km precision for cache key grouping
const cacheKey = (lat, lng) =>
  `weather_${lat.toFixed(2)}_${lng.toFixed(2)}`;

const getCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch { return null; }
};

const setCache = (key, data) => {
  try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); }
  catch { /* quota exceeded – ignore */ }
};

// Map WMO weather codes to icon name + label
// https://open-meteo.com/en/docs  (WMO Weather interpretation codes)
const mapWeatherCode = (code, isNight) => {
  if (code <= 1)  return { icon: isNight ? 'Moon' : 'Sun', label: 'Klart' };
  if (code <= 2)  return { icon: isNight ? 'CloudMoon' : 'CloudSun', label: 'Mestadels klart' };
  if (code === 3) return { icon: 'Cloudy', label: 'Mulet' };
  if (code === 45 || code === 48) return { icon: 'Haze', label: 'Dimma' };
  if (code === 51) return { icon: 'CloudDrizzle', label: 'Lätt duggregn' };
  if (code === 53) return { icon: 'CloudDrizzle', label: 'Duggregn' };
  if (code === 55) return { icon: 'CloudRain', label: 'Kraftigt duggregn' };
  if (code === 56 || code === 57) return { icon: 'CloudHail', label: 'Underkylt duggregn' };
  if (code === 61) return { icon: isNight ? 'CloudMoonRain' : 'CloudSunRain', label: 'Lätt regn' };
  if (code === 63) return { icon: 'CloudRain', label: 'Regn' };
  if (code === 65) return { icon: 'CloudRainWind', label: 'Ösregn' };
  if (code === 66 || code === 67) return { icon: 'CloudHail', label: 'Underkylt regn' };
  if (code === 71) return { icon: 'Snowflake', label: 'Lätt snö' };
  if (code === 73) return { icon: 'CloudSnow', label: 'Snö' };
  if (code === 75 || code === 77) return { icon: 'CloudSnow', label: 'Kraftig snö' };
  if (code >= 80 && code <= 82) return { icon: 'CloudRainWind', label: 'Skurar' };
  if (code === 85 || code === 86) return { icon: 'CloudSnow', label: 'Snöbyar' };
  if (code >= 95) return { icon: 'CloudLightning', label: 'Åska' };
  return { icon: 'Cloud', label: 'Moln' };
};

export const useWeather = (lat, lng) => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (!lat || !lng) return;

    const key = cacheKey(lat, lng);
    const cached = getCache(key);
    if (cached) { setWeather(cached); return; }

    let cancelled = false;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&daily=sunset&timezone=auto&forecast_days=1`;

    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled || !json?.current) return;
        const { temperature_2m, weather_code, is_day } = json.current;
        const sunset = json.daily?.sunset?.[0]?.slice(11, 16) || null; // "HH:MM"
        const isNight = is_day === 0;
        const { icon, label } = mapWeatherCode(weather_code, isNight);

        const data = {
          temp: Math.round(temperature_2m),
          icon,
          label,
          sunset,
          isNight,
        };
        setCache(key, data);
        setWeather(data);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [lat, lng]);

  return weather;
};
