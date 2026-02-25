import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Locate, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Tooltip, Popup, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { createColoredIcon, createUserIcon, createAreaIcon } from '../utils/mapIcons';
import { PREDEFINED_ICONS } from '../utils/iconHelpers';

function MapView({ objects, onSelectObject, currentUser, userLocation, categories, mapCenter, showFilters, isGlobalTracking, startGlobalTracking, stopGlobalTracking, liveUserLocation, setLiveUserLocation }) {
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [mapHeight, setMapHeight] = useState('70vh');
  const [hasPannedAway, setHasPannedAway] = useState(false); // User manually panned during tracking
  const [navigationTarget, setNavigationTarget] = useState(null); // Target pin for direction line
  const containerRef = useRef(null);

  // Calculate distance between two points in meters
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Format distance for display
  const formatDistance = (meters) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // The position to show on map - live tracking takes priority over initial userLocation
  const displayUserLocation = liveUserLocation || userLocation;

  // Calculate available height dynamically (use visualViewport for iOS Safari toolbar resize)
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const vh = window.visualViewport?.height || window.innerHeight;
        const availableHeight = vh - rect.top - 24; // 24px bottom padding
        setMapHeight(`${Math.max(300, availableHeight)}px`);
      }
    };
    
    // Initial calculation with small delay to ensure DOM is ready
    const timer = setTimeout(updateHeight, 50);
    window.addEventListener('resize', updateHeight);
    // visualViewport fires resize when iOS Safari toolbar shows/hides
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
    
    // Add all location blocks with coordinates
    locationBlocks.forEach(block => {
      if (block.data?.lat && block.data?.lng) {
        positions.push({
          lat: block.data.lat,
          lng: block.data.lng,
          isArea: false
        });
      }
    });
    
    // If has positions, return them
    if (positions.length > 0) {
      return positions;
    }
    
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
      
      return [{
        lat: avgLat,
        lng: avgLng,
        isArea: true
      }];
    }
    
    return [];
  };

  // Create marker objects - one marker per position
  const markersData = [];
  objects.forEach(obj => {
    const positions = getObjectPositions(obj);
    positions.forEach((position, index) => {
      markersData.push({
        ...obj,
        _position: position,
        _positionIndex: index,
        _totalPositions: positions.length
      });
    });
  });

  // Priority: 1. mapCenter (from clicking object), 2. displayUserLocation, 3. average of markers, 4. Stockholm
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

  // Request location permission when map view is first opened
  useEffect(() => {
    if (!hasRequestedPermission && 'geolocation' in navigator) {
      setHasRequestedPermission(true);
      // Trigger permission request silently (will show browser prompt if not yet answered)
      navigator.geolocation.getCurrentPosition(
        () => {}, // Success - do nothing, just wanted to trigger the prompt
        () => {}, // Error - ignore, user will see error message if they click the button
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, [hasRequestedPermission]);

  // Component to center on user location (one-time)
  function CenterOnLocationButton() {
    const map = useMap();
    const [isLocating, setIsLocating] = useState(false);
    
    const handleCenterOnUser = async () => {
      if (!('geolocation' in navigator)) {
        alert('Din enhet stöder inte platsåtkomst');
        return;
      }

      // Check if we can query permissions (not all browsers support this)
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          if (result.state === 'denied') {
            alert('Platsåtkomst är blockerad. Gå till Safari-inställningar > Sekretess > Platstjänster och aktivera för denna webbplats.');
            return;
          }
        } catch (e) {
          // Permissions API not fully supported, continue anyway
        }
      }

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 15);
          setLiveUserLocation({ lat: latitude, lng: longitude });
          setIsLocating(false);
        },
        (error) => {
          setIsLocating(false);
          let message = 'Kunde inte hämta din position. ';
          if (error.code === 1) {
            message = 'Du nekade platsåtkomst. För att aktivera: gå till Safari-inställningar > denna webbplats > Plats och välj "Fråga" eller "Tillåt".';
          } else if (error.code === 2) {
            message += 'Position inte tillgänglig. Kontrollera att Platstjänster är aktiverade i iOS-inställningar.';
          } else if (error.code === 3) {
            message += 'Timeout - försök igen om en stund.';
          }
          alert(message);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000,
          maximumAge: 5000
        }
      );
    };
    
    return (
      <button
        onClick={handleCenterOnUser}
        disabled={isLocating}
        className={`absolute top-4 right-4 z-[1000] w-11 h-11 rounded-lg ${isLocating ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'} text-white shadow-lg transition-all flex items-center justify-center`}
        title="Centrera på min position"
      >
        <Locate size={20} />
        {isLocating && (
          <span className="absolute inset-0 rounded-lg border-2 border-white/50 animate-ping" />
        )}
      </button>
    );
  }

  // Component to toggle continuous tracking (uses global tracking from App.jsx)
  function TrackingToggleButton() {
    const map = useMap();
    
    const handleToggleTracking = () => {
      if (!('geolocation' in navigator)) {
        alert('Din enhet stöder inte platsåtkomst');
        return;
      }

      // If already tracking, stop it
      if (isGlobalTracking) {
        stopGlobalTracking();
        setHasPannedAway(false);
        return;
      }

      // Start tracking and center map
      startGlobalTracking();
      setHasPannedAway(false);
      
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
        onClick={handleToggleTracking}
        className={`absolute top-4 right-16 z-[1000] w-11 h-11 rounded-lg ${isGlobalTracking ? 'bg-green-500 hover:bg-green-600' : 'bg-white/10 hover:bg-white/20 border border-white/20'} text-white shadow-lg transition-all flex items-center justify-center`}
        title={isGlobalTracking ? 'Stoppa spårning' : 'Spåra min position'}
      >
        <Navigation size={20} className={isGlobalTracking ? '' : 'text-gray-300'} />
        {isGlobalTracking && (
          <span className="absolute inset-0 rounded-lg border-2 border-white/50 animate-ping" />
        )}
      </button>
    );
  }

  // Detect when user manually pans/drags the map
  function MapDragDetector() {
    useMapEvents({
      dragstart: () => {
        if (isGlobalTracking) {
          setHasPannedAway(true);
        }
      }
    });
    return null;
  }

  // Button to recenter on user when panned away during tracking
  function RecenterButton() {
    const map = useMap();
    
    if (!isGlobalTracking || !hasPannedAway || !liveUserLocation) return null;
    
    const handleRecenter = () => {
      map.setView([liveUserLocation.lat, liveUserLocation.lng], Math.max(map.getZoom(), 15), { animate: true });
      setHasPannedAway(false);
    };
    
    return (
      <button
        onClick={handleRecenter}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all flex items-center gap-2 text-sm font-medium"
      >
        <Locate size={16} />
        Centrera på mig
      </button>
    );
  }

  // Direction line from user to target (Polyline only, rendered inside MapContainer)
  function DirectionLine() {
    if (!navigationTarget || !displayUserLocation) return null;
    
    return (
      <Polyline
        positions={[
          [displayUserLocation.lat, displayUserLocation.lng],
          [navigationTarget.lat, navigationTarget.lng]
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

  // Navigation info panel (rendered outside MapContainer for proper DOM positioning)
  function NavigationInfoPanel() {
    if (!navigationTarget || !displayUserLocation) return null;
    
    const distance = calculateDistance(
      displayUserLocation.lat, displayUserLocation.lng,
      navigationTarget.lat, navigationTarget.lng
    );
    
    return (
      <div className="absolute top-4 left-16 z-[1000] bg-gray-900/90 backdrop-blur text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-3">
        <div>
          <div className="text-xs text-gray-400">Till {navigationTarget.name}</div>
          <div className="text-lg font-bold text-emerald-400">{formatDistance(distance)}</div>
        </div>
        <button
          onClick={() => setNavigationTarget(null)}
          className="p-1 hover:bg-white/10 rounded"
          title="Ta bort linje"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  function MarkerWithPopup({ object }) {
    const titleBlock = object.blocks.find(b => b.type === 'title');
    const position = [object._position.lat, object._position.lng];
    // Find category for color
    const category = categories.find(c => c.id === object.type);
    const markerColor = category?.color || '#3B82F6';
    const categoryLabel = category?.label || (PREDEFINED_ICONS[object.type]?.label || 'Objekt');
    const coloredIcon = object._position.isArea ? createAreaIcon(markerColor) : createColoredIcon(markerColor);
    
    // Show position number if multiple
    const showPositionNumber = object._totalPositions > 1;
    const pinLabel = showPositionNumber ? `Pin ${object._positionIndex + 1}` : '';

    if (isTouchDevice) {
      const handleShowDirection = () => {
        setNavigationTarget({
          lat: object._position.lat,
          lng: object._position.lng,
          name: titleBlock?.data?.text || 'Mål'
        });
      };

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
                  className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-xs"
                >
                  Detaljer
                </button>
                {displayUserLocation && (
                  <button
                    onClick={handleShowDirection}
                    className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
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
  }

  // Custom cluster icon creator for better visibility
  const createClusterIcon = (cluster) => {
    const count = cluster.getChildCount();
    let size = 40;
    let fontSize = 16;
    
    if (count > 100) {
      size = 60;
      fontSize = 20;
    } else if (count > 20) {
      size = 50;
      fontSize = 18;
    }

    return L.divIcon({
      html: `<div style="
        width: ${size}px;
        height: ${size}px;
        background-color: #3B82F6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${fontSize}px;
        color: white;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      ">${count}</div>`,
      className: 'cluster-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  return (
    <div ref={containerRef} className="w-full relative z-10 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-gray-900/80 transition-all duration-300" style={{ height: mapHeight }}>
      <MapContainer center={mapCenter || center} zoom={mapCenter ? 14 : (displayUserLocation ? 13 : (markersData.length > 0 ? 7 : 6))} style={{ height: '100%', width: '100%' }} key={mapCenter ? `${mapCenter.lat}-${mapCenter.lng}` : (userLocation ? `user-${userLocation.lat}-${userLocation.lng}` : 'default')}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {displayUserLocation && (
          <Marker position={[displayUserLocation.lat, displayUserLocation.lng]} icon={createUserIcon()} zIndexOffset={1000}>
            <Tooltip permanent={false} direction="top">{isGlobalTracking ? 'Din plats (spårar)' : 'Din plats'}</Tooltip>
          </Marker>
        )}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          iconCreateFunction={createClusterIcon}
        >
          {markersData.map((markerObj, idx) => (
            <MarkerWithPopup key={`${markerObj.id}-${markerObj._positionIndex}`} object={markerObj} />
          ))}
        </MarkerClusterGroup>
        <CenterOnLocationButton />
        <TrackingToggleButton />
        <MapDragDetector />
        <RecenterButton />
        <DirectionLine />
        <InvalidateSizeOnChange showFilters={showFilters} />
      </MapContainer>
      <NavigationInfoPanel />
    </div>
  );
}

// Component to invalidate map size when filters change
function InvalidateSizeOnChange({ showFilters }) {
  const map = useMap();
  useEffect(() => {
    // Small delay to let DOM update, then invalidate
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [showFilters, map]);
  return null;
}

export default MapView;
