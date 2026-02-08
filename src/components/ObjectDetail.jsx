import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Settings, ChevronDown, ChevronUp,
  Share2, Users, UserMinus, Home, List, LayoutGrid, FileText, Copy, BarChart3, ClipboardList, Link2, X, Search, Check, ExternalLink, Map as MapIcon, Navigation, Maximize2, Target
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getIconComponent, PREDEFINED_ICONS, emailToKey } from '../utils/iconHelpers';
import { getTransformedImageUrl, getFocalPointStyles } from '../utils/imageUtils';
import { blockComponents } from './blocks';
import DeleteConfirmModal from './DeleteConfirmModal';
import LeaderboardModal from './LeaderboardModal';
import DistributionModal from './DistributionModal';
import { FullscreenTextEditor } from './BlockEditor';
import { MapContainer, TileLayer, Marker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { createColoredIcon, createUserIcon } from '../utils/mapIcons';

// Folder icon - we'll define it locally since it's only used here
const Folder = ({ size = 24, ...props }) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

// Component to fit map bounds to all markers - only runs once on mount
function FitBounds({ positions }) {
  const map = useMap();
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (hasInitialized.current) return;
    if (positions.length === 0) return;
    
    hasInitialized.current = true;
    
    if (positions.length === 1) {
      map.setView([positions[0].lat, positions[0].lng], 13);
    } else {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [map, positions]);
  
  return null;
}

// Mini map view for collection
function CollectionMapView({ objects, categories, onSelectObject, userLocation, onAddLocation, pendingLocations = [] }) {
  const [currentUserLocation, setCurrentUserLocation] = useState(userLocation);
  
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

  // Request user location
  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {}, // Ignore errors silently
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  // Try to get location on mount if not provided
  useEffect(() => {
    if (!currentUserLocation) {
      requestLocation();
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
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FitBounds positions={positions} />
      
      {/* User location marker */}
      {currentUserLocation && (
        <Marker 
          position={[currentUserLocation.lat, currentUserLocation.lng]} 
          icon={createUserIcon()}
          zIndexOffset={1000}
        >
          <Tooltip permanent={false} direction="top">Din plats</Tooltip>
        </Marker>
      )}
      
      {Object.entries(groupedByLocation).map(([coordKey, groupObjects]) => {
        const [lat, lng] = coordKey.split(',').map(Number);
        const firstObj = groupObjects[0];
        const category = categories?.find(c => c.id === firstObj.type);
        const hasCollectionSelf = groupObjects.some(o => o.isCollectionSelf);
        const hasPrimaryLocation = groupObjects.some(o => o._isPrimary);
        // Gold color for collection's own location OR primary location in multi-location view
        const markerColor = (hasCollectionSelf || hasPrimaryLocation) ? '#F59E0B' : (category?.color || '#A855F7');
        const icon = createColoredIcon(markerColor);
        
        // Single object at this location - render as before
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
                        className="flex-1 px-3 py-1.5 rounded bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium transition-colors"
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
                    <button
                      onClick={() => window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank')}
                      className="w-8 h-8 rounded bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-500 transition-colors flex-shrink-0"
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
        
        // Multiple objects at same location - render grouped popup
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
                  <button
                    onClick={() => window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank')}
                    className="w-7 h-7 rounded bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-500 transition-colors flex-shrink-0"
                    title="Waze"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.8-3.2c-.3-.5-.8-.8-1.4-.8H9.2c-.6 0-1.1.3-1.4.8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
                      <circle cx="7" cy="17" r="2"/>
                      <circle cx="17" cy="17" r="2"/>
                    </svg>
                  </button>
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
                            className="mt-1 px-2 py-0.5 rounded bg-purple-500 hover:bg-purple-600 text-white text-xs transition-colors"
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
          icon={createColoredIcon('#F97316')} // Orange for pending
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
      
      {/* Map control buttons */}
      <CenterOnLocationButton onLocationFound={setCurrentUserLocation} />
      <FitAllButton positions={allPositions} />
      {onAddLocation && <AddLocationButton onAddLocation={onAddLocation} onLocationUpdate={setCurrentUserLocation} pendingCount={pendingLocations.length} />}
    </MapContainer>
  );
}

// Button to center on user location with optional continuous tracking
function CenterOnLocationButton({ onLocationFound }) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const watchIdRef = useRef(null);
  
  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);
  
  const handleCenterOnUser = () => {
    if (!('geolocation' in navigator)) {
      alert('Din enhet stöder inte platsåtkomst');
      return;
    }
    
    // If already watching, toggle it off
    if (isWatching) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsWatching(false);
      return;
    }
    
    setIsLocating(true);
    
    // First get current position to center
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 15);
        if (onLocationFound) {
          onLocationFound({ lat: latitude, lng: longitude });
        }
        setIsLocating(false);
        
        // Start continuous watching
        setIsWatching(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            if (onLocationFound) {
              onLocationFound({ lat, lng });
            }
            // Optionally keep map centered on user
            map.setView([lat, lng], map.getZoom(), { animate: true });
          },
          (err) => {
            console.log('Watch position error:', err);
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
        );
      },
      (error) => {
        setIsLocating(false);
        let message = 'Kunde inte hämta din position. ';
        if (error.code === 1) {
          message = 'Du nekade platsåtkomst.';
        }
        alert(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };
  
  return (
    <button
      onClick={handleCenterOnUser}
      disabled={isLocating}
      className={`absolute top-4 right-16 z-[1000] w-11 h-11 rounded-lg ${isWatching ? 'bg-green-500 hover:bg-green-600' : isLocating ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'} text-white shadow-lg transition-all flex items-center justify-center`}
      title={isWatching ? 'Stoppa positionsspårning' : 'Följ min position'}
      style={{ position: 'absolute' }}
    >
      <Navigation size={20} />
      {/* Pulsing ring indicator when tracking */}
      {(isLocating || isWatching) && (
        <span className="absolute inset-0 rounded-lg border-2 border-white/50 animate-ping" />
      )}
    </button>
  );
}

// Button to fit all markers in view
function FitAllButton({ positions }) {
  const map = useMap();
  
  const handleFitAll = () => {
    if (positions.length === 0) return;
    
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
      className="absolute top-4 right-4 z-[1000] p-3 rounded-lg bg-purple-500 hover:bg-purple-600 text-white shadow-lg transition-all flex items-center justify-center"
      title="Visa alla platser"
      style={{ position: 'absolute' }}
    >
      <Maximize2 size={20} />
    </button>
  );
}

// Button to add a new location to the object (kantarellknappen)
function AddLocationButton({ onAddLocation, onLocationUpdate, pendingCount = 0 }) {
  const map = useMap();
  const [isAdding, setIsAdding] = useState(false);
  
  const handleAddLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Din enhet stöder inte platsåtkomst');
      return;
    }
    
    setIsAdding(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = { lat: latitude, lng: longitude };
        
        // Update user location marker
        if (onLocationUpdate) {
          onLocationUpdate(newPos);
        }
        
        // Add the location to the object
        if (onAddLocation) {
          onAddLocation(newPos);
        }
        
        // Center map on new location
        map.setView([latitude, longitude], 14);
        
        setIsAdding(false);
      },
      (error) => {
        setIsAdding(false);
        let message = 'Kunde inte hämta din position. ';
        if (error.code === 1) {
          message = 'Du nekade platsåtkomst.';
        }
        alert(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };
  
  return (
    <button
      onClick={handleAddLocation}
      disabled={isAdding}
      className={`absolute bottom-4 right-4 z-[1000] p-3 rounded-lg shadow-lg transition-all flex items-center justify-center ${
        isAdding 
          ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white animate-pulse shadow-orange-500/30' 
          : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-orange-500/30'
      }`}
      title="Lägg till ny plats här"
      style={{ position: 'absolute' }}
    >
      <Target size={20} />
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {pendingCount}
        </span>
      )}
    </button>
  );
}

// Helper to get/set pending locations from localStorage
const PENDING_LOCATIONS_KEY = 'ourspots_pending_locations';

function getPendingLocations(objectId) {
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_LOCATIONS_KEY) || '{}');
    return all[objectId] || [];
  } catch {
    return [];
  }
}

function savePendingLocation(objectId, coords) {
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_LOCATIONS_KEY) || '{}');
    const pending = all[objectId] || [];
    pending.push({
      id: `pending_${Date.now()}`,
      lat: coords.lat,
      lng: coords.lng,
      timestamp: Date.now()
    });
    all[objectId] = pending;
    localStorage.setItem(PENDING_LOCATIONS_KEY, JSON.stringify(all));
    return pending;
  } catch {
    return [];
  }
}

function clearPendingLocations(objectId) {
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_LOCATIONS_KEY) || '{}');
    delete all[objectId];
    localStorage.setItem(PENDING_LOCATIONS_KEY, JSON.stringify(all));
  } catch {
    // Ignore
  }
}

function ObjectDetail({ object, onClose, onEdit, onDelete, onDuplicate, onBlockUpdate, currentUser, userDisplayName, userLocation, showQuickCapture, allObjects, onNavigate, onGoBack, previousObject, categories, isAdmin, onShowOnMap, onShare, onLeaveShare, collections, onAddToCollection, onRemoveFromCollection, onUpdateLinkedNote, onAddLinkedUrl, onUpdateLinkedUrl, onRemoveLinkedUrl, onReorderLinked }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showManageSection, setShowManageSection] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showAddObjectPicker, setShowAddObjectPicker] = useState(false);
  const [objectSearchQuery, setObjectSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [linkedEditMode, setLinkedEditMode] = useState(false);
  const [showAddUrlForm, setShowAddUrlForm] = useState(false);
  const [newUrlTitle, setNewUrlTitle] = useState('');
  const [newUrlValue, setNewUrlValue] = useState('');
  const [newUrlNote, setNewUrlNote] = useState('');
  const [editingUrlId, setEditingUrlId] = useState(null);
  const [childViewMode, setChildViewMode] = useState(() => {
    return localStorage.getItem('ourspots-child-view-mode') || 'grid';
  });
  const [leaderboardModalData, setLeaderboardModalData] = useState(null); // { blockIndex, data }
  const [textEditModalData, setTextEditModalData] = useState(null); // { blockIndex, content, title }
  const [distributionModalData, setDistributionModalData] = useState(null); // { blockIndex, data }
  const [showCollectionMap, setShowCollectionMap] = useState(false); // For collection map modal
  const [showMultiLocationMap, setShowMultiLocationMap] = useState(false); // For multi-location objects map
  const [pendingLocations, setPendingLocations] = useState(() => getPendingLocations(object.id));
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Centralized audio state for coordinating between LocationBlock and ImageBlock
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef(null);
  
  // Track online status reactively
  useEffect(() => {
    const handleOnlineChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);
    return () => {
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
    };
  }, []);
  
  // Sync pending locations when online
  useEffect(() => {
    const syncPendingLocations = async () => {
      const pending = getPendingLocations(object.id);
      if (pending.length === 0 || !isOnline) return;
      
      try {
        // Get fresh object data
        const currentBlocks = object.blocks || [];
        const newBlocks = pending.map(p => ({
          type: 'location',
          data: { lat: p.lat, lng: p.lng, address: '' }
        }));
        
        await updateDoc(doc(db, 'objects', object.id), {
          blocks: [...currentBlocks, ...newBlocks]
        });
        
        // Clear pending after successful sync
        clearPendingLocations(object.id);
        setPendingLocations([]);
        
        if (pending.length > 0) {
          alert(`${pending.length} sparade platser synkade!`);
        }
      } catch (err) {
        console.error('Failed to sync pending locations:', err);
        // Keep pending, will try again later
      }
    };
    
    // Sync on mount and when isOnline changes to true
    syncPendingLocations();
  }, [object.id, object.blocks, isOnline]);
  
  const toggleChildViewMode = () => {
    const newMode = childViewMode === 'grid' ? 'list' : 'grid';
    setChildViewMode(newMode);
    localStorage.setItem('ourspots-child-view-mode', newMode);
  };
  
  // Swipe to close state
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const modalRef = useRef(null);
  const manageSectionRef = useRef(null);
  
  // Scroll manage section into view when opened
  useEffect(() => {
    if (showManageSection && manageSectionRef.current) {
      setTimeout(() => {
        manageSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50); // Small delay to let the animation start
    }
  }, [showManageSection]);
  
  const SWIPE_THRESHOLD = 30;
  const CLOSE_THRESHOLD = 150;
  const RESISTANCE = 0.5;
  
  const handleTouchStart = (e) => {
    // Don't capture swipe if touching interactive elements
    const target = e.target;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('[role="button"]')) {
      return;
    }
    setTouchStart(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setIsSwipeActive(false);
  };
  
  const handleTouchMove = (e) => {
    if (touchStart === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStart;
    const deltaY = currentY - touchStartY;
    
    if (!isSwipeActive) {
      if (deltaX > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        setIsSwipeActive(true);
        e.preventDefault();
      } else if (Math.abs(deltaY) > 10) {
        setTouchStart(null);
        return;
      } else {
        return;
      }
    }
    
    if (deltaX > SWIPE_THRESHOLD) {
      e.preventDefault();
      const adjustedDelta = (deltaX - SWIPE_THRESHOLD) * RESISTANCE;
      setTouchDelta(adjustedDelta);
    }
  };
  
  const handleTouchEnd = () => {
    if (touchDelta > CLOSE_THRESHOLD * RESISTANCE) {
      setTouchDelta(200);
      setTimeout(onClose, 200);
    } else {
      setTouchDelta(0);
    }
    setTouchStart(null);
    setTouchStartY(null);
    setIsSwipeActive(false);
  };
  
  // Find category to get icon
  const category = categories.find(c => c.id === object.type);
  const isCollection = object.isCollection;
  const IconComponent = isCollection 
    ? ClipboardList 
    : (category ? getIconComponent(category.icon) : (PREDEFINED_ICONS[object.type]?.icon || Home));
  // Use consistent blue color for UI (category colors reserved for map pins)
  const categoryColor = '#3B82F6';
  const isOwner = currentUser && object.ownerId === currentUser.uid;
  const isSharedWithMe = object.isSharedWithMe;
  const userEmailKey = currentUser?.email ? emailToKey(currentUser.email.toLowerCase()) : null;
  const myShareRole = isSharedWithMe && userEmailKey ? object.shares?.[userEmailKey]?.role : null;
  const canEdit = isOwner || isAdmin || myShareRole === 'editor';
  const canManage = isOwner || isAdmin;
  // For UI purposes: show "Delning" only for viewers (readers), editors see "Hantera objekt"
  const showAsSharedView = !isOwner && !isAdmin && isSharedWithMe && myShareRole !== 'editor';
  
  const childObjects = allObjects.filter(o => o.parentId === object.id);
  const parentObject = object.parentId ? allObjects.find(o => o.id === object.parentId) : null;
  
  // For collections: get linked objects that user has access to
  const totalLinkedCount = isCollection ? (object.linkedObjectIds || []).length : 0;
  const linkedObjects = isCollection 
    ? (object.linkedObjectIds || [])
        .map(id => allObjects.find(o => o.id === id))
        .filter(Boolean)
    : [];
  const hiddenLinkedCount = totalLinkedCount - linkedObjects.length;
  
  // Build unified ordered list of linked items (objects + URLs)
  const orderedLinkedItems = (() => {
    if (!isCollection) return [];
    
    const linkedOrder = object.linkedOrder || [];
    const linkedUrls = object.linkedUrls || [];
    const objectsMap = new Map(linkedObjects.map(o => [o.id, o]));
    const urlsMap = new Map(linkedUrls.map(u => [u.id, u]));
    
    // If no linkedOrder yet (legacy data), create default order: objects first, then URLs
    if (linkedOrder.length === 0) {
      const items = [];
      linkedObjects.forEach(obj => items.push({ type: 'object', id: obj.id, data: obj }));
      linkedUrls.forEach(url => items.push({ type: 'url', id: url.id, data: url }));
      return items;
    }
    
    // Use linkedOrder but skip items that don't exist or user can't access
    return linkedOrder
      .map(item => {
        if (item.type === 'object') {
          const obj = objectsMap.get(item.id);
          return obj ? { type: 'object', id: item.id, data: obj } : null;
        } else if (item.type === 'url') {
          const url = urlsMap.get(item.id);
          return url ? { type: 'url', id: item.id, data: url } : null;
        }
        return null;
      })
      .filter(Boolean);
  })();
  
  // Get linked objects with coordinates for map view
  const linkedObjectsWithCoords = (() => {
    const linkedItems = orderedLinkedItems
      .filter(item => item.type === 'object')
      .map(item => item.data)
      .filter(obj => {
        const loc = obj.blocks?.find(b => b.type === 'location');
        return loc?.data?.lat && loc?.data?.lng;
      });
    
    // Also include the collection's own location if it has one
    if (isCollection && object.blocks) {
      const ownLocation = object.blocks.find(b => b.type === 'location');
      if (ownLocation?.data?.lat != null && ownLocation?.data?.lng != null) {
        // Add the collection itself as first item with a special marker
        linkedItems.unshift({ ...object, isCollectionSelf: true });
      }
    }
    
    return linkedItems;
  })();
  
  // Count of linked objects with coords (excluding collection's own location)
  const linkedObjectsCount = linkedObjectsWithCoords.filter(obj => !obj.isCollectionSelf).length;
  
  // Get own location blocks for multi-location map (non-collection objects with multiple locations)
  const ownLocationBlocks = object.blocks
    .filter(b => b.type === 'location' && b.data?.lat != null && b.data?.lng != null);
  const hasMultipleLocations = !isCollection && (ownLocationBlocks.length > 1 || (ownLocationBlocks.length >= 1 && pendingLocations.length > 0) || pendingLocations.length > 1);
  const hasImageBlock = object.blocks.some(b => b.type === 'image' && b.data?.url);
  
  // Create fake "objects" for the multi-location map view (one per location)
  // Use same numbering logic as rendering: primary = no number, extras = #2, #3, etc.
  const primaryLocationForMap = ownLocationBlocks.find(b => b.data?.isPrimary === true);
  const extraLocationsForMap = ownLocationBlocks.filter(b => b.data?.isPrimary !== true);
  const multiLocationMapObjects = ownLocationBlocks.map((locBlock, idx) => {
    const isPrimary = locBlock.data?.isPrimary === true;
    const extraIndex = isPrimary ? null : extraLocationsForMap.indexOf(locBlock) + 2;
    return {
      id: `${object.id}-loc-${idx}`,
      blocks: [
        object.blocks.find(b => b.type === 'title'),
        object.blocks.find(b => b.type === 'image'),
        locBlock
      ].filter(Boolean),
      type: object.type,
      _locationIndex: isPrimary ? null : extraIndex, // null = primary, 2+ = extra
      _isPrimary: isPrimary
    };
  });
  
  // Find all descendants (children, grandchildren, etc.) for cascade delete warning
  const allDescendants = allObjects.filter(o => o.ancestorIds?.includes(object.id));
  
  // Inherit location from parent if child doesn't have one
  const hasOwnLocation = object.blocks.some(b => b.type === 'location');
  const parentLocation = parentObject?.blocks?.find(b => b.type === 'location');
  
  // Track original index in object.blocks for each block
  const rawBlocks = object.blocks.map((block, idx) => ({ ...block, objectBlockIndex: idx }));
  
  // Add inherited location if needed (with no objectBlockIndex since it's not in object.blocks)
  if (!hasOwnLocation && parentLocation) {
    rawBlocks.push({ type: 'location', data: parentLocation.data, inherited: true, objectBlockIndex: -1 });
  }
  
  const blocksToRender = rawBlocks.sort((a, b) => {
    // Explicit order for certain block types, others keep their original position
    const order = { 'title': 0, 'image': 1, 'location': 2, 'contact': 2.5 };
    const aOrder = order[a.type];
    const bOrder = order[b.type];
    
    // If both have explicit order, sort by that
    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    // If only one has explicit order, it comes first
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    // If neither has explicit order, maintain original array order
    return a.objectBlockIndex - b.objectBlockIndex;
  });

  // Get first audio block URL (for location block play button)
  // Normalize URL: remove /ourspots prefix if present (for Firebase vs GitHub Pages compatibility)
  const audioBlock = object.blocks.find(b => b.type === 'audio');
  const rawAudioUrl = audioBlock?.data?.url || null;
  const audioUrl = rawAudioUrl?.startsWith('/ourspots/') 
    ? rawAudioUrl.replace('/ourspots/', '/') 
    : rawAudioUrl;
  const audioIsDiscrete = audioBlock?.data?.discrete !== false; // Default true
  const audioAnimation = audioBlock?.data?.animation || 'none'; // 'none', 'cykel', 'gris'
  
  // Initialize centralized audio element
  useEffect(() => {
    if (audioUrl && audioIsDiscrete) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.preload = 'metadata';
      
      const handleEnded = () => setIsAudioPlaying(false);
      const handleError = () => {
        setAudioError(true);
        setIsAudioPlaying(false);
      };
      
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('error', handleError);
      
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeEventListener('ended', handleEnded);
          audioRef.current.removeEventListener('error', handleError);
          audioRef.current = null;
        }
      };
    }
  }, [audioUrl, audioIsDiscrete]);
  
  // Toggle audio playback
  const toggleAudio = () => {
    if (!audioRef.current || audioError) return;
    
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error('Audio play error:', err);
        setAudioError(true);
      });
      setIsAudioPlaying(true);
    }
  };
  
  const handleDelete = async () => {
    await onDelete(object.id);
    onClose();
  };
  
  // Get title for header
  const titleBlock = object.blocks.find(b => b.type === 'title');
  const objectTitle = titleBlock?.data?.text || 'Objekt';
  
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center lg:justify-end sm:p-8 lg:p-6"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div 
          ref={modalRef}
          className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl lg:rounded-2xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-lg lg:max-w-xl sm:w-[90%] lg:w-[40%] h-full sm:h-auto sm:max-h-[85vh] lg:h-[calc(100vh-2rem)] lg:max-h-none overflow-hidden flex flex-col transition-transform duration-200 ease-out relative sm:shadow-2xl sm:shadow-black/50"
          style={{ transform: `translateX(${touchDelta}px)`, opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1, touchAction: 'pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle decorative gradient using category color */}
          <div 
            className="absolute top-0 left-0 right-0 h-72 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, ${categoryColor}12, ${categoryColor}05 50%, transparent)` }}
          />
          
          {/* Fixed header */}
          <div className="sticky top-0 z-10 px-4 py-4 sm:p-5 lg:px-6 lg:py-3 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 lg:gap-2 flex-1 min-w-0">
              <div 
                className="w-10 h-10 lg:w-8 lg:h-8 rounded-xl lg:rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${categoryColor}20` }}
              >
                <IconComponent size={20} className="lg:hidden" style={{ color: categoryColor }} />
                <IconComponent size={16} className="hidden lg:block" style={{ color: categoryColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-lg font-bold text-white truncate">{objectTitle}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{category?.label || 'Objekt'}</span>
                  {isSharedWithMe && (
                    <span className="text-xs text-purple-400 flex items-center gap-1">
                      <Users size={10} />
                      {myShareRole === 'editor' ? 'Redigerare' : 'Läsare'}
                    </span>
                  )}
                  {isAdmin && !isOwner && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-1">
              {isOwner && (
                <button 
                  onClick={() => onShare && onShare(object)} 
                  className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center rounded-xl lg:rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0"
                  aria-label="Dela"
                  title="Dela"
                >
                  <Share2 size={20} className="lg:hidden" />
                  <Share2 size={16} className="hidden lg:block" />
                </button>
              )}
              <button 
                onClick={onClose} 
                className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center rounded-xl lg:rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0"
                aria-label="Stäng"
              >
                <svg className="w-6 h-6 lg:w-5 lg:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Navigation back - prioritize navigation history over parent */}
          {(onGoBack && previousObject) ? (
            <div className="px-4 py-2 border-b border-white/5">
              <button
                onClick={onGoBack}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                <span>Tillbaka till {previousObject.blocks?.find(b => b.type === 'title')?.data?.text || 'föregående'}</span>
              </button>
            </div>
          ) : parentObject && (
            <div className="px-4 py-2 border-b border-white/5">
              <button
                onClick={() => onNavigate(parentObject)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                <span>Tillbaka till {parentObject.blocks.find(b => b.type === 'title')?.data?.text || 'överordnat objekt'}</span>
              </button>
            </div>
          )}
          
          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-5 lg:p-6 pb-8 sm:pb-10 lg:pb-6">
            <div className="space-y-5">
              {/* Show multi-location map button at top if no image block exists */}
              {!hasImageBlock && hasMultipleLocations && (
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setShowMultiLocationMap(true)}
                    className="h-9 px-3 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-all"
                    title="Visa alla platser på karta"
                  >
                    <MapIcon size={16} />
                    <span className="text-sm font-medium">
                      {ownLocationBlocks.length + pendingLocations.length} {(ownLocationBlocks.length + pendingLocations.length) === 1 ? 'plats' : 'platser'}
                      {pendingLocations.length > 0 && <span className="text-yellow-400 ml-1">({pendingLocations.length} väntar)</span>}
                    </span>
                  </button>
                </div>
              )}
              {(() => {
                // Identify primary and extra location blocks upfront
                const allLocationBlocks = blocksToRender.filter(b => b.type === 'location' && !b.inherited);
                const primaryLocationBlock = allLocationBlocks.find(b => b.data?.isPrimary === true);
                const extraLocationBlocks = allLocationBlocks.filter(b => b.data?.isPrimary !== true);
                const hasImageBlock = blocksToRender.some(b => b.type === 'image');
                
                const sorted = blocksToRender
                  .filter(block => blockComponents[block.type] && block.type !== 'title')
                  .filter(block => !(block.type === 'audio' && block.data?.discrete !== false)) // Hide discrete audio blocks
                  .filter(block => !(block.type === 'location' && block.data?.isPrimary === true && !block.inherited)); // Hide primary location from list (rendered separately after image)
                
                // Helper to render primary location block
                const renderPrimaryLocation = () => {
                  if (!primaryLocationBlock) return null;
                  const PrimaryLocationComponent = blockComponents['location'];
                  const primaryBlockIndex = primaryLocationBlock.objectBlockIndex;
                  
                  return (
                    <div className="mt-3">
                      <PrimaryLocationComponent 
                        data={primaryLocationBlock.data}
                        objectId={object.id}
                        blockIndex={primaryBlockIndex}
                        onUpdate={onBlockUpdate}
                        inherited={false}
                        canDelete={false}
                        positionNumber={null}
                        isExtraLocation={false}
                        onShowOnMap={onShowOnMap ? (coords) => onShowOnMap(coords, object.id) : undefined}
                        isCollection={isCollection && linkedObjectsCount > 0}
                        collectionPlacesCount={isCollection ? linkedObjectsWithCoords.length : 0}
                        onShowCollectionMap={isCollection && linkedObjectsCount > 0 ? () => setShowCollectionMap(true) : undefined}
                        whatsappGroupUrl={isCollection && linkedObjectsCount > 0 ? object.whatsappGroupUrl : undefined}
                        hasAudio={audioIsDiscrete && audioUrl && !audioError}
                        isAudioPlaying={isAudioPlaying}
                        onToggleAudio={toggleAudio}
                      />
                    </div>
                  );
                };
                
                // If no image block, render primary location at the top
                const primaryLocationAtTop = !hasImageBlock ? renderPrimaryLocation() : null;
                
                return (
                  <>
                    {primaryLocationAtTop}
                    {sorted.map((block, index) => {
                // Use the original index in object.blocks (tracked as objectBlockIndex)
                const actualBlockIndex = block.objectBlockIndex;
                const BlockComponent = blockComponents[block.type];
                
                // For location blocks, identify primary vs extra by isPrimary flag
                const locationBlocks = blocksToRender.filter(b => b.type === 'location' && !b.inherited);
                const isPrimaryLocation = block.type === 'location' && block === primaryLocationBlock && !block.inherited;
                const isExtraLocation = block.type === 'location' && block.data?.isPrimary !== true && !block.inherited;
                
                // Calculate position number: primary shows "primär", extras show #2, #3, etc.
                const extraLocationIndex = isExtraLocation ? extraLocationBlocks.indexOf(block) + 2 : null;
                const canDeleteLocation = canEdit && block.type === 'location' && !block.inherited && !isPrimaryLocation;
                
                const handleDeleteBlock = async () => {
                  // Note: confirmation dialog is handled in LocationBlock component
                  try {
                    const updatedBlocks = object.blocks.filter((_, i) => i !== actualBlockIndex);
                    await updateDoc(doc(db, 'objects', object.id), {
                      blocks: updatedBlocks
                    });
                  } catch (err) {
                    console.error('Error deleting block:', err);
                    alert('Kunde inte ta bort position');
                  }
                };
                
                const handleEditNote = block.type === 'location' && canEdit && !block.inherited ? () => {
                  const currentNote = block.data?.note || '';
                  const newNote = window.prompt('Anteckning för denna position:', currentNote);
                  if (newNote === null) return; // User cancelled
                  
                  const updatedBlocks = [...object.blocks];
                  updatedBlocks[actualBlockIndex] = {
                    ...updatedBlocks[actualBlockIndex],
                    data: { ...updatedBlocks[actualBlockIndex].data, note: newNote }
                  };
                  updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks })
                    .catch(err => {
                      console.error('Error updating note:', err);
                      alert('Kunde inte spara anteckning');
                    });
                } : undefined;
                
                return BlockComponent ? (
                  <div key={actualBlockIndex}>
                    <BlockComponent 
                          key={actualBlockIndex} 
                          data={block.data} 
                          objectId={object.id} 
                          blockIndex={actualBlockIndex} 
                          onUpdate={onBlockUpdate} 
                          inherited={block.inherited}
                          canDelete={canDeleteLocation}
                          onDelete={handleDeleteBlock}
                          onEditNote={handleEditNote}
                          positionNumber={isExtraLocation ? extraLocationIndex : null}
                          isExtraLocation={isExtraLocation}
                          onShowOnMap={onShowOnMap ? (coords) => onShowOnMap(coords, object.id) : undefined}
                          // Location block: collection map props (only show if there are linked objects with coords)
                          isCollection={block.type === 'location' && isCollection && linkedObjectsCount > 0}
                          collectionPlacesCount={block.type === 'location' && isCollection ? linkedObjectsWithCoords.length : 0}
                          onShowCollectionMap={block.type === 'location' && isCollection && linkedObjectsCount > 0 ? () => setShowCollectionMap(true) : undefined}
                          whatsappGroupUrl={block.type === 'location' && isCollection && linkedObjectsCount > 0 ? object.whatsappGroupUrl : undefined}
                          // Location block: centralized audio props
                          hasAudio={block.type === 'location' && !block.inherited && audioIsDiscrete && audioUrl && !audioError}
                          isAudioPlaying={block.type === 'location' ? isAudioPlaying : undefined}
                          onToggleAudio={block.type === 'location' ? toggleAudio : undefined}
                          // Image block: animation props
                          isPlaying={block.type === 'image' && audioIsDiscrete ? isAudioPlaying : false}
                          animation={block.type === 'image' ? audioAnimation : 'none'}
                          // Poll-specific props
                          currentUser={currentUser}
                          userDisplayName={userDisplayName}
                          shares={object.shares || {}}
                          canEdit={canEdit}
                          onVote={block.type === 'poll' ? async (newVotes) => {
                            try {
                              const updatedBlocks = [...object.blocks];
                              updatedBlocks[actualBlockIndex] = {
                                ...updatedBlocks[actualBlockIndex],
                                data: { ...updatedBlocks[actualBlockIndex].data, votes: newVotes }
                              };
                              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
                            } catch (err) {
                              console.error('Error saving vote:', err);
                            }
                          } : undefined}
                          onClosePoll={block.type === 'poll' && canEdit ? async () => {
                            try {
                              const updatedBlocks = [...object.blocks];
                              updatedBlocks[actualBlockIndex] = {
                                ...updatedBlocks[actualBlockIndex],
                                data: { ...updatedBlocks[actualBlockIndex].data, closed: true }
                              };
                              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
                            } catch (err) {
                              console.error('Error closing poll:', err);
                            }
                          } : undefined}
                          onAddOption={block.type === 'poll' && block.data?.allowSuggestions ? async (label, addedBy, url) => {
                            try {
                              const updatedBlocks = [...object.blocks];
                              const currentOptions = updatedBlocks[actualBlockIndex].data.options || [];
                              const newOption = {
                                id: Date.now().toString(),
                                label,
                                addedBy,
                                ...(url && { url }) // Only add url if provided
                              };
                              updatedBlocks[actualBlockIndex] = {
                                ...updatedBlocks[actualBlockIndex],
                                data: { 
                                  ...updatedBlocks[actualBlockIndex].data, 
                                  options: [...currentOptions, newOption] 
                                }
                              };
                              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
                            } catch (err) {
                              console.error('Error adding option:', err);
                            }
                          } : undefined}
                          onRemoveOption={block.type === 'poll' && block.data?.allowSuggestions ? async (optionId) => {
                            try {
                              const updatedBlocks = [...object.blocks];
                              const currentOptions = updatedBlocks[actualBlockIndex].data.options || [];
                              // Only allow removing if user added this option - use same format as PollBlock
                              const userKey = currentUser?.email ? currentUser.email.replace(/\./g, '_DOT_') : null;
                              const optionToRemove = currentOptions.find(o => o.id === optionId);
                              if (!optionToRemove || optionToRemove.addedBy !== userKey) {
                                console.error('Cannot remove option: not owner');
                                return;
                              }
                              updatedBlocks[actualBlockIndex] = {
                                ...updatedBlocks[actualBlockIndex],
                                data: { 
                                  ...updatedBlocks[actualBlockIndex].data, 
                                  options: currentOptions.filter(o => o.id !== optionId)
                                }
                              };
                              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
                            } catch (err) {
                              console.error('Error removing option:', err);
                            }
                          } : undefined}
                          // Split-specific props
                          onUpdateAmount={block.type === 'split' ? async (participantEmail, amount) => {
                            try {
                              const updatedBlocks = [...object.blocks];
                              const currentParticipants = updatedBlocks[actualBlockIndex].data.participants || [];
                              // Only allow updating own amount
                              const userEmail = currentUser?.email?.toLowerCase();
                              if (participantEmail.toLowerCase() !== userEmail) {
                                console.error('Cannot update amount: not own participant');
                                return;
                              }
                              const updatedParticipants = currentParticipants.map(p => 
                                p.email?.toLowerCase() === participantEmail.toLowerCase()
                                  ? { ...p, paid: amount }
                                  : p
                              );
                              updatedBlocks[actualBlockIndex] = {
                                ...updatedBlocks[actualBlockIndex],
                                data: { 
                                  ...updatedBlocks[actualBlockIndex].data, 
                                  participants: updatedParticipants 
                                }
                              };
                              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
                            } catch (err) {
                              console.error('Error updating amount:', err);
                            }
                          } : undefined}
                          onCloseSplit={block.type === 'split' && canEdit ? async () => {
                            try {
                              const updatedBlocks = [...object.blocks];
                              updatedBlocks[actualBlockIndex] = {
                                ...updatedBlocks[actualBlockIndex],
                                data: { ...updatedBlocks[actualBlockIndex].data, closed: true }
                              };
                              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
                            } catch (err) {
                              console.error('Error closing split:', err);
                            }
                          } : undefined}
                          // Leaderboard-specific props
                          onOpenModal={block.type === 'leaderboard' ? () => {
                            setLeaderboardModalData({ blockIndex: actualBlockIndex, data: block.data });
                          } : block.type === 'distribution' ? () => {
                            setDistributionModalData({ blockIndex: actualBlockIndex, data: block.data });
                          } : undefined}
                          // Text block inline edit - for owners/editors
                          onEditContent={block.type === 'text' && canEdit ? () => {
                            setTextEditModalData({ 
                              blockIndex: actualBlockIndex, 
                              content: block.data.content || '', 
                              title: block.data.title || 'Anteckning' 
                            });
                          } : undefined}
                          // Scroll into view when expanding collapsible blocks
                          onExpand={(element) => {
                            if (element) {
                              setTimeout(() => {
                                // Find the scrollable container
                                const scrollContainer = element.closest('.overflow-y-auto');
                                if (!scrollContainer) return;
                                
                                const elementRect = element.getBoundingClientRect();
                                const containerRect = scrollContainer.getBoundingClientRect();
                                
                                // Only scroll if element top is above container or bottom is below
                                if (elementRect.top < containerRect.top) {
                                  // Element header is above view - scroll to show header at top
                                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else if (elementRect.bottom > containerRect.bottom) {
                                  // Element bottom is below view - scroll just enough to show it
                                  // but keep the header visible at top of scroll area
                                  const headerHeight = 44; // approximate height of collapse header
                                  const maxScroll = elementRect.top - containerRect.top - headerHeight;
                                  const neededScroll = elementRect.bottom - containerRect.bottom + 20;
                                  const scrollAmount = Math.min(neededScroll, maxScroll);
                                  
                                  if (scrollAmount > 0) {
                                    scrollContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                                  }
                                }
                              }, 100);
                            }
                          }}
                        />
                    {/* Show collection map buttons right after image block - only if no location block and there are linked objects with coords */}
                    {block.type === 'image' && isCollection && !blocksToRender.some(b => b.type === 'location') && linkedObjectsCount > 0 && (
                      <div className="flex items-center justify-end gap-2 flex-wrap mt-3">
                        {object.whatsappGroupUrl && (
                          <button
                            onClick={() => window.open(object.whatsappGroupUrl, '_blank')}
                            className="w-9 h-9 rounded-lg bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center text-green-400 hover:text-green-300 transition-all flex-shrink-0"
                            title="WhatsApp-grupp"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => setShowCollectionMap(true)}
                          className="h-9 px-3 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-all"
                          title="Visa alla platser på karta"
                        >
                          <MapIcon size={16} />
                          <span className="text-sm font-medium">{linkedObjectsWithCoords.length} {linkedObjectsWithCoords.length === 1 ? 'plats' : 'platser'}</span>
                        </button>
                      </div>
                    )}
                    {/* Show multi-location map button for non-collection objects with 2+ locations */}
                    {block.type === 'image' && hasMultipleLocations && (
                      <div className="flex items-center justify-end mt-3">
                        <button
                          onClick={() => setShowMultiLocationMap(true)}
                          className="h-9 px-3 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-all"
                          title="Visa alla platser på karta"
                        >
                          <MapIcon size={16} />
                          <span className="text-sm font-medium">
                            {ownLocationBlocks.length + pendingLocations.length} {(ownLocationBlocks.length + pendingLocations.length) === 1 ? 'plats' : 'platser'}
                            {pendingLocations.length > 0 && <span className="text-yellow-400 ml-1">({pendingLocations.length} väntar)</span>}
                          </span>
                        </button>
                      </div>
                    )}
                    {/* Render primary location directly after image block */}
                    {block.type === 'image' && hasImageBlock && renderPrimaryLocation()}
                  </div>
                ) : null;
              })}
                  </>
                );
              })()}
            </div>
            {childObjects.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Folder size={16} className="text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-400">{childObjects.length} objekt</h3>
                  </div>
                  {childObjects.length > 0 && (
                    <button
                      onClick={toggleChildViewMode}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title={childViewMode === 'grid' ? 'Visa som lista' : 'Visa som kort'}
                    >
                      {childViewMode === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
                    </button>
                  )}
                </div>
                {childViewMode === 'list' ? (
                  <div className="space-y-1">
                    {[...childObjects]
                      .sort((a, b) => {
                        const titleA = a.blocks.find(bl => bl.type === 'title')?.data?.text || '';
                        const titleB = b.blocks.find(bl => bl.type === 'title')?.data?.text || '';
                        return titleA.localeCompare(titleB, 'sv');
                      })
                      .map(child => {
                        const childTitle = child.blocks.find(bl => bl.type === 'title');
                        return (
                          <button
                            key={child.id}
                            onClick={() => onNavigate(child)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-400/30 transition-all text-left"
                          >
                            <FileText size={14} className="text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-white truncate">{childTitle?.data?.text || 'Namnlöst'}</span>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 items-end">
                    {childObjects.map(child => {
                      const childTitle = child.blocks.find(bl => bl.type === 'title');
                      const childImage = child.blocks.find(bl => bl.type === 'image');
                      const childCategory = categories?.find(c => c.id === child.type);
                      const ChildIcon = childCategory ? getIconComponent(childCategory.icon) : (PREDEFINED_ICONS[child.type]?.icon || Home);
                      return (
                        <button
                          key={child.id}
                          onClick={() => onNavigate(child)}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-400/50 transition-all text-left col-span-1"
                        >
                          {childImage ? (
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                              <img 
                                src={getTransformedImageUrl(childImage.data.url, childImage.data.focalPoint ? 'custom' : childImage.data.focalPoint, 64, 64, childImage.data.focalPoint)} 
                                alt="" 
                                className="w-full h-full object-cover"
                                style={getFocalPointStyles(childImage.data.focalPoint)}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                              <ChildIcon size={14} className="text-blue-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-white truncate">{childTitle?.data?.text || 'Namnlöst'}</div>
                            <div className="text-xs text-gray-400 leading-tight">{PREDEFINED_ICONS[child.type]?.label}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Linked objects section for collections */}
            {isCollection && orderedLinkedItems.length > 0 && (
              <div className="mt-6 pt-6 border-t border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-purple-400" />
                    <h3 className="text-sm font-medium text-purple-400">Innehåll ({orderedLinkedItems.length})</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {canManage && linkedEditMode && onAddToCollection && (
                      <button
                        onClick={() => { setObjectSearchQuery(''); setShowAddObjectPicker(true); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 transition-colors"
                      >
                        <Plus size={14} />
                        Objekt
                      </button>
                    )}
                    {canManage && linkedEditMode && onAddLinkedUrl && (
                      <button
                        onClick={() => { setShowAddUrlForm(true); setNewUrlTitle(''); setNewUrlValue(''); setNewUrlNote(''); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 transition-colors"
                      >
                        <Link2 size={14} />
                        URL
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => setLinkedEditMode(!linkedEditMode)}
                        className={`p-2 rounded-lg transition-colors ${
                          linkedEditMode 
                            ? 'bg-purple-500/30 text-purple-300' 
                            : 'hover:bg-white/10 text-gray-500 hover:text-purple-300'
                        }`}
                        title={linkedEditMode ? 'Avsluta redigering' : 'Redigera'}
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Add URL form */}
                {showAddUrlForm && (
                  <div className="mb-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newUrlTitle}
                        onChange={e => setNewUrlTitle(e.target.value)}
                        placeholder="Titel (t.ex. Restaurang Bolaget)"
                        className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                        autoFocus
                      />
                      <input
                        type="url"
                        value={newUrlValue}
                        onChange={e => setNewUrlValue(e.target.value)}
                        placeholder="URL (https://...)"
                        className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                      />
                      <input
                        type="text"
                        value={newUrlNote}
                        onChange={e => setNewUrlNote(e.target.value)}
                        placeholder="Anteckning (valfritt, t.ex. Middag fredag 20:00)"
                        className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (newUrlTitle.trim() && newUrlValue.trim()) {
                              onAddLinkedUrl(object.id, { title: newUrlTitle.trim(), url: newUrlValue.trim(), note: newUrlNote.trim() });
                              setShowAddUrlForm(false);
                            }
                          }}
                          disabled={!newUrlTitle.trim() || !newUrlValue.trim()}
                          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Lägg till
                        </button>
                        <button
                          onClick={() => setShowAddUrlForm(false)}
                          className="px-3 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {orderedLinkedItems.map((item, itemIndex) => {
                    const isFirst = itemIndex === 0;
                    const isLast = itemIndex === orderedLinkedItems.length - 1;
                    
                    if (item.type === 'object') {
                      const linked = item.data;
                      const linkedTitle = linked.blocks.find(bl => bl.type === 'title');
                      const linkedImage = linked.blocks.find(bl => bl.type === 'image');
                      const linkedCategory = categories?.find(c => c.id === linked.type);
                      const LinkedIcon = linkedCategory ? getIconComponent(linkedCategory.icon) : (PREDEFINED_ICONS[linked.type]?.icon || Home);
                      const linkedNote = object.linkedObjectNotes?.[linked.id] || '';
                      const isEditingThis = editingNoteId === linked.id;
                      
                      return (
                        <div key={`obj_${linked.id}`} className="flex items-center gap-1">
                          {/* Reorder arrows */}
                          {canManage && linkedEditMode && onReorderLinked && (
                            <div className="flex items-center gap-0.5 mr-1">
                              <button
                                onClick={() => onReorderLinked(object.id, itemIndex, 'up')}
                                disabled={isFirst}
                                className={`p-1.5 rounded-lg transition-colors ${isFirst ? 'text-gray-700 cursor-default' : 'text-gray-400 hover:text-purple-300 hover:bg-white/10 active:bg-purple-500/20'}`}
                                title="Flytta upp"
                              >
                                <ChevronUp size={18} />
                              </button>
                              <button
                                onClick={() => onReorderLinked(object.id, itemIndex, 'down')}
                                disabled={isLast}
                                className={`p-1.5 rounded-lg transition-colors ${isLast ? 'text-gray-700 cursor-default' : 'text-gray-400 hover:text-purple-300 hover:bg-white/10 active:bg-purple-500/20'}`}
                                title="Flytta ner"
                              >
                                <ChevronDown size={18} />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => onNavigate(linked)}
                            className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-400/30 transition-all text-left"
                          >
                            {linkedImage ? (
                              <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                                <img 
                                  src={getTransformedImageUrl(linkedImage.data.url, linkedImage.data.focalPoint ? 'custom' : linkedImage.data.focalPoint, 64, 64, linkedImage.data.focalPoint)} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                  style={getFocalPointStyles(linkedImage.data.focalPoint)}
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <LinkedIcon size={14} className="text-purple-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate">{linkedTitle?.data?.text || 'Namnlöst'}</div>
                              {linkedNote && !isEditingThis && (
                                <div className="text-xs text-purple-300 truncate">{linkedNote}</div>
                              )}
                            </div>
                          </button>
                          {/* Note edit button/field - only in edit mode */}
                          {canManage && linkedEditMode && onUpdateLinkedNote && (
                            isEditingThis ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingNoteText}
                                  onChange={e => setEditingNoteText(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      onUpdateLinkedNote(object.id, linked.id, editingNoteText.trim());
                                      setEditingNoteId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingNoteId(null);
                                    }
                                  }}
                                  placeholder="t.ex. Lördag 10:00"
                                  className="w-28 px-2 py-1.5 text-xs bg-white/10 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    onUpdateLinkedNote(object.id, linked.id, editingNoteText.trim());
                                    setEditingNoteId(null);
                                  }}
                                  className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300"
                                >
                                  <Check size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingNoteId(linked.id);
                                  setEditingNoteText(linkedNote);
                                }}
                                className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-purple-300 transition-all"
                                title={linkedNote ? 'Redigera anteckning' : 'Lägg till anteckning'}
                              >
                                <Edit2 size={14} />
                              </button>
                            )
                          )}
                          {canManage && linkedEditMode && onRemoveFromCollection && (
                            <button
                              onClick={() => onRemoveFromCollection(object.id, linked.id)}
                              className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                              title="Ta bort från samlingsvy"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      );
                    } else {
                      // URL item
                      const urlItem = item.data;
                      const isEditingUrlNote = editingNoteId === `url_${urlItem.id}`;
                      
                      return (
                        <div key={`url_${urlItem.id}`} className="flex items-center gap-1">
                          {/* Reorder arrows for URLs */}
                          {canManage && linkedEditMode && onReorderLinked && (
                            <div className="flex items-center gap-0.5 mr-1">
                              <button
                                onClick={() => onReorderLinked(object.id, itemIndex, 'up')}
                                disabled={isFirst}
                                className={`p-1.5 rounded-lg transition-colors ${isFirst ? 'text-gray-700 cursor-default' : 'text-gray-400 hover:text-purple-300 hover:bg-white/10 active:bg-purple-500/20'}`}
                                title="Flytta upp"
                              >
                                <ChevronUp size={18} />
                              </button>
                              <button
                                onClick={() => onReorderLinked(object.id, itemIndex, 'down')}
                                disabled={isLast}
                                className={`p-1.5 rounded-lg transition-colors ${isLast ? 'text-gray-700 cursor-default' : 'text-gray-400 hover:text-purple-300 hover:bg-white/10 active:bg-purple-500/20'}`}
                                title="Flytta ner"
                              >
                                <ChevronDown size={18} />
                              </button>
                            </div>
                          )}
                          <a
                            href={urlItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-400/30 transition-all text-left"
                          >
                            <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                              <ExternalLink size={14} className="text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate">{urlItem.title}</div>
                              {urlItem.note && !isEditingUrlNote && (
                                <div className="text-xs text-purple-300 truncate">{urlItem.note}</div>
                              )}
                            </div>
                          </a>
                          {/* Note edit for URL */}
                          {canManage && linkedEditMode && onUpdateLinkedUrl && (
                            isEditingUrlNote ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingNoteText}
                                  onChange={e => setEditingNoteText(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      onUpdateLinkedUrl(object.id, urlItem.id, { ...urlItem, note: editingNoteText.trim() });
                                      setEditingNoteId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingNoteId(null);
                                    }
                                  }}
                                  placeholder="t.ex. Middag 20:00"
                                  className="w-28 px-2 py-1.5 text-xs bg-white/10 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    onUpdateLinkedUrl(object.id, urlItem.id, { ...urlItem, note: editingNoteText.trim() });
                                    setEditingNoteId(null);
                                  }}
                                  className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300"
                                >
                                  <Check size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingNoteId(`url_${urlItem.id}`);
                                  setEditingNoteText(urlItem.note || '');
                                }}
                                className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-blue-300 transition-all"
                                title={urlItem.note ? 'Redigera anteckning' : 'Lägg till anteckning'}
                              >
                                <Edit2 size={14} />
                              </button>
                            )
                          )}
                          {canManage && linkedEditMode && onRemoveLinkedUrl && (
                            <button
                              onClick={() => onRemoveLinkedUrl(object.id, urlItem.id)}
                              className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                              title="Ta bort länk"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            )}
            {isCollection && orderedLinkedItems.length === 0 && totalLinkedCount === 0 && canManage && (
              <div className="mt-6 pt-6 border-t border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-purple-400" />
                    <h3 className="text-sm font-medium text-purple-400">Innehåll</h3>
                  </div>
                </div>
                <div className="text-sm text-gray-500 text-center py-6 bg-white/5 rounded-lg border border-dashed border-white/10">
                  <p className="mb-3">Ingen innehåll ännu</p>
                  <div className="flex gap-2 justify-center">
                    {onAddToCollection && (
                      <button
                        onClick={() => { setObjectSearchQuery(''); setShowAddObjectPicker(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 transition-colors"
                      >
                        <Plus size={16} />
                        Objekt
                      </button>
                    )}
                    {onAddLinkedUrl && (
                      <button
                        onClick={() => { setShowAddUrlForm(true); setNewUrlTitle(''); setNewUrlValue(''); setNewUrlNote(''); }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 transition-colors"
                      >
                        <Link2 size={16} />
                        URL
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* User sees some linked objects but not all */}
            {isCollection && linkedObjects.length > 0 && hiddenLinkedCount > 0 && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                + {hiddenLinkedCount} {hiddenLinkedCount === 1 ? 'objekt' : 'objekt'} du inte har tillgång till
              </div>
            )}
            {/* User has no access to any linked objects - don't show confusing empty state */}
            {isCollection && linkedObjects.length === 0 && hiddenLinkedCount > 0 && (
              <div className="mt-6 pt-6 border-t border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList size={16} className="text-purple-400" />
                  <h3 className="text-sm font-medium text-purple-400">Länkade objekt</h3>
                </div>
                <div className="text-sm text-gray-500 text-center py-4 bg-white/5 rounded-lg border border-white/10">
                  {hiddenLinkedCount} {hiddenLinkedCount === 1 ? 'objekt länkat' : 'objekt länkade'} som du inte har tillgång till
                </div>
              </div>
            )}
            {(canManage || canEdit || isSharedWithMe) && (
              <div ref={manageSectionRef} className="mt-6 lg:mt-4 pt-6 lg:pt-4 border-t border-white/10">
                <button
                  onClick={() => setShowManageSection(!showManageSection)}
                  className="w-full flex items-center justify-between px-4 lg:px-3 py-3 lg:py-2 rounded-xl lg:rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Settings size={18} className="lg:hidden" />
                    <Settings size={16} className="hidden lg:block" />
                    <span className="font-medium lg:text-sm">{showAsSharedView ? 'Delning' : 'Hantera objekt'}</span>
                  </div>
                  <ChevronDown 
                    size={18} 
                    className={`lg:hidden transition-transform ${showManageSection ? 'rotate-180' : ''}`}
                  />
                  <ChevronDown 
                    size={14} 
                    className={`hidden lg:block transition-transform ${showManageSection ? 'rotate-180' : ''}`}
                  />
                </button>
                {showManageSection && (
                  <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    {/* Edit, Copy, Delete buttons - all on same row */}
                    {canEdit && (
                      <div className="flex gap-2">
                        <button onClick={() => onEdit(object)} className="flex-1 h-10 flex items-center justify-center gap-1.5 px-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                          <Edit2 size={15} />
                          <span className="text-sm">Redigera</span>
                        </button>
                        {onDuplicate && (
                          <button onClick={() => onDuplicate(object)} className="flex-1 h-10 flex items-center justify-center gap-1.5 px-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                            <Copy size={15} />
                            <span className="text-sm">Kopiera</span>
                          </button>
                        )}
                        {canManage && (
                          <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 h-10 flex items-center justify-center gap-1.5 px-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all">
                            <Trash2 size={15} />
                            <span className="text-sm">Ta bort</span>
                          </button>
                        )}
                      </div>
                    )}
                    {isSharedWithMe && !isOwner && (
                      <button 
                        onClick={() => onLeaveShare(object)} 
                        className="w-full h-10 flex items-center justify-center gap-2 px-3 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/30 transition-all"
                      >
                        <UserMinus size={15} />
                        <span className="text-sm">Lämna delning</span>
                      </button>
                    )}
                    {/* Add child / Add to collection - on same row for non-collections */}
                    {!isCollection && (canManage || (collections && collections.length > 0)) && (
                      <div className="pt-2 border-t border-white/5">
                        <div className="flex gap-2">
                          {canManage && (
                            <button
                              onClick={() => onEdit({ parentId: object.id })}
                              className="flex-1 h-9 flex items-center justify-center gap-1.5 px-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs"
                              title="Skapar ett objekt som tillhör detta"
                            >
                              <Plus size={13} />
                              <span>Lägg till barn</span>
                            </button>
                          )}
                          {collections && collections.length > 0 && (
                            <button 
                              onClick={() => setShowCollectionPicker(true)} 
                              className="flex-1 h-9 flex items-center justify-center gap-1.5 px-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:text-purple-200 transition-all text-xs"
                              title="Länka utan att flytta objektet"
                            >
                              <Link2 size={13} />
                              <span>Lägg till i samlingsvy</span>
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 mt-1 text-[10px] text-gray-600">
                          {canManage && <span className="flex-1 text-center">Skapar nytt under detta</span>}
                          {collections && collections.length > 0 && <span className="flex-1 text-center">Länkar utan att flytta</span>}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-gray-600 pt-2 border-t border-white/5">
                      ID: {object.id.slice(0, 8)}...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {showDeleteConfirm && <DeleteConfirmModal object={object} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />}
      {/* Collection picker modal */}
      {showCollectionPicker && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1100] flex items-center justify-center p-4"
          onClick={() => setShowCollectionPicker(false)}
        >
          <div 
            className="bg-gray-900 rounded-xl border border-white/10 w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-purple-400" />
                <h3 className="font-medium text-white">Välj samlingsvy</h3>
              </div>
              <button 
                onClick={() => setShowCollectionPicker(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto">
              {collections && collections.length > 0 ? (
                collections.map(col => {
                  const colTitle = col.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlös samlingsvy';
                  const alreadyLinked = (col.linkedObjectIds || []).includes(object.id);
                  return (
                    <button
                      key={col.id}
                      onClick={() => {
                        if (!alreadyLinked && onAddToCollection) {
                          onAddToCollection(object.id, col.id);
                          setShowCollectionPicker(false);
                        }
                      }}
                      disabled={alreadyLinked}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        alreadyLinked 
                          ? 'bg-purple-500/10 text-purple-300 cursor-default' 
                          : 'hover:bg-white/10 text-gray-300 hover:text-white'
                      }`}
                    >
                      <ClipboardList size={16} className="text-purple-400 flex-shrink-0" />
                      <span className="flex-1 truncate">{colTitle}</span>
                      {alreadyLinked && (
                        <span className="text-xs text-purple-400">✓ Tillagd</span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Du har inga samlingsvyer ännu
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Add object to collection picker */}
      {showAddObjectPicker && isCollection && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1100] flex items-center justify-center p-4"
          onClick={() => setShowAddObjectPicker(false)}
        >
          <div 
            className="bg-gray-900 rounded-xl border border-white/10 w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-purple-400" />
                <h3 className="font-medium text-white">Lägg till objekt</h3>
              </div>
              <button 
                onClick={() => setShowAddObjectPicker(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Search field */}
            <div className="px-3 py-2 border-b border-white/5 flex-shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={objectSearchQuery}
                  onChange={e => setObjectSearchQuery(e.target.value)}
                  placeholder="Sök objekt..."
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {(() => {
                // Filter objects that can be added (not already linked, not this object, not children)
                const alreadyLinkedIds = object.linkedObjectIds || [];
                const availableObjects = allObjects.filter(obj => 
                  obj.id !== object.id && 
                  !alreadyLinkedIds.includes(obj.id) &&
                  obj.parentId !== object.id && // Not children
                  (obj.ownerId === currentUser?.uid || isAdmin || obj.acceptedShareEmails?.includes(currentUser?.email?.toLowerCase()))
                );
                
                // Apply search filter
                const searchLower = objectSearchQuery.toLowerCase().trim();
                const filteredObjects = searchLower 
                  ? availableObjects.filter(obj => {
                      const title = obj.blocks?.find(b => b.type === 'title')?.data?.text || '';
                      return title.toLowerCase().includes(searchLower);
                    })
                  : availableObjects;
                
                // Group by category
                const grouped = {};
                filteredObjects.forEach(obj => {
                  const catId = obj.type || 'other';
                  if (!grouped[catId]) grouped[catId] = [];
                  grouped[catId].push(obj);
                });
                
                const categoryIds = Object.keys(grouped).sort((a, b) => {
                  const catA = categories?.find(c => c.id === a);
                  const catB = categories?.find(c => c.id === b);
                  return (catA?.label || a).localeCompare(catB?.label || b);
                });
                
                if (categoryIds.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      {searchLower ? 'Inga objekt matchar sökningen' : 'Inga tillgängliga objekt att lägga till'}
                    </div>
                  );
                }
                
                return categoryIds.map(catId => {
                  const category = categories?.find(c => c.id === catId);
                  const CategoryIcon = category ? getIconComponent(category.icon) : (PREDEFINED_ICONS[catId]?.icon || Home);
                  const categoryLabel = category?.label || PREDEFINED_ICONS[catId]?.label || catId;
                  const objectsInCategory = grouped[catId];
                  
                  return (
                    <div key={catId} className="mb-3">
                      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                        <CategoryIcon size={12} />
                        {categoryLabel} ({objectsInCategory.length})
                      </div>
                      <div className="space-y-0.5">
                        {objectsInCategory.map(obj => {
                          const objTitle = obj.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlöst';
                          const objImage = obj.blocks?.find(b => b.type === 'image');
                          const ObjIcon = category ? getIconComponent(category.icon) : (PREDEFINED_ICONS[obj.type]?.icon || Home);
                          
                          return (
                            <button
                              key={obj.id}
                              onClick={() => {
                                if (onAddToCollection) {
                                  onAddToCollection(obj.id, object.id);
                                  setShowAddObjectPicker(false);
                                }
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/10 text-gray-300 hover:text-white transition-all"
                            >
                              {objImage ? (
                                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                                  <img 
                                    src={getTransformedImageUrl(objImage.data.url, objImage.data.focalPoint ? 'custom' : objImage.data.focalPoint, 64, 64, objImage.data.focalPoint)} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                    style={getFocalPointStyles(objImage.data.focalPoint)}
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                                  <ObjIcon size={14} className="text-gray-400" />
                                </div>
                              )}
                              <span className="flex-1 truncate text-sm">{objTitle}</span>
                              <Plus size={16} className="text-purple-400 opacity-0 group-hover:opacity-100" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
      {leaderboardModalData && (
        <LeaderboardModal
          data={leaderboardModalData.data}
          currentUser={currentUser}
          shares={object.shares || {}}
          canEdit={canEdit}
          onClose={() => setLeaderboardModalData(null)}
          onUpdateScores={async (newScores) => {
            try {
              const updatedBlocks = [...object.blocks];
              updatedBlocks[leaderboardModalData.blockIndex] = {
                ...updatedBlocks[leaderboardModalData.blockIndex],
                data: { 
                  ...updatedBlocks[leaderboardModalData.blockIndex].data, 
                  scores: newScores 
                }
              };
              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
              // Update local state to reflect change
              setLeaderboardModalData(prev => ({
                ...prev,
                data: { ...prev.data, scores: newScores }
              }));
            } catch (err) {
              console.error('Error updating scores:', err);
            }
          }}
          onAddRound={async () => {
            try {
              const updatedBlocks = [...object.blocks];
              const currentRoundCount = updatedBlocks[leaderboardModalData.blockIndex].data.roundCount || 0;
              updatedBlocks[leaderboardModalData.blockIndex] = {
                ...updatedBlocks[leaderboardModalData.blockIndex],
                data: { 
                  ...updatedBlocks[leaderboardModalData.blockIndex].data, 
                  roundCount: currentRoundCount + 1 
                }
              };
              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
              // Update local state
              setLeaderboardModalData(prev => ({
                ...prev,
                data: { ...prev.data, roundCount: currentRoundCount + 1 }
              }));
            } catch (err) {
              console.error('Error adding round:', err);
            }
          }}
          onDeleteRound={async (roundIndex) => {
            try {
              const updatedBlocks = [...object.blocks];
              const blockData = updatedBlocks[leaderboardModalData.blockIndex].data;
              const currentRoundCount = blockData.roundCount || 0;
              
              if (currentRoundCount <= 0) return;
              
              // Remove scores for this round and shift subsequent rounds
              const newScores = { ...blockData.scores };
              Object.keys(newScores).forEach(email => {
                const participantScores = { ...newScores[email] };
                // Shift scores after deleted round
                for (let i = roundIndex; i < currentRoundCount - 1; i++) {
                  participantScores[i] = participantScores[i + 1] || 0;
                }
                delete participantScores[currentRoundCount - 1];
                newScores[email] = participantScores;
              });
              
              updatedBlocks[leaderboardModalData.blockIndex] = {
                ...updatedBlocks[leaderboardModalData.blockIndex],
                data: { 
                  ...blockData, 
                  roundCount: currentRoundCount - 1,
                  scores: newScores
                }
              };
              
              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
              // Update local state
              setLeaderboardModalData(prev => ({
                ...prev,
                data: { 
                  ...prev.data, 
                  roundCount: currentRoundCount - 1,
                  scores: newScores
                }
              }));
            } catch (err) {
              console.error('Error deleting round:', err);
            }
          }}
          onToggleStatus={async (newStatus) => {
            try {
              const updatedBlocks = [...object.blocks];
              updatedBlocks[leaderboardModalData.blockIndex] = {
                ...updatedBlocks[leaderboardModalData.blockIndex],
                data: { 
                  ...updatedBlocks[leaderboardModalData.blockIndex].data, 
                  status: newStatus 
                }
              };
              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
              // Update local state
              setLeaderboardModalData(prev => ({
                ...prev,
                data: { ...prev.data, status: newStatus }
              }));
            } catch (err) {
              console.error('Error toggling status:', err);
            }
          }}
        />
      )}
      {textEditModalData && (
        <FullscreenTextEditor
          content={textEditModalData.content}
          title={textEditModalData.title}
          onSave={async (newContent) => {
            try {
              const updatedBlocks = [...object.blocks];
              updatedBlocks[textEditModalData.blockIndex] = {
                ...updatedBlocks[textEditModalData.blockIndex],
                data: { 
                  ...updatedBlocks[textEditModalData.blockIndex].data, 
                  content: newContent 
                }
              };
              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
              setTextEditModalData(null);
            } catch (err) {
              console.error('Error saving text content:', err);
              alert('Kunde inte spara texten');
            }
          }}
          onCancel={() => setTextEditModalData(null)}
        />
      )}
      {distributionModalData && (
        <DistributionModal
          data={object.blocks[distributionModalData.blockIndex]?.data || distributionModalData.data}
          currentUser={currentUser}
          shares={object.shares || {}}
          canEdit={canEdit}
          onClose={() => setDistributionModalData(null)}
          onCreateSlot={async (newSlot, leaveSlotId) => {
            try {
              const updatedBlocks = [...object.blocks];
              let currentSlots = updatedBlocks[distributionModalData.blockIndex].data.slots || [];
              
              // If user needs to leave another slot first, remove them
              if (leaveSlotId) {
                const currentUserKey = currentUser?.email?.replace(/\./g, '_DOT_');
                currentSlots = currentSlots.map(slot => {
                  if (slot.id === leaveSlotId) {
                    return { ...slot, assignees: (slot.assignees || []).filter(key => key !== currentUserKey) };
                  }
                  return slot;
                });
              }
              
              updatedBlocks[distributionModalData.blockIndex] = {
                ...updatedBlocks[distributionModalData.blockIndex],
                data: { 
                  ...updatedBlocks[distributionModalData.blockIndex].data, 
                  slots: [...currentSlots, newSlot]
                }
              };
              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
            } catch (err) {
              console.error('Error creating slot:', err);
              alert('Kunde inte skapa');
            }
          }}
          onJoinSlot={async (slotId, userKey, extraSeats = 0, extraSeatsNote = null) => {
            try {
              const updatedBlocks = [...object.blocks];
              const currentSlots = updatedBlocks[distributionModalData.blockIndex].data.slots || [];
              const updatedSlots = currentSlots.map(slot => {
                if (slot.id === slotId) {
                  const assignees = slot.assignees || [];
                  if (!assignees.includes(userKey)) {
                    // Add to assignees
                    const newAssignees = [...assignees, userKey];
                    // Store extra seats info if provided
                    const assigneeDetails = { ...(slot.assigneeDetails || {}) };
                    if (extraSeats > 0 || extraSeatsNote) {
                      assigneeDetails[userKey] = { extraSeats, note: extraSeatsNote };
                    }
                    return { ...slot, assignees: newAssignees, assigneeDetails };
                  }
                }
                return slot;
              });
              updatedBlocks[distributionModalData.blockIndex] = {
                ...updatedBlocks[distributionModalData.blockIndex],
                data: { 
                  ...updatedBlocks[distributionModalData.blockIndex].data, 
                  slots: updatedSlots
                }
              };
              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
            } catch (err) {
              console.error('Error joining slot:', err);
              alert('Kunde inte gå med');
            }
          }}
          onLeaveSlot={async (slotId, userKey) => {
            try {
              const updatedBlocks = [...object.blocks];
              const currentSlots = updatedBlocks[distributionModalData.blockIndex].data.slots || [];
              const updatedSlots = currentSlots.map(slot => {
                if (slot.id === slotId) {
                  const assignees = (slot.assignees || []).filter(key => key !== userKey);
                  // Remove from assigneeDetails too
                  const assigneeDetails = { ...(slot.assigneeDetails || {}) };
                  delete assigneeDetails[userKey];
                  return { ...slot, assignees, assigneeDetails };
                }
                return slot;
              });
              updatedBlocks[distributionModalData.blockIndex] = {
                ...updatedBlocks[distributionModalData.blockIndex],
                data: { 
                  ...updatedBlocks[distributionModalData.blockIndex].data, 
                  slots: updatedSlots
                }
              };
              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
            } catch (err) {
              console.error('Error leaving slot:', err);
              alert('Kunde inte lämna');
            }
          }}
          onDeleteSlot={async (slotId) => {
            try {
              const updatedBlocks = [...object.blocks];
              const currentSlots = updatedBlocks[distributionModalData.blockIndex].data.slots || [];
              const updatedSlots = currentSlots.filter(slot => slot.id !== slotId);
              updatedBlocks[distributionModalData.blockIndex] = {
                ...updatedBlocks[distributionModalData.blockIndex],
                data: { 
                  ...updatedBlocks[distributionModalData.blockIndex].data, 
                  slots: updatedSlots
                }
              };
              await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
            } catch (err) {
              console.error('Error deleting slot:', err);
              alert('Kunde inte ta bort');
            }
          }}
        />
      )}

      {/* Collection Map Modal */}
      {showCollectionMap && linkedObjectsWithCoords.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[3000] flex items-center justify-center p-4"
          onClick={() => setShowCollectionMap(false)}
        >
          <div 
            className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-purple-500/30 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MapIcon size={18} className="text-purple-400" />
                <h3 className="font-medium text-white">
                  Karta ({linkedObjectsWithCoords.length} {linkedObjectsWithCoords.length === 1 ? 'plats' : 'platser'})
                </h3>
              </div>
              <button
                onClick={() => setShowCollectionMap(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {/* Map */}
            <div className="h-[70vh]">
              <CollectionMapView 
                objects={linkedObjectsWithCoords}
                categories={categories}
                userLocation={userLocation}
                onSelectObject={(obj) => {
                  setShowCollectionMap(false);
                  onNavigate(obj);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Multi-Location Map Modal (for objects with multiple location blocks) */}
      {showMultiLocationMap && multiLocationMapObjects.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[3000] flex items-center justify-center p-4"
          onClick={() => setShowMultiLocationMap(false)}
        >
          <div 
            className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MapIcon size={18} className="text-blue-400" />
                <h3 className="font-medium text-white">
                  {object.blocks.find(b => b.type === 'title')?.data?.text || 'Platser'} ({multiLocationMapObjects.length + pendingLocations.length} platser)
                </h3>
                {pendingLocations.length > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                    {pendingLocations.length} väntar
                  </span>
                )}
                {!isOnline && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                    Offline
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowMultiLocationMap(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {/* Map */}
            <div className="h-[70vh]">
              <CollectionMapView 
                objects={multiLocationMapObjects}
                categories={categories}
                userLocation={userLocation}
                pendingLocations={pendingLocations}
                onAddLocation={showQuickCapture ? async (coords) => {
                  // Try to save to Firestore first
                  try {
                    const newBlock = {
                      type: 'location',
                      data: {
                        lat: coords.lat,
                        lng: coords.lng,
                        address: ''
                      }
                    };
                    const updatedBlocks = [...(object.blocks || []), newBlock];
                    await updateDoc(doc(db, 'objects', object.id), {
                      blocks: updatedBlocks
                    });
                    alert(`Plats #${ownLocationBlocks.length + pendingLocations.length + 1} tillagd!`);
                  } catch (err) {
                    console.error('Error adding location, saving locally:', err);
                    // Fallback: Save to localStorage for later sync
                    const newPending = savePendingLocation(object.id, coords);
                    setPendingLocations(newPending);
                    alert(`Plats #${ownLocationBlocks.length + newPending.length} sparad lokalt (synkas när nät finns)`);
                  }
                } : undefined}
                onSelectObject={() => {
                  // Stay on same object, just close the map
                  setShowMultiLocationMap(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ObjectDetail;
