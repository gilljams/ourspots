import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, Marker, Tooltip, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { createColoredIcon, createAreaIcon } from '../utils/mapIcons';
import { PREDEFINED_ICONS } from '../utils/iconHelpers';
import {
  BaseTileLayer,
  UserLocationMarker,
  DirectionLine,
  NavigationInfoPanel,
  MapDragDetector,
  RecenterButton,
  CenterOnLocationButton,
  TrackingToggleButton,
  InvalidateSizeOnChange,
  MapControlStack
} from './map/SharedMapComponents';

// Extracted outside MapView to prevent unmount/remount on every parent render
const MarkerWithPopup = React.memo(function MarkerWithPopup({ object, categories, onSelectObject, displayUserLocation, isTouchDevice, onShowDirection }) {
  const titleBlock = object.blocks.find(b => b.type === 'title');
  const position = [object._position.lat, object._position.lng];
  const category = categories.find(c => c.id === object.type);
  const markerColor = category?.color || '#3B82F6';
  const categoryLabel = category?.label || (PREDEFINED_ICONS[object.type]?.label || 'Objekt');
  const coloredIcon = object._position.isArea ? createAreaIcon(markerColor) : createColoredIcon(markerColor);
  const showPositionNumber = object._totalPositions > 1;
  const pinLabel = showPositionNumber ? `Pin ${object._positionIndex + 1}` : '';

  if (isTouchDevice) {
    return (
      <Marker position={position} icon={coloredIcon}>
        <Popup>
          <div className="min-w-[180px]">
            <div className="text-sm font-semibold mb-1">{titleBlock?.data?.text || 'Namnlöst'}</div>
            {showPositionNumber && (
              <div className="text-xs font-semibold text-orange-600 mb-1">{pinLabel}</div>
            )}
            <div className="text-xs text-gray-600 mb-2">{categoryLabel}</div>
            <div className="flex gap-2">
              <button
                onClick={() => onSelectObject(object)}
                className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
              >
                Detaljer
              </button>
              {displayUserLocation && (
                <button
                  onClick={() => onShowDirection(object)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                >
                  Visa väg
                </button>
              )}
            </div>
          </div>
        </Popup>
      </Marker>
    );
  }

  return (
    <Marker position={position} icon={coloredIcon} eventHandlers={{ click: () => onSelectObject(object) }}>
      <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
        <div className="text-xs">
          <div className="font-semibold">{titleBlock?.data?.text || 'Namnlöst'}</div>
          {showPositionNumber && <div className="text-orange-400 font-semibold">{pinLabel}</div>}
          <div className="text-gray-500">{categoryLabel}</div>
        </div>
      </Tooltip>
    </Marker>
  );
});

// Custom cluster icon creator (stable reference via module scope)
const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  let size = 40;
  let fontSize = 16;
  
  if (count > 100) { size = 60; fontSize = 20; }
  else if (count > 20) { size = 50; fontSize = 18; }

  return L.divIcon({
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background-color: #3B82F6; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: bold; font-size: ${fontSize}px; color: white;
      border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    ">${count}</div>`,
    className: 'cluster-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

function MapView({ objects, onSelectObject, currentUser, userLocation, categories, mapCenter, showFilters, isGlobalTracking, startGlobalTracking, stopGlobalTracking, liveUserLocation, setLiveUserLocation }) {
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [mapHeight, setMapHeight] = useState('70vh');
  const [hasPannedAway, setHasPannedAway] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const containerRef = useRef(null);

  // The position to show on map - live tracking takes priority over initial userLocation
  const displayUserLocation = liveUserLocation || userLocation;

  // Calculate available height dynamically (use visualViewport for iOS Safari toolbar resize)
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const vh = window.visualViewport?.height || window.innerHeight;
        const availableHeight = vh - rect.top - 24;
        setMapHeight(`${Math.max(300, availableHeight)}px`);
      }
    };
    
    const timer = setTimeout(updateHeight, 50);
    window.addEventListener('resize', updateHeight);
    window.visualViewport?.addEventListener('resize', updateHeight);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
      window.visualViewport?.removeEventListener('resize', updateHeight);
    };
  }, [showFilters]);

  // Helper to get all positions for an object (can have multiple location blocks)
  const getObjectPositions = (obj) => {
    const locationBlocks = obj.blocks.filter(b => b.type === 'location');
    const positions = [];
    
    locationBlocks.forEach(block => {
      if (block.data?.lat && block.data?.lng) {
        positions.push({ lat: block.data.lat, lng: block.data.lng, isArea: false });
      }
    });
    
    if (positions.length > 0) return positions;
    
    // No own coords - calculate from children
    const children = objects.filter(child => child.parentId === obj.id);
    const childrenWithCoords = children.filter(child => {
      const childLoc = child.blocks.find(b => b.type === 'location');
      return childLoc?.data?.lat && childLoc?.data?.lng;
    });
    
    if (childrenWithCoords.length > 0) {
      const avgLat = childrenWithCoords.reduce((sum, child) => {
        const childLoc = child.blocks.find(b => b.type === 'location');
        return sum + childLoc.data.lat;
      }, 0) / childrenWithCoords.length;
      
      const avgLng = childrenWithCoords.reduce((sum, child) => {
        const childLoc = child.blocks.find(b => b.type === 'location');
        return sum + childLoc.data.lng;
      }, 0) / childrenWithCoords.length;
      
      return [{ lat: avgLat, lng: avgLng, isArea: true }];
    }
    
    return [];
  };

  // Create marker objects - one marker per position (memoized)
  const markersData = useMemo(() => {
    const result = [];
    objects.forEach(obj => {
      const positions = getObjectPositions(obj);
      positions.forEach((position, index) => {
        result.push({
          ...obj,
          _position: position,
          _positionIndex: index,
          _totalPositions: positions.length
        });
      });
    });
    return result;
  }, [objects]);

  // Priority: mapCenter > displayUserLocation > average of markers > Stockholm
  const defaultCenter = displayUserLocation 
    ? [displayUserLocation.lat, displayUserLocation.lng]
    : markersData.length > 0
      ? [
          markersData.reduce((sum, m) => sum + m._position.lat, 0) / markersData.length,
          markersData.reduce((sum, m) => sum + m._position.lng, 0) / markersData.length
        ]
      : [59.33, 18.06];
  
  const center = defaultCenter;
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  // Stable callback for showing direction from marker
  const handleShowDirection = useCallback((object) => {
    const titleBlock = object.blocks.find(b => b.type === 'title');
    setNavigationTarget({
      lat: object._position.lat,
      lng: object._position.lng,
      name: titleBlock?.data?.text || 'Mål'
    });
  }, []);

  // Request location permission when map view is first opened
  useEffect(() => {
    if (!hasRequestedPermission && 'geolocation' in navigator) {
      setHasRequestedPermission(true);
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 });
    }
  }, [hasRequestedPermission]);

  return (
    <div ref={containerRef} className="w-full relative z-10 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-gray-900/80 transition-all duration-300" style={{ height: mapHeight }}>
      <MapContainer 
        center={mapCenter || center} 
        zoom={mapCenter ? 14 : (displayUserLocation ? 13 : (markersData.length > 0 ? 7 : 6))} 
        style={{ height: '100%', width: '100%' }} 
        key={mapCenter ? `${mapCenter.lat}-${mapCenter.lng}` : (userLocation ? `user-${userLocation.lat}-${userLocation.lng}` : 'default')}
      >
        <BaseTileLayer />
        <UserLocationMarker position={displayUserLocation} isTracking={isGlobalTracking} />
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          iconCreateFunction={createClusterIcon}
        >
          {markersData.map((markerObj) => (
            <MarkerWithPopup 
              key={`${markerObj.id}-${markerObj._positionIndex}`} 
              object={markerObj} 
              categories={categories}
              onSelectObject={onSelectObject}
              displayUserLocation={displayUserLocation}
              isTouchDevice={isTouchDevice}
              onShowDirection={handleShowDirection}
            />
          ))}
        </MarkerClusterGroup>
        
        {/* Top-right control stack – consistent 2026 map UX layout */}
        <MapControlStack>
          <CenterOnLocationButton onLocationFound={setLiveUserLocation} />
          <TrackingToggleButton 
            isTracking={isGlobalTracking} 
            onStart={() => { startGlobalTracking(); setHasPannedAway(false); }} 
            onStop={() => { stopGlobalTracking(); setHasPannedAway(false); }} 
          />
        </MapControlStack>
        
        <MapDragDetector onPanned={() => { if (isGlobalTracking) setHasPannedAway(true); }} />
        <RecenterButton show={isGlobalTracking && hasPannedAway} userLocation={liveUserLocation} />
        <DirectionLine from={displayUserLocation} to={navigationTarget} />
        <InvalidateSizeOnChange deps={showFilters} />
      </MapContainer>
      
      {/* Navigation info panel – top-center, outside MapContainer */}
      <NavigationInfoPanel 
        target={navigationTarget} 
        userLocation={displayUserLocation} 
        onClose={() => setNavigationTarget(null)} 
      />
    </div>
  );
}

export default MapView;
