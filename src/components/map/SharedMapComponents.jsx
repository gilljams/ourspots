/**
 * SharedMapComponents.jsx
 * 
 * Shared building blocks for all map views in OurSpots.
 * Follows 2026 map UX best practices (Google Maps / Apple Maps patterns):
 * 
 * Layout convention:
 *   Top-right:    Control buttons stacked vertically (GPS, fit, tracking)
 *   Top-left:     Info panels (navigation distance)
 *   Bottom-center: Contextual actions (recenter pill)
 *   Bottom-right:  Primary FAB action
 * 
 * Button design:
 *   - 44×44px touch targets (WCAG / Apple HIG)
 *   - Dark glass style: bg-black/60 + white text + shadow
 *   - Active states: colored background (blue/green)
 *   - Consistent rounded-full shape
 *   - Pulsing ring for active tracking states
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Locate, X, Maximize2, Target } from 'lucide-react';
import { TileLayer, Marker, Tooltip, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { createUserIcon } from '../../utils/mapIcons';
import { getDistanceMeters, formatDistanceMeters } from '../../utils/geoUtils';

// ─── Constants ────────────────────────────────────────────────────────────────

export const CARTO_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const CARTO_ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a>';

// ─── Standard button styles ───────────────────────────────────────────────────

// Base map control button (44×44, dark glass, rounded-full)
const MAP_BTN_BASE = 'w-11 h-11 rounded-full shadow-lg transition-all flex items-center justify-center';
const MAP_BTN_DEFAULT = `${MAP_BTN_BASE} bg-black/60 text-white hover:bg-black/75 active:bg-black/80`;
const MAP_BTN_ACTIVE_BLUE = `${MAP_BTN_BASE} bg-blue-500 text-white hover:bg-blue-600`;
const MAP_BTN_ACTIVE_GREEN = `${MAP_BTN_BASE} bg-green-500 text-white hover:bg-green-600`;

// ─── Tile Layer ───────────────────────────────────────────────────────────────

export function BaseTileLayer() {
  return (
    <TileLayer
      attribution={CARTO_ATTRIBUTION}
      url={CARTO_TILE_URL}
    />
  );
}

// ─── User Location Marker ─────────────────────────────────────────────────────

export function UserLocationMarker({ position, isTracking = false }) {
  if (!position) return null;
  return (
    <Marker 
      position={[position.lat, position.lng]} 
      icon={createUserIcon()} 
      zIndexOffset={1000}
    >
      <Tooltip permanent={false} direction="top">
        {isTracking ? 'Din plats (spårar)' : 'Din plats'}
      </Tooltip>
    </Marker>
  );
}

// ─── Direction Line ───────────────────────────────────────────────────────────

export function DirectionLine({ from, to }) {
  if (!from || !to) return null;
  return (
    <Polyline
      positions={[
        [from.lat, from.lng],
        [to.lat, to.lng]
      ]}
      pathOptions={{
        color: '#10B981',
        weight: 3,
        dashArray: '10, 10',
        opacity: 0.8
      }}
    />
  );
}

// ─── Navigation Info Panel (top-left) ─────────────────────────────────────────

export function NavigationInfoPanel({ target, userLocation, onClose }) {
  if (!target || !userLocation) return null;
  
  const distance = getDistanceMeters(
    userLocation.lat, userLocation.lng,
    target.lat, target.lng
  );
  
  return (
    <div className="absolute top-3 left-3 z-[1000] bg-black/60 text-white px-3.5 py-2.5 rounded-2xl shadow-lg flex items-center gap-3">
      <div>
        <div className="text-[11px] text-gray-300 leading-tight">Till {target.name}</div>
        <div className="text-lg font-bold text-emerald-400 leading-tight">{formatDistanceMeters(distance)}</div>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        title="Ta bort linje"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Map Drag Detector ────────────────────────────────────────────────────────

export function MapDragDetector({ onPanned }) {
  useMapEvents({
    dragstart: () => {
      if (onPanned) onPanned();
    }
  });
  return null;
}

// ─── Recenter Button (bottom-center pill) ─────────────────────────────────────

export function RecenterButton({ show, userLocation }) {
  const map = useMap();
  
  if (!show || !userLocation) return null;
  
  const handleRecenter = () => {
    map.setView(
      [userLocation.lat, userLocation.lng], 
      Math.max(map.getZoom(), 15), 
      { animate: true }
    );
  };
  
  return (
    <button
      onClick={handleRecenter}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2.5 rounded-full bg-black/60 hover:bg-black/75 text-white shadow-lg transition-all flex items-center gap-2 text-sm font-medium"
    >
      <Locate size={16} />
      Centrera på mig
    </button>
  );
}

// ─── FitBounds (auto-zoom to markers on mount) ───────────────────────────────

export function FitBounds({ positions, padding = [50, 50], maxZoom = 14 }) {
  const map = useMap();
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (hasInitialized.current) return;
    if (!positions || positions.length === 0) return;
    
    hasInitialized.current = true;
    
    if (positions.length === 1) {
      map.setView([positions[0].lat, positions[0].lng], 13);
    } else {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding, maxZoom });
    }
  }, [map, positions, padding, maxZoom]);
  
  return null;
}

// ─── Fit All Button (top-right stack) ─────────────────────────────────────────

export function FitAllButton({ positions }) {
  const map = useMap();
  
  if (!positions || positions.length === 0) return null;
  
  const handleFitAll = () => {
    if (positions.length === 1) {
      map.setView([positions[0].lat, positions[0].lng], 13);
    } else {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };
  
  return (
    <button
      onClick={handleFitAll}
      className={MAP_BTN_DEFAULT}
      title="Visa alla platser"
    >
      <Maximize2 size={20} />
    </button>
  );
}

// ─── Center On Location Button ────────────────────────────────────────────────

export function CenterOnLocationButton({ onLocationFound, enableWatch = false }) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const watchIdRef = useRef(null);
  
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);
  
  const handleClick = async () => {
    if (!('geolocation' in navigator)) {
      alert('Din enhet stöder inte platsåtkomst');
      return;
    }

    // Check permissions
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'denied') {
          alert('Platsåtkomst är blockerad. Aktivera i webbläsarens inställningar.');
          return;
        }
      } catch (e) { /* continue */ }
    }

    // If watching, toggle off
    if (isWatching && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsWatching(false);
      return;
    }
    
    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
        if (onLocationFound) {
          onLocationFound({ lat: latitude, lng: longitude });
        }
        setIsLocating(false);
        
        // Start continuous watch if enabled
        if (enableWatch) {
          setIsWatching(true);
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              const { latitude: lat, longitude: lng } = pos.coords;
              if (onLocationFound) onLocationFound({ lat, lng });
              map.setView([lat, lng], map.getZoom(), { animate: true });
            },
            () => {},
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
          );
        }
      },
      (error) => {
        setIsLocating(false);
        let message = 'Kunde inte hämta din position. ';
        if (error.code === 1) {
          message = 'Du nekade platsåtkomst. Aktivera i webbläsarens inställningar.';
        } else if (error.code === 2) {
          message += 'Position inte tillgänglig.';
        } else if (error.code === 3) {
          message += 'Timeout – försök igen.';
        }
        alert(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };
  
  const isActive = isLocating || isWatching;
  
  return (
    <button
      onClick={handleClick}
      disabled={isLocating}
      className={isWatching ? MAP_BTN_ACTIVE_GREEN : isLocating ? MAP_BTN_ACTIVE_BLUE : MAP_BTN_DEFAULT}
      title={isWatching ? 'Stoppa positionsspårning' : 'Centrera på min position'}
    >
      {enableWatch ? <Navigation size={20} /> : <Locate size={20} />}
      {isActive && (
        <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" />
      )}
    </button>
  );
}

// ─── GPS Tracking Toggle Button ───────────────────────────────────────────────

export function TrackingToggleButton({ isTracking, onStart, onStop }) {
  const map = useMap();
  
  const handleToggle = () => {
    if (!('geolocation' in navigator)) {
      alert('Din enhet stöder inte platsåtkomst');
      return;
    }

    if (isTracking) {
      onStop();
      return;
    }

    onStart();
    
    // Center map on current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], Math.max(map.getZoom(), 15), { animate: true });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };
  
  return (
    <button
      onClick={handleToggle}
      className={isTracking ? MAP_BTN_ACTIVE_GREEN : MAP_BTN_DEFAULT}
      title={isTracking ? 'Stoppa spårning' : 'Spåra min position'}
    >
      <Navigation size={20} />
      {isTracking && (
        <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" />
      )}
    </button>
  );
}

// ─── Add Location Button (FAB, bottom-right) ─────────────────────────────────

export function AddLocationButton({ onAddLocation, onLocationUpdate, pendingCount = 0 }) {
  const map = useMap();
  const [isAdding, setIsAdding] = useState(false);
  
  const handleAdd = () => {
    if (!('geolocation' in navigator)) {
      alert('Din enhet stöder inte platsåtkomst');
      return;
    }
    
    setIsAdding(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = { lat: latitude, lng: longitude };
        if (onLocationUpdate) onLocationUpdate(newPos);
        if (onAddLocation) onAddLocation(newPos);
        map.setView([latitude, longitude], 14);
        setIsAdding(false);
      },
      (error) => {
        setIsAdding(false);
        let message = 'Kunde inte hämta din position. ';
        if (error.code === 1) message = 'Du nekade platsåtkomst.';
        alert(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };
  
  return (
    <button
      onClick={handleAdd}
      disabled={isAdding}
      className={`absolute bottom-4 right-4 z-[1000] w-12 h-12 rounded-full shadow-lg transition-all flex items-center justify-center ${
        isAdding 
          ? 'bg-orange-400 text-white animate-pulse' 
          : 'bg-orange-500 hover:bg-orange-400 text-white'
      }`}
      title="Lägg till ny plats här"
    >
      <Target size={22} />
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {pendingCount}
        </span>
      )}
    </button>
  );
}

// ─── Invalidate Size On Change ────────────────────────────────────────────────

export function InvalidateSizeOnChange({ deps }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timer);
  }, [deps, map]);
  return null;
}

// ─── Top-Right Control Stack ──────────────────────────────────────────────────
// Wrapper to consistently position map control buttons in the top-right corner

export function MapControlStack({ children }) {
  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
      {children}
    </div>
  );
}
