import React from 'react';
import {
  Sun, Moon, CloudSun, CloudMoon, Cloudy, Haze,
  CloudDrizzle, CloudRain, CloudRainWind, CloudHail,
  CloudSunRain, CloudMoonRain, CloudSnow, CloudLightning,
  Snowflake, Cloud, ArrowDown,
} from 'lucide-react';

const iconMap = {
  Sun, Moon, CloudSun, CloudMoon, Cloudy, Haze,
  CloudDrizzle, CloudRain, CloudRainWind, CloudHail,
  CloudSunRain, CloudMoonRain, CloudSnow, CloudLightning,
  Snowflake, Cloud,
};

const iconColor = {
  Sun: 'text-amber-400',
  Moon: 'text-blue-300',
  CloudSun: 'text-amber-300',
  CloudMoon: 'text-blue-300',
  Cloudy: 'text-gray-400',
  Haze: 'text-gray-500',
  CloudDrizzle: 'text-blue-300',
  CloudRain: 'text-blue-400',
  CloudRainWind: 'text-blue-500',
  CloudHail: 'text-cyan-400',
  CloudSunRain: 'text-blue-300',
  CloudMoonRain: 'text-blue-300',
  CloudSnow: 'text-blue-200',
  CloudLightning: 'text-yellow-400',
  Snowflake: 'text-white',
  Cloud: 'text-gray-400',
};

export const WeatherBadge = ({ weather }) => {
  if (!weather) return null;
  const Icon = iconMap[weather.icon] || Cloud;
  const color = iconColor[weather.icon] || 'text-gray-400';

  // Show sunset only if it's daytime and we have data
  const showSunset = !weather.isNight && weather.sunset;

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400" title={weather.label}>
      <Icon size={14} className={color} />
      <span className="text-gray-300">{weather.temp}°</span>
      {showSunset && (
        <>
          <span className="text-gray-600">·</span>
          <ArrowDown size={10} className="text-gray-500" />
          <span>{weather.sunset}</span>
        </>
      )}
    </div>
  );
};
