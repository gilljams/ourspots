import React, { useState, useEffect, useRef } from 'react';
import { Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Tooltip, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { createColoredIcon, createUserIcon, createAreaIcon } from '../utils/mapIcons';
import { PREDEFINED_ICONS } from '../utils/iconHelpers';

function MapView({ objects, onSelectObject, currentUser, userLocation, categories, mapCenter, showFilters }) {
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [mapHeight, setMapHeight] = useState('70vh');
  const containerRef = useRef(null);

  // Calculate available height dynamically
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 24; // 24px bottom padding
        setMapHeight(`${Math.max(300, availableHeight)}px`);
      }
    };
    
    // Initial calculation with small delay to ensure DOM is ready
    const timer = setTimeout(updateHeight, 50);
    window.addEventListener('resize', updateHeight);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
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

  // Priority: 1. mapCenter (from clicking object), 2. userLocation, 3. average of markers, 4. Stockholm
  const defaultCenter = userLocation 
    ? [userLocation.lat, userLocation.lng]
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

  // Component to handle center on user location
  function CenterOnLocationButton() {
    const map = useMapEvents({});
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

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 13);
        },
        (error) => {
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
          enableHighAccuracy: false, 
          timeout: 20000,
          maximumAge: 30000
        }
      );
    };
    return (
      <button
        onClick={handleCenterOnUser}
        className="absolute top-4 right-4 z-[1000] p-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all flex items-center justify-center"
        title="Gå till min position"
      >
        <Navigation size={20} />
      </button>
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
      return (
        <Marker position={position} icon={coloredIcon}>
          <Popup>
            <div className="min-w-[180px]">
              <div className="text-sm font-semibold mb-1">{titleBlock?.data?.text || 'Namnlöst'}</div>
              {showPositionNumber && (
                <div className="text-xs font-semibold text-orange-600 mb-1">{pinLabel}</div>
              )}
              <div className="text-xs text-gray-600 mb-2">{categoryLabel}</div>
              <button
                onClick={() => onSelectObject(object)}
                className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-xs"
              >
                Visa detaljer
              </button>
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
      <MapContainer center={mapCenter || center} zoom={mapCenter ? 14 : (userLocation ? 13 : (markersData.length > 0 ? 7 : 6))} style={{ height: '100%', width: '100%' }} key={mapCenter ? `${mapCenter.lat}-${mapCenter.lng}` : (userLocation ? `user-${userLocation.lat}-${userLocation.lng}` : 'default')}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()} zIndexOffset={1000}>
            <Tooltip permanent={false} direction="top">Din plats</Tooltip>
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
        <InvalidateSizeOnChange showFilters={showFilters} />
      </MapContainer>
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
