/**
 * CollectionMapView.jsx
 * 
 * Map view for collections (showing linked child objects) and
 * multi-location objects (showing multiple location pins).
 * 
 * Uses shared map components for consistent UX across all map views.
 * 
 * Button layout (2026 best practice):
 *   Top-right stack:  FitAll, CenterOnLocation
 *   Top-left:         NavigationInfoPanel (when navigating)
 *   Bottom-center:    RecenterButton (when panned away)
 *   Bottom-right:     AddLocationButton FAB (kantarellknappen)
 */

import React, { useState, useEffect } from 'react';
import { Navigation, X } from 'lucide-react';
import { MapContainer, Marker, Tooltip, Popup } from 'react-leaflet';
import { createColoredIcon } from '../../utils/mapIcons';
import { getTransformedImageUrl } from '../../utils/imageUtils';
import {
  BaseTileLayer,
  UserLocationMarker,
  DirectionLine,
  NavigationInfoPanel,
  MapDragDetector,
  RecenterButton,
  FitBounds,
  FitAllButton,
  CenterOnLocationButton,
  AddLocationButton,
  MapControlStack
} from './SharedMapComponents';

function CollectionMapView({ objects, categories, onSelectObject, userLocation, onAddLocation, pendingLocations = [] }) {
  const [currentUserLocation, setCurrentUserLocation] = useState(userLocation);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [hasPannedAway, setHasPannedAway] = useState(false);
  
  const positions = objects.map(obj => {
    const loc = obj.blocks.find(b => b.type === 'location');
    return { lat: loc.data.lat, lng: loc.data.lng };
  });
  
  // Include pending locations in positions for map bounds
  const allPositions = [
    ...positions,
    ...pendingLocations.map(p => ({ lat: p.lat, lng: p.lng }))
  ];
  
  const center = positions.length > 0 
    ? [
        positions.reduce((sum, p) => sum + p.lat, 0) / positions.length,
        positions.reduce((sum, p) => sum + p.lng, 0) / positions.length
      ]
    : [59.33, 18.06];

  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  // Try to get location on mount if not provided
  useEffect(() => {
    if (!currentUserLocation && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // Group objects by exact same coordinates
  const groupedByLocation = objects.reduce((acc, obj) => {
    const loc = obj.blocks.find(b => b.type === 'location');
    if (!loc) return acc;
    const key = `${loc.data.lat},${loc.data.lng}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(obj);
    return acc;
  }, {});

  return (
    <MapContainer 
      center={center} 
      zoom={10} 
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <BaseTileLayer />
      <FitBounds positions={positions} />
      
      {/* User location marker */}
      <UserLocationMarker position={currentUserLocation} />
      
      {Object.entries(groupedByLocation).map(([coordKey, groupObjects]) => {
        const [lat, lng] = coordKey.split(',').map(Number);
        const firstObj = groupObjects[0];
        const category = categories?.find(c => c.id === firstObj.type);
        const hasCollectionSelf = groupObjects.some(o => o.isCollectionSelf);
        const hasPrimaryLocation = groupObjects.some(o => o._isPrimary);
        // Gold color for collection's own location OR primary location in multi-location view
        const markerColor = (hasCollectionSelf || hasPrimaryLocation) ? '#F59E0B' : (category?.color || '#A855F7');
        const icon = createColoredIcon(markerColor);
        
        // Single object at this location
        if (groupObjects.length === 1) {
          const obj = firstObj;
          const loc = obj.blocks.find(b => b.type === 'location');
          const titleBlock = obj.blocks.find(b => b.type === 'title');
          const imageBlock = obj.blocks.find(b => b.type === 'image');
          const isCollectionSelf = obj.isCollectionSelf;
          const isPrimaryLocation = obj._isPrimary;
          
          return (
            <Marker 
              key={obj.id} 
              position={[lat, lng]} 
              icon={icon}
              zIndexOffset={(isCollectionSelf || isPrimaryLocation) ? 500 : 0}
            >
              <Popup>
                <div className="min-w-[160px]">
                  {imageBlock && (
                    <div className="w-full h-20 -mx-3 -mt-2 mb-2 overflow-hidden">
                      <img 
                        src={getTransformedImageUrl(imageBlock.data.url, 'center', 200, 80)} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="text-sm font-semibold mb-1">
                    {(isCollectionSelf || isPrimaryLocation) && <span className="text-amber-500">★ </span>}
                    {obj._locationIndex && <span className="text-blue-500">#{obj._locationIndex} </span>}
                    {titleBlock?.data?.text || 'Namnlöst'}
                  </div>
                  {loc.data.address && (
                    <div className="text-xs text-gray-600 mb-1 truncate">{loc.data.address}</div>
                  )}
                  {loc.data.note && (
                    <div className="text-xs text-gray-500 italic mb-2">"{loc.data.note}"</div>
                  )}
                  <div className="flex items-center gap-2">
                    {!isCollectionSelf && !isPrimaryLocation && (
                      <button
                        onClick={() => onSelectObject(obj)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium transition-colors"
                      >
                        Öppna
                      </button>
                    )}
                    {isCollectionSelf && (
                      <div className="flex-1 text-xs text-amber-600 font-medium">Samlingens plats</div>
                    )}
                    {isPrimaryLocation && !isCollectionSelf && (
                      <div className="flex-1 text-xs text-amber-600 font-medium">Primär plats</div>
                    )}
                    {currentUserLocation && (
                      <button
                        onClick={() => setNavigationTarget({ lat, lng, name: titleBlock?.data?.text || 'Mål' })}
                        className="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-500 transition-colors flex-shrink-0"
                        title="Visa väg"
                      >
                        <Navigation size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank')}
                      className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-500 transition-colors flex-shrink-0"
                      title="Waze"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.8-3.2c-.3-.5-.8-.8-1.4-.8H9.2c-.6 0-1.1.3-1.4.8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
                        <circle cx="7" cy="17" r="2"/>
                        <circle cx="17" cy="17" r="2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </Popup>
              {!isTouchDevice && (
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <div className="text-xs font-medium">
                    {(isCollectionSelf || isPrimaryLocation) && '★ '}
                    {obj._locationIndex && `#${obj._locationIndex} `}
                    {titleBlock?.data?.text || 'Namnlöst'}
                    {loc.data.note && <div className="text-xs font-normal italic text-gray-500">"{loc.data.note}"</div>}
                  </div>
                </Tooltip>
              )}
            </Marker>
          );
        }
        
        // Multiple objects at same location - grouped popup
        const firstLoc = firstObj.blocks.find(b => b.type === 'location');
        return (
          <Marker 
            key={coordKey} 
            position={[lat, lng]} 
            icon={icon}
            zIndexOffset={hasCollectionSelf ? 500 : 0}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-700">
                    {groupObjects.length} platser här
                  </div>
                  <div className="flex items-center gap-1">
                    {currentUserLocation && (
                      <button
                        onClick={() => setNavigationTarget({ lat, lng, name: `${groupObjects.length} platser` })}
                        className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-500 transition-colors flex-shrink-0"
                        title="Visa väg"
                      >
                        <Navigation size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank')}
                      className="w-7 h-7 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-500 transition-colors flex-shrink-0"
                      title="Waze"
                    >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.8-3.2c-.3-.5-.8-.8-1.4-.8H9.2c-.6 0-1.1.3-1.4.8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
                      <circle cx="7" cy="17" r="2"/>
                      <circle cx="17" cy="17" r="2"/>
                    </svg>
                    </button>
                  </div>
                </div>
                {firstLoc.data.address && (
                  <div className="text-xs text-gray-500 mb-2 truncate">{firstLoc.data.address}</div>
                )}
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {groupObjects.map(obj => {
                    const titleBlock = obj.blocks.find(b => b.type === 'title');
                    const loc = obj.blocks.find(b => b.type === 'location');
                    const isCollectionSelf = obj.isCollectionSelf;
                    const isPrimaryLocation = obj._isPrimary;
                    
                    return (
                      <div key={obj.id} className="border-b border-gray-100 pb-1.5 last:border-0">
                        <div className="text-xs font-medium">
                          {(isCollectionSelf || isPrimaryLocation) && <span className="text-amber-500">★ </span>}
                          {obj._locationIndex && <span className="text-blue-500">#{obj._locationIndex} </span>}
                          {titleBlock?.data?.text || 'Namnlöst'}
                        </div>
                        {loc.data.note && (
                          <div className="text-xs text-gray-500 italic">"{loc.data.note}"</div>
                        )}
                        {!isCollectionSelf && !isPrimaryLocation && (
                          <button
                            onClick={() => onSelectObject(obj)}
                            className="mt-1 px-2 py-0.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs transition-colors"
                          >
                            Öppna
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Popup>
            {!isTouchDevice && (
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div className="text-xs font-medium">
                  {(hasCollectionSelf || hasPrimaryLocation) && '★ '}
                  {groupObjects.length} platser här
                </div>
              </Tooltip>
            )}
          </Marker>
        );
      })}
      
      {/* Pending locations (saved offline, waiting to sync) */}
      {pendingLocations.map((pending, idx) => (
        <Marker 
          key={`pending-${pending.id || idx}`}
          position={[pending.lat, pending.lng]} 
          icon={createColoredIcon('#F97316')}
          zIndexOffset={100}
        >
          <Popup>
            <div className="min-w-[140px]">
              <div className="text-sm font-semibold mb-1 text-orange-600">
                ⏳ Väntar på synk
              </div>
              <div className="text-xs text-gray-600">
                #{objects.length + idx + 1} • {new Date(pending.timestamp).toLocaleString('sv-SE')}
              </div>
            </div>
          </Popup>
          {!isTouchDevice && (
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div className="text-xs font-medium text-orange-600">
                ⏳ #{objects.length + idx + 1} (väntar)
              </div>
            </Tooltip>
          )}
        </Marker>
      ))}
      
      {/* Top-right control stack – consistent layout */}
      <MapControlStack>
        <FitAllButton positions={allPositions} />
        <CenterOnLocationButton onLocationFound={setCurrentUserLocation} enableWatch />
      </MapControlStack>
      
      <MapDragDetector onPanned={() => setHasPannedAway(true)} />
      <RecenterButton show={hasPannedAway} userLocation={currentUserLocation} />
      <DirectionLine from={currentUserLocation} to={navigationTarget} />
      
      {onAddLocation && (
        <AddLocationButton 
          onAddLocation={onAddLocation} 
          onLocationUpdate={setCurrentUserLocation} 
          pendingCount={pendingLocations.length} 
        />
      )}
      
      {/* Navigation info panel – top-left overlay */}
      <NavigationInfoPanel 
        target={navigationTarget} 
        userLocation={currentUserLocation} 
        onClose={() => setNavigationTarget(null)} 
      />
    </MapContainer>
  );
}

export default CollectionMapView;
