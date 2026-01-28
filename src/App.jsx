import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { 
  MapPin, Home, Coffee, Mountain, Star, Calendar, X, Plus, Image, Edit2, Trash2, 
  Loader, LogOut, LogIn, Check, Circle, Upload, Folder, Navigation, Plane, 
  Map as MapIcon, List, ChevronDown, ArrowUp, ArrowDown, Search, Settings,
  UtensilsCrossed, Pizza, Wine, Beer, Gamepad2, Music, Film, PartyPopper, 
  Bike, Dumbbell, Waves, TreePine, Shell, Sprout, RotateCcw, Target, Lightbulb,
  SlidersHorizontal, Menu, Filter, Share2, UserPlus, UserMinus, Users, Mail
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, Tooltip, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db, auth, googleProvider } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp, getDoc, setDoc, deleteField, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored marker icons per category
const createColoredIcon = (color) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-marker-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const createUserIcon = () => {
  return L.divIcon({
    html: `<div class="user-marker-container">
      <div class="user-marker-pulse"></div>
      <div class="user-marker-dot"></div>
    </div>`,
    className: 'user-position-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12], // Center anchor - user IS at this exact point
    popupAnchor: [0, -12],
  });
};

const createAreaIcon = (color) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 35px; height: 35px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); opacity: 0.7; display: flex; align-items: center; justify-content: center;">
      <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px dashed white; opacity: 0.8;"></div>
    </div>`,
    className: 'area-marker-icon',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35],
  });
};

const CLOUDINARY_CLOUD_NAME = 'dkpwqradh';
const CLOUDINARY_UPLOAD_PRESET = 'ourspots_unsigned';

// Helper to transform Cloudinary URLs with smart cropping
const getTransformedImageUrl = (url, cropMode = 'auto', width = 800, height = 600) => {
  if (!url || !url.includes('cloudinary.com')) return url; // Return non-Cloudinary URLs as-is
  
  const gravityMap = {
    'auto': 'g_auto',
    'face': 'g_face', 
    'center': 'g_center'
  };
  
  const gravity = gravityMap[cropMode] || 'g_auto';
  const transformation = `c_fill,${gravity},w_${width},h_${height}`;
  
  // Insert transformation into Cloudinary URL
  return url.replace('/upload/', `/upload/${transformation}/`);
};

// Helper to resize image before upload
const resizeImage = (file, maxSize = 2000, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Only resize if larger than maxSize
        if (width <= maxSize && height <= maxSize) {
          resolve(file);
          return;
        }
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, file.type, quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to extract GPS coordinates from image EXIF data
const extractGPSFromImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target.result);
        
        // Check for JPEG signature
        if (view.getUint16(0, false) !== 0xFFD8) {
          resolve(null);
          return;
        }
        
        let offset = 2;
        const length = view.byteLength;
        
        // Find EXIF marker
        while (offset < length) {
          if (view.getUint16(offset, false) === 0xFFE1) {
            const exifOffset = offset + 10;
            
            // Check for EXIF signature
            if (view.getUint32(exifOffset - 6, false) !== 0x45786966) {
              break;
            }
            
            const littleEndian = view.getUint16(exifOffset, false) === 0x4949;
            const gpsOffset = findGPSOffset(view, exifOffset, littleEndian);
            
            if (gpsOffset) {
              const coords = parseGPS(view, gpsOffset, littleEndian);
              resolve(coords);
              return;
            }
          }
          offset += 2 + view.getUint16(offset + 2, false);
        }
        resolve(null);
      } catch (err) {
        console.error('EXIF parsing error:', err);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
};

const findGPSOffset = (view, exifOffset, littleEndian) => {
  const ifdOffset = exifOffset + view.getUint32(exifOffset + 4, littleEndian);
  const tags = view.getUint16(ifdOffset, littleEndian);
  
  for (let i = 0; i < tags; i++) {
    const tagOffset = ifdOffset + 2 + (i * 12);
    const tag = view.getUint16(tagOffset, littleEndian);
    
    // GPS IFD Pointer tag
    if (tag === 0x8825) {
      return exifOffset + view.getUint32(tagOffset + 8, littleEndian);
    }
  }
  return null;
};

const parseGPS = (view, gpsOffset, littleEndian) => {
  const tags = view.getUint16(gpsOffset, littleEndian);
  let latRef, lat, lngRef, lng;
  
  for (let i = 0; i < tags; i++) {
    const tagOffset = gpsOffset + 2 + (i * 12);
    const tag = view.getUint16(tagOffset, littleEndian);
    const valueOffset = gpsOffset - 10 + view.getUint32(tagOffset + 8, littleEndian);
    
    if (tag === 1) { // GPSLatitudeRef
      latRef = String.fromCharCode(view.getUint8(tagOffset + 8));
    } else if (tag === 2) { // GPSLatitude
      lat = parseGPSCoordinate(view, valueOffset, littleEndian);
    } else if (tag === 3) { // GPSLongitudeRef
      lngRef = String.fromCharCode(view.getUint8(tagOffset + 8));
    } else if (tag === 4) { // GPSLongitude
      lng = parseGPSCoordinate(view, valueOffset, littleEndian);
    }
  }
  
  if (lat && lng) {
    return {
      lat: latRef === 'S' ? -lat : lat,
      lng: lngRef === 'W' ? -lng : lng
    };
  }
  return null;
};

const parseGPSCoordinate = (view, offset, littleEndian) => {
  const deg = view.getUint32(offset, littleEndian) / view.getUint32(offset + 4, littleEndian);
  const min = view.getUint32(offset + 8, littleEndian) / view.getUint32(offset + 12, littleEndian);
  const sec = view.getUint32(offset + 16, littleEndian) / view.getUint32(offset + 20, littleEndian);
  return deg + min / 60 + sec / 3600;
};

// Helper to get icon component from string name
const iconMap = {
  MapPin, Home, Coffee, Mountain, Star, Calendar, Folder, Navigation, Plane,
  UtensilsCrossed, Pizza, Wine, Beer, Gamepad2, Music, Film, PartyPopper,
  Bike, Dumbbell, Waves, TreePine, Shell, Sprout, RotateCcw
};

const getIconComponent = (iconName) => {
  return iconMap[iconName] || Home;
};

// Legacy emoji mapping for backward compatibility (will be phased out)
const PREDEFINED_ICONS = {
  '🏡': { icon: Home, label: 'Fastighet' },
  '🏠': { icon: Home, label: 'Hus' },
  '☕': { icon: Coffee, label: 'Kafé' },
  '🏞️': { icon: Mountain, label: 'Natur' },
  '⭐': { icon: Star, label: 'Favorit' },
  '✈️': { icon: Calendar, label: 'Resa' },
  // New string-based IDs
  'property': { icon: Home, label: 'Fastighet' },
  'cafe': { icon: Coffee, label: 'Kafé' },
  'nature': { icon: Mountain, label: 'Natur' }
};

const TitleBlock = ({ data }) => (
  <h2 className="text-2xl font-bold text-white mb-2">{data.text}</h2>
);

const LocationBlock = ({ data, inherited, onDelete, canDelete, positionNumber, onShowOnMap }) => {
  const [showNavMenu, setShowNavMenu] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowNavMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openGoogleMaps = () => {
    if (data.lat && data.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`, '_blank');
      setShowNavMenu(false);
    }
  };

  const openWaze = () => {
    if (data.lat && data.lng) {
      window.open(`https://waze.com/ul?ll=${data.lat},${data.lng}&navigate=yes`, '_blank');
      setShowNavMenu(false);
    }
  };

  const handleShowOnMap = () => {
    if (onShowOnMap && data.lat && data.lng) {
      onShowOnMap({ lat: data.lat, lng: data.lng });
      setShowNavMenu(false);
    }
  };

  return (
    <div className="py-2 px-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
      <MapPin size={16} className="text-blue-400 flex-shrink-0" />
      {positionNumber && (
        <span className="text-xs font-semibold text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded">
          Pin {positionNumber}
        </span>
      )}
      <span className="text-xs text-gray-200 flex-1">
        {data.address || (data.lat && data.lng ? `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}` : 'Ingen plats')}
      </span>
      {inherited && <span className="text-xs text-gray-500">(från parent)</span>}
      {data.lat && data.lng && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowNavMenu(!showNavMenu)}
            className="p-1 rounded hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors"
            title="Navigation"
          >
            <Navigation size={14} />
          </button>
          {showNavMenu && (
            <div className="absolute right-0 top-8 bg-gray-800 border border-white/20 rounded-lg shadow-xl z-50 min-w-[160px]">
              {onShowOnMap && (
                <button
                  onClick={handleShowOnMap}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10 flex items-center gap-2 rounded-t-lg"
                >
                  <MapIcon size={12} />
                  Visa på karta
                </button>
              )}
              <button
                onClick={openGoogleMaps}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10 flex items-center gap-2"
              >
                <Navigation size={12} />
                Google Maps
              </button>
              <button
                onClick={openWaze}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10 flex items-center gap-2 rounded-b-lg"
              >
                <Navigation size={12} />
                Waze
              </button>
            </div>
          )}
        </div>
      )}
      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
          title="Ta bort position"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

const ImageBlock = ({ data }) => (
  <div className="w-full h-48 rounded-xl overflow-hidden mb-4 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)]">
    <img src={getTransformedImageUrl(data.url, data.cropMode, 800, 480)} alt="" className="w-full h-full object-cover" />
  </div>
);

const TextBlock = ({ data }) => (
  <div className="mb-4 rounded-2xl bg-white/10 border border-white/10 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.7)] p-4">
    <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">{data.content}</p>
  </div>
);

const ChecklistBlock = ({ data, objectId, blockIndex, onUpdate }) => {
  const handleToggle = async (itemIndex) => {
    if (!onUpdate) return;
    const newItems = data.items.map((item, i) => 
      i === itemIndex ? { ...item, checked: !item.checked } : item
    );
    await onUpdate(objectId, blockIndex, { ...data, items: newItems });
  };

  const handleReset = async () => {
    if (!onUpdate) return;
    if (!confirm('Vill du nollställa alla markeringar?')) return;
    const newItems = data.items.map(item => ({ ...item, checked: false }));
    await onUpdate(objectId, blockIndex, { ...data, items: newItems });
  };

  const hasChecked = data.items.some(item => item.checked);

  return (
    <div className="mb-4 rounded-2xl bg-white/10 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)] p-4">
      {hasChecked && onUpdate && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-all"
            title="Nollställ alla markeringar"
          >
            <RotateCcw size={12} />
            <span>Nollställ</span>
          </button>
        </div>
      )}
      <div className="space-y-2">
        {data.items.map((item, i) => (
          <div 
            key={i}
            onClick={() => handleToggle(i)}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer transition-all group"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              item.checked ? 'bg-blue-500 border-blue-500' : 'border-white/20 group-hover:border-blue-400'
            }`}>
              {item.checked && <Check size={14} className="text-white" />}
            </div>
            <span className={`text-sm flex-1 transition-all ${
              item.checked ? 'text-gray-500 line-through' : 'text-gray-100'
            }`}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TodoBlock = ({ data, objectId, blockIndex, onUpdate }) => {
  const handleToggle = async (itemIndex) => {
    if (!onUpdate) return;
    const newItems = data.items.map((item, i) => 
      i === itemIndex ? { ...item, done: !item.done } : item
    );
    await onUpdate(objectId, blockIndex, { ...data, items: newItems });
  };

  const handleReset = async () => {
    if (!onUpdate) return;
    if (!confirm('Vill du nollställa alla markeringar?')) return;
    const newItems = data.items.map(item => ({ ...item, done: false }));
    await onUpdate(objectId, blockIndex, { ...data, items: newItems });
  };

  const totalItems = data.items.length;
  const doneItems = data.items.filter(item => item.done).length;
  const progress = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;

  return (
    <div className="mb-4 rounded-2xl bg-white/10 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">{doneItems}/{totalItems} klara</span>
        {doneItems > 0 && onUpdate && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-all"
            title="Nollställ alla markeringar"
          >
            <RotateCcw size={12} />
            <span>Nollställ</span>
          </button>
        )}
      </div>
      <div className="mb-3 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-2">
        {data.items.map((item, i) => (
          <div 
            key={i}
            onClick={() => handleToggle(i)}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer transition-all group"
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              item.done ? 'bg-green-500 border-green-500' : 'border-white/20 group-hover:border-green-400'
            }`}>
              {item.done && <Check size={14} className="text-white" />}
            </div>
            <span className={`text-sm flex-1 transition-all ${
              item.done ? 'text-gray-500 line-through' : 'text-gray-100'
            }`}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const blockComponents = {
  title: TitleBlock,
  location: LocationBlock,
  image: ImageBlock,
  text: TextBlock,
  checklist: ChecklistBlock,
  todo: TodoBlock
};

function ObjectCard({ object, onClick, currentUser, childCount, distance, categories, isFavorite, onToggleFavorite, onNavigate, onShare }) {
  // Find category to get icon
  const category = categories.find(c => c.id === object.type);
  const IconComponent = category ? getIconComponent(category.icon) : (PREDEFINED_ICONS[object.type]?.icon || Home);
  const titleBlock = object.blocks.find(b => b.type === 'title');
  const imageBlock = object.blocks.find(b => b.type === 'image');
  const locationBlock = object.blocks.find(b => b.type === 'location');
  const isOwner = currentUser && object.ownerId === currentUser.uid;
  const isSharedWithMe = currentUser && object.shares?.[currentUser.email]?.status === 'accepted';
  const myRole = isSharedWithMe ? object.shares[currentUser.email].role : null;

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(object.id);
  };

  const handleShareClick = (e) => {
    e.stopPropagation();
    if (onShare) onShare(object);
  };

  const openWaze = (e) => {
    e.stopPropagation();
    if (locationBlock?.data?.lat && locationBlock?.data?.lng) {
      window.open(`https://waze.com/ul?ll=${locationBlock.data.lat},${locationBlock.data.lng}&navigate=yes`, '_blank');
    }
  };

  const handleShowOnMap = (e) => {
    e.stopPropagation();
    if (onNavigate && locationBlock?.data?.lat && locationBlock?.data?.lng) {
      onNavigate({ lat: locationBlock.data.lat, lng: locationBlock.data.lng });
    }
  };

  const hasLocation = locationBlock?.data?.lat && locationBlock?.data?.lng;

  return (
    <div onClick={onClick} className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-blue-400/50 transition-all cursor-pointer transform hover:scale-[1.02] relative group">
      {imageBlock ? (
        <>
          {currentUser && (
            <div className="absolute top-2 left-2 z-10 flex gap-1">
              <button
                onClick={handleFavoriteClick}
                className="p-1.5 rounded-full bg-gray-900/70 backdrop-blur-sm hover:bg-gray-800/90 hover:scale-110 transition-all duration-200"
                title={isFavorite ? 'Ta bort från favoriter' : 'Lägg till i favoriter'}
              >
                <Star 
                  size={16} 
                  className={`transition-colors ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-300'}`}
                />
              </button>
              {isOwner && (
                <button
                  onClick={handleShareClick}
                  className="p-1.5 rounded-full bg-gray-900/70 backdrop-blur-sm hover:bg-gray-800/90 hover:scale-110 transition-all duration-200"
                  title="Dela objekt"
                >
                  <Share2 size={16} className="text-gray-400 hover:text-blue-300" />
                </button>
              )}
            </div>
          )}
          {/* Top-right badges */}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            {childCount > 0 && (
              <div className="bg-white/10 backdrop-blur-sm text-gray-200 text-xs px-2 py-1 rounded-full border border-white/15 flex items-center gap-1">
                <Folder size={12} className="text-gray-300" />
                {childCount}
              </div>
            )}
            {isSharedWithMe && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${myRole === 'editor' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                <Users size={10} />
                {myRole === 'editor' ? 'Redigerare' : 'Delad'}
              </div>
            )}
          </div>
          <div className="w-full h-40 overflow-hidden">
            <img src={getTransformedImageUrl(imageBlock.data.url, imageBlock.data.cropMode, 800, 320)} alt="" className="w-full h-full object-cover" />
          </div>
        </>
      ) : null}
      <div className="p-4">
        {!category && isOwner && (
          <div className="mb-2 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/20">
            ⚠️ Ogiltig kategori - redigera objektet
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <IconComponent size={18} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            {titleBlock && <h3 className="text-lg font-semibold text-white truncate">{titleBlock.data.text}</h3>}
          </div>
          {currentUser && (
            <button
              onClick={handleFavoriteClick}
              className={`p-1.5 rounded-full hover:bg-white/10 hover:scale-110 transition-all duration-200 flex-shrink-0 ${imageBlock ? 'hidden' : ''}`}
              title={isFavorite ? 'Ta bort från favoriter' : 'Lägg till i favoriter'}
            >
              <Star 
                size={16} 
                className={`transition-colors ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-300'}`}
              />
            </button>
          )}
        </div>
        
        {/* Compact info row for cards without image */}
        {!imageBlock && (childCount > 0 || distance !== undefined || isSharedWithMe) && (
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            {isSharedWithMe && (
              <span className={`flex items-center gap-1 ${myRole === 'editor' ? 'text-green-400' : 'text-purple-400'}`}>
                <Users size={12} />
                {myRole === 'editor' ? 'Redigerare' : 'Delad'}
              </span>
            )}
            {childCount > 0 && (
              <span className="flex items-center gap-1">
                <Folder size={12} />
                {childCount} barn
              </span>
            )}
            {distance !== undefined && (
              <span className="flex items-center gap-1 text-blue-400">
                <MapPin size={12} />
                {distance.toFixed(1)} km
              </span>
            )}
          </div>
        )}
        
        {/* Location info - only address for cards with image */}
        {imageBlock && locationBlock?.data?.address && (
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <MapPin size={14} className="flex-shrink-0" />
            <span className="truncate flex-1">{locationBlock.data.address}</span>
            {distance !== undefined && (
              <span className="text-blue-400 flex-shrink-0">{distance.toFixed(1)} km</span>
            )}
          </div>
        )}
        
        {/* Action buttons */}
        {hasLocation && (
          <div className="flex gap-2">
            <button
              onClick={handleShowOnMap}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-sm"
            >
              <MapIcon size={14} />
              <span>Karta</span>
            </button>
            <button
              onClick={openWaze}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-sm"
            >
              <Navigation size={14} />
              <span>Navigera</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteConfirmModal({ object, onConfirm, onCancel }) {
  const titleBlock = object.blocks.find(b => b.type === 'title');
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-red-500/30 max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 size={24} className="text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Ta bort objekt?</h3>
        </div>
        <p className="text-gray-300 mb-6">
          Är du säker på att du vill ta bort <span className="font-semibold text-white">"{titleBlock?.data?.text || 'detta objekt'}"</span>? Detta kan inte ångras.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">Avbryt</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all">Ta bort</button>
        </div>
      </div>
    </div>
  );
}

// List of available icons for categories
const AVAILABLE_ICONS = [
  { name: 'Home', label: 'Hem' },
  { name: 'Coffee', label: 'Kafé' },
  { name: 'Mountain', label: 'Berg' },
  { name: 'Star', label: 'Stjärna' },
  { name: 'MapPin', label: 'Plats' },
  { name: 'Calendar', label: 'Kalender' },
  { name: 'Folder', label: 'Mapp' },
  { name: 'Navigation', label: 'Navigation' },
  { name: 'Plane', label: 'Resor' },
  { name: 'UtensilsCrossed', label: 'Mat och dryck' },
  { name: 'Pizza', label: 'Pizza' },
  { name: 'Wine', label: 'Vin' },
  { name: 'Beer', label: 'Öl' },
  { name: 'Gamepad2', label: 'Nöjen' },
  { name: 'Music', label: 'Musik' },
  { name: 'Film', label: 'Film' },
  { name: 'PartyPopper', label: 'Fest' },
  { name: 'Bike', label: 'Aktiviteter' },
  { name: 'Dumbbell', label: 'Träning' },
  { name: 'Waves', label: 'Vatten' },
  { name: 'TreePine', label: 'Skog' },
  { name: 'Shell', label: 'Strand' },
  { name: 'Sprout', label: 'Svamp' },
];

function ObjectsAdminModal({ objects, categories, onClose, onEditObject }) {
  const [sortBy, setSortBy] = useState('title'); // title, category, parent
  const [filterUserId, setFilterUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const getObjectTitle = (obj) => {
    return obj.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlöst objekt';
  };

  const getCategoryLabel = (typeId) => {
    const cat = categories.find(c => c.id === typeId);
    return cat ? cat.label : `❌ ${typeId}`;
  };

  const getChildCount = (objId) => {
    return objects.filter(o => o.parentId === objId).length;
  };

  // Get unique users from objects with their info
  const usersMap = new Map();
  objects.forEach(obj => {
    if (obj.ownerId && !usersMap.has(obj.ownerId)) {
      usersMap.set(obj.ownerId, {
        id: obj.ownerId,
        name: obj.ownerName || obj.ownerEmail || obj.ownerId,
        email: obj.ownerEmail
      });
    }
  });
  const users = Array.from(usersMap.values());
  
  // Filter objects - show nothing if no filter selected
  let filteredObjects = [];
  if (filterUserId === 'all') {
    filteredObjects = objects;
  } else if (filterUserId) {
    filteredObjects = objects.filter(o => o.ownerId === filterUserId);
  }
  
  if (searchTerm && filteredObjects.length > 0) {
    const term = searchTerm.toLowerCase();
    filteredObjects = filteredObjects.filter(o => getObjectTitle(o).toLowerCase().includes(term));
  }

  // Sort objects
  let sortedObjects = [...filteredObjects];
  if (sortBy === 'title') {
    sortedObjects.sort((a, b) => getObjectTitle(a).localeCompare(getObjectTitle(b)));
  } else if (sortBy === 'category') {
    sortedObjects.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
  } else if (sortBy === 'parent') {
    sortedObjects.sort((a, b) => {
      if (a.parentId && !b.parentId) return 1;
      if (!a.parentId && b.parentId) return -1;
      return (a.parentId || '').localeCompare(b.parentId || '');
    });
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">
              Alla objekt {filterUserId && `(${sortedObjects.length}${filterUserId === 'all' ? '' : ` av ${objects.length}`})`}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-3">
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
            >
              <option value="">Inget val - välj användare</option>
              <option value="all">Alla användare ({objects.length} objekt)</option>
              {users.map(user => {
                const userObjects = objects.filter(o => o.ownerId === user.id);
                return (
                  <option key={user.id} value={user.id}>
                    {user.name} ({userObjects.length} objekt)
                  </option>
                );
              })}
            </select>
            <input
              type="text"
              placeholder="Sök på titel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('title')}
                className={`flex-1 px-3 py-1.5 rounded text-sm ${sortBy === 'title' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300'}`}
              >
                Titel
              </button>
              <button
                onClick={() => setSortBy('category')}
                className={`flex-1 px-3 py-1.5 rounded text-sm ${sortBy === 'category' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300'}`}
              >
                Kategori
              </button>
              <button
                onClick={() => setSortBy('parent')}
                className={`flex-1 px-3 py-1.5 rounded text-sm ${sortBy === 'parent' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300'}`}
              >
                Parent
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-2">
            {sortedObjects.map(obj => {
              const hasInvalidCategory = !categories.find(c => c.id === obj.type);
              const parent = obj.parentId ? objects.find(o => o.id === obj.parentId) : null;
              const childCount = getChildCount(obj.id);
              const hasCircularParent = obj.parentId === obj.id;
              const hasInvalidParent = obj.parentId && !parent;
              
              return (
                <div
                  key={obj.id}
                  className={`p-4 rounded-xl border ${hasInvalidCategory || hasCircularParent || hasInvalidParent ? 'bg-yellow-400/5 border-yellow-400/30' : 'bg-white/5 border-white/10'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium truncate">{getObjectTitle(obj)}</h3>
                        {(hasInvalidCategory || hasCircularParent || hasInvalidParent) && (
                          <span className="text-yellow-400 text-xs">⚠️</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <div>Kategori: <span className={hasInvalidCategory ? 'text-yellow-400' : 'text-gray-300'}>{getCategoryLabel(obj.type)}</span></div>
                        {obj.parentId && (
                          <div>
                            Parent: <span className={hasCircularParent ? 'text-red-400' : hasInvalidParent ? 'text-yellow-400' : 'text-blue-400'}>
                              {hasCircularParent ? '🔁 Cirkulär (sig själv!)' : parent ? getObjectTitle(parent) : `❌ ${obj.parentId}`}
                            </span>
                          </div>
                        )}
                        {childCount > 0 && (
                          <div>Children: <span className="text-green-400">{childCount}</span></div>
                        )}
                        <div className="text-xs text-gray-500">ID: {obj.id}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {(hasCircularParent || hasInvalidParent) && (
                        <button
                          onClick={async () => {
                            if (confirm('Ta bort parent-referensen?')) {
                              try {
                                await updateDoc(doc(db, 'objects', obj.id), { parentId: deleteField() });
                              } catch (err) {
                                console.error('Error removing parent:', err);
                                alert('Kunde inte ta bort parent');
                              }
                            }
                          }}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                        >
                          Ta bort parent
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onEditObject(obj);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                      >
                        Redigera
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryAdminModal({ categories, onClose, currentUser, objects }) {
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ label: '', icon: 'Home', color: '#6B7280' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSaveCategory = async () => {
    if (!newCategory.label.trim()) return;
    setSaving(true);
    try {
      const categoryId = newCategory.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) : 0;
      await setDoc(doc(db, 'categories', categoryId), {
        label: newCategory.label.trim(),
        icon: newCategory.icon,
        color: newCategory.color,
        order: maxOrder + 1,
        createdAt: Timestamp.now(),
        createdBy: currentUser.uid
      });
      setNewCategory({ label: '', icon: 'Home', color: '#6B7280' });
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Kunde inte spara kategori');
    }
    setSaving(false);
  };

  const handleUpdateCategory = async (categoryId, updates) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'categories', categoryId), updates);
      setEditingCategory(null);
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Kunde inte uppdatera kategori');
    }
    setSaving(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    // Check if any objects use this category
    const objectsWithCategory = objects.filter(obj => obj.type === categoryId);
    
    if (objectsWithCategory.length > 0) {
      if (!confirm(`${objectsWithCategory.length} objekt använder denna kategori. De kommer att ändras till 'Okategoriserad'. Fortsätt?`)) {
        setShowDeleteConfirm(null);
        return;
      }
      
      // Update all objects to have no category (or a default one)
      try {
        for (const obj of objectsWithCategory) {
          await updateDoc(doc(db, 'objects', obj.id), { type: 'uncategorized' });
        }
      } catch (err) {
        console.error('Error updating objects:', err);
        alert('Kunde inte uppdatera objekt');
        setShowDeleteConfirm(null);
        return;
      }
    }

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Kunde inte radera kategori');
    }
    setSaving(false);
  };

  const handleMoveCategory = async (categoryId, direction) => {
    const currentIndex = categories.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    const currentCat = sortedCategories[currentIndex];
    const swapCat = sortedCategories[newIndex];

    setSaving(true);
    try {
      await updateDoc(doc(db, 'categories', currentCat.id), { order: swapCat.order });
      await updateDoc(doc(db, 'categories', swapCat.id), { order: currentCat.order });
    } catch (err) {
      console.error('Error moving category:', err);
      alert('Kunde inte flytta kategori');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[2100] flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Settings size={20} className="text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Hantera kategorier</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Add new category */}
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">Skapa ny kategori</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Namn</label>
                <input
                  type="text"
                  value={newCategory.label}
                  onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })}
                  placeholder="T.ex. Restauranger"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Ikon</label>
                  <select
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-blue-400"
                    style={{ colorScheme: 'dark' }}
                  >
                    {AVAILABLE_ICONS.map(icon => {
                      const IconComp = getIconComponent(icon.name);
                      return (
                        <option key={icon.name} value={icon.name}>{icon.label}</option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Färg</label>
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="w-full h-[42px] rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {React.createElement(getIconComponent(newCategory.icon), { size: 20, style: { color: newCategory.color } })}
                <span className="text-gray-300 text-sm">Förhandsgranskning</span>
              </div>
              <button
                onClick={handleSaveCategory}
                disabled={!newCategory.label.trim() || saving}
                className="w-full px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Sparar...' : 'Skapa kategori'}
              </button>
            </div>
          </div>

          {/* Existing categories */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white mb-3">Befintliga kategorier</h3>
            {categories.length === 0 ? (
              <p className="text-gray-400 text-sm">Inga kategorier än</p>
            ) : (
              categories.map((cat, index) => {
                const IconComp = getIconComponent(cat.icon);
                const objectCount = objects.filter(obj => obj.type === cat.id).length;
                return (
                  <div key={cat.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    {editingCategory?.id === cat.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Namn</label>
                          <input
                            type="text"
                            value={editingCategory.label}
                            onChange={(e) => setEditingCategory({ ...editingCategory, label: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Ikon</label>
                            <select
                              value={editingCategory.icon}
                              onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-blue-400"
                              style={{ colorScheme: 'dark' }}
                            >
                              {AVAILABLE_ICONS.map(icon => (
                                <option key={icon.name} value={icon.name}>{icon.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Färg</label>
                            <input
                              type="color"
                              value={editingCategory.color}
                              onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                              className="w-full h-[42px] rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateCategory(cat.id, { label: editingCategory.label, icon: editingCategory.icon, color: editingCategory.color })}
                            disabled={saving}
                            className="flex-1 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50"
                          >
                            Spara
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            disabled={saving}
                            className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-all"
                          >
                            Avbryt
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                            <IconComp size={20} style={{ color: cat.color }} />
                          </div>
                          <div>
                            <div className="text-white font-medium">{cat.label}</div>
                            <div className="text-xs text-gray-400">{objectCount} objekt</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveCategory(cat.id, 'up')}
                            disabled={index === 0 || saving}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30"
                            title="Flytta upp"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => handleMoveCategory(cat.id, 'down')}
                            disabled={index === categories.length - 1 || saving}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30"
                            title="Flytta ner"
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            onClick={() => setEditingCategory(cat)}
                            disabled={saving}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                            title="Redigera"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(cat)}
                            disabled={saving}
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                            title="Ta bort"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2200] flex items-center justify-center p-4">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-red-500/30 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Ta bort kategori?</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Är du säker på att du vill ta bort kategorin <span className="font-semibold text-white">"{showDeleteConfirm.label}"</span>?
              {objects.filter(obj => obj.type === showDeleteConfirm.id).length > 0 && (
                <span className="block mt-2 text-yellow-400">
                  ⚠️ {objects.filter(obj => obj.type === showDeleteConfirm.id).length} objekt använder denna kategori.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
              >
                Avbryt
              </button>
              <button
                onClick={() => handleDeleteCategory(showDeleteConfirm.id)}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all disabled:opacity-50"
              >
                {saving ? 'Raderar...' : 'Ta bort'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ObjectDetail({ object, onClose, onEdit, onDelete, onBlockUpdate, currentUser, allObjects, onNavigate, categories, isAdmin, onShowOnMap, onShare }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState(new Set([0])); // First block expanded by default
  const [showManageSection, setShowManageSection] = useState(false);
  // Find category to get icon
  const category = categories.find(c => c.id === object.type);
  const IconComponent = category ? getIconComponent(category.icon) : (PREDEFINED_ICONS[object.type]?.icon || Home);
  const isOwner = currentUser && object.ownerId === currentUser.uid;
  const isSharedWithMe = currentUser && object.shares?.[currentUser.email]?.status === 'accepted';
  const myRole = isSharedWithMe ? object.shares[currentUser.email].role : null;
  const canEdit = isOwner || isAdmin || myRole === 'editor';
  const canManage = isOwner || isAdmin;
  
  const childObjects = allObjects.filter(o => o.parentId === object.id);
  const parentObject = object.parentId ? allObjects.find(o => o.id === object.parentId) : null;
  
  // Inherit location from parent if child doesn't have one
  const hasOwnLocation = object.blocks.some(b => b.type === 'location');
  const parentLocation = parentObject?.blocks?.find(b => b.type === 'location');
  const rawBlocks = hasOwnLocation || !parentLocation 
    ? object.blocks 
    : [...object.blocks, { type: 'location', data: parentLocation.data, inherited: true }];
  
  const blocksToRender = rawBlocks.sort((a, b) => {
    const order = { 'title': 0, 'image': 1, 'location': 2, 'text': 3, 'checklist': 3, 'todo': 3 };
    const aOrder = order[a.type] !== undefined ? order[a.type] : 4;
    const bOrder = order[b.type] !== undefined ? order[b.type] : 4;
    return aOrder - bOrder;
  });
  
  const handleDelete = async () => {
    await onDelete(object.id);
    onClose();
  };
  
  return (
    <>
      <div 
        className="fixed inset-0 z-[1000] overflow-hidden" 
        style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(59,130,246,0.35), transparent 40%),
            radial-gradient(circle at 70% 60%, rgba(139,92,246,0.25), transparent 45%),
            radial-gradient(circle at 50% 90%, rgba(56,189,248,0.2), transparent 50%),
            linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.85))
          `,
          backdropFilter: 'blur(16px)'
        }}
        onClick={onClose}
      >
        <div className="min-h-screen p-2 sm:p-4 flex items-start justify-center pt-2 sm:pt-20">
            <div 
              className="rounded-3xl border max-w-2xl w-full p-4 sm:p-6 max-h-[96vh] sm:max-h-[80vh] overflow-y-auto relative"
              style={{
                background: `
                  radial-gradient(circle at 20% 10%, rgba(59,130,246,0.12), transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(139,92,246,0.08), transparent 50%),
                  linear-gradient(135deg, rgba(15,23,42,0.98), rgba(6,7,12,0.98))
                `,
                backdropFilter: 'blur(32px)',
                borderColor: 'rgba(139,92,246,0.3)',
                boxShadow: `
                  0 0 0 1px rgba(59,130,246,0.1) inset,
                  0 32px 96px -16px rgba(0,0,0,0.9),
                  0 0 80px -20px rgba(59,130,246,0.3),
                  0 0 40px -10px rgba(139,92,246,0.2)
                `
              }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <IconComponent size={24} className="text-blue-400" />
                </div>
                <span className="text-gray-400 text-sm">{category?.label || (PREDEFINED_ICONS[object.type]?.label || 'Objekt')}</span>
                {parentObject && (
                  <button
                    onClick={() => onNavigate(parentObject)}
                    className="ml-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-sm flex items-center gap-2 border border-white/10"
                    title={`Tillbaka till ${parentObject.blocks.find(b => b.type === 'title')?.data?.text || 'Parent'}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6"/>
                    </svg>
                    <span>{parentObject.blocks.find(b => b.type === 'title')?.data?.text || 'Parent'}</span>
                  </button>
                )}
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              {(() => {
                const sorted = blocksToRender
                  .filter(block => blockComponents[block.type]);
                return sorted.map((block, index) => {
                const BlockComponent = blockComponents[block.type];
                const isExpanded = expandedBlocks.has(index);
                const toggleExpanded = () => {
                  const newSet = new Set(expandedBlocks);
                  if (newSet.has(index)) {
                    newSet.delete(index);
                  } else {
                    newSet.add(index);
                  }
                  setExpandedBlocks(newSet);
                };
                
                // Count blocks of same type for labeling
                const sameTypeBlocks = blocksToRender.filter(b => b.type === block.type);
                const blockNumber = sameTypeBlocks.indexOf(block) + 1;
                const showBlockLabel = sameTypeBlocks.length > 1;
                const customTitle = block.data?.title;
                const shouldShowLabel = customTitle || showBlockLabel;
                const isCollapsible = ['text', 'checklist', 'todo'].includes(block.type);
                
                // For location blocks, show delete if there are multiple
                const locationBlocks = blocksToRender.filter(b => b.type === 'location' && !b.inherited);
                const canDeleteLocation = block.type === 'location' && locationBlocks.length > 1 && !block.inherited;
                const locationIndex = block.type === 'location' && !block.inherited ? locationBlocks.indexOf(block) + 1 : null;
                
                const handleDeleteBlock = async () => {
                  if (!window.confirm('Ta bort denna position?')) return;
                  try {
                    const updatedBlocks = object.blocks.filter((_, i) => i !== index);
                    await updateDoc(doc(db, 'objects', object.id), {
                      blocks: updatedBlocks
                    });
                  } catch (err) {
                    console.error('Error deleting block:', err);
                    alert('Kunde inte ta bort position');
                  }
                };
                
                return BlockComponent ? (
                  <div key={index}>
                    {isCollapsible && (
                      <button
                        onClick={toggleExpanded}
                        className="w-full flex items-center gap-2 mb-2 group"
                      >
                        <ChevronDown 
                          size={18} 
                          className={`text-gray-400 group-hover:text-white transition-all ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                        />
                        {shouldShowLabel && (
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-300 transition-colors">
                            {customTitle ? customTitle : (
                              <>
                                {block.type === 'text' && `Anteckning ${blockNumber}`}
                                {block.type === 'checklist' && `Checklista ${blockNumber}`}
                                {block.type === 'todo' && `Att göra ${blockNumber}`}
                                {!['text', 'checklist', 'todo'].includes(block.type) && `${block.type} ${blockNumber}`}
                              </>
                            )}
                          </div>
                        )}
                      </button>
                    )}
                    {(!isCollapsible || isExpanded) && (
                      <div className={shouldShowLabel && isCollapsible ? 'border-l-4 border-blue-500/30 pl-4' : ''}>
                        <BlockComponent 
                          key={index} 
                          data={block.data} 
                          objectId={object.id} 
                          blockIndex={index} 
                          onUpdate={onBlockUpdate} 
                          inherited={block.inherited}
                          isExpanded={isExpanded}
                          onToggle={toggleExpanded}
                          canDelete={canDeleteLocation}
                          onDelete={handleDeleteBlock}
                          positionNumber={locationBlocks.length > 1 ? locationIndex : null}
                          onShowOnMap={onShowOnMap}
                        />
                      </div>
                    )}
                  </div>
                ) : null;
              });
              })()}
            </div>
            {childObjects.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Ingår i detta objekt:</h3>
                  {isOwner && (
                    <button
                      onClick={() => onEdit({ parentId: object.id })}
                      className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-md flex items-center justify-center text-white transition-all hover:scale-105"
                      title="Lägg till underobjekt"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  {childObjects.map(child => {
                    const childTitle = child.blocks.find(b => b.type === 'title');
                    const childImage = child.blocks.find(b => b.type === 'image');
                    const ChildIcon = PREDEFINED_ICONS[child.type]?.icon || Home;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-400/50 transition-all text-left col-span-1"
                      >
                        {childImage ? (
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                            <img src={getTransformedImageUrl(childImage.data.url, childImage.data.cropMode, 64, 64)} alt="" className="w-full h-full object-cover" />
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
              </div>
            )}
            {/* Shared with me indicator */}
            {isSharedWithMe && (
              <div className={`mt-4 p-3 rounded-xl border ${myRole === 'editor' ? 'bg-green-500/10 border-green-500/30' : 'bg-purple-500/10 border-purple-500/30'}`}>
                <div className="flex items-center gap-2 text-sm">
                  <Users size={16} className={myRole === 'editor' ? 'text-green-400' : 'text-purple-400'} />
                  <span className={myRole === 'editor' ? 'text-green-300' : 'text-purple-300'}>
                    {myRole === 'editor' ? 'Du kan redigera detta objekt' : 'Delat med dig (endast visning)'}
                  </span>
                </div>
              </div>
            )}
            {(canManage || canEdit) && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={() => setShowManageSection(!showManageSection)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Settings size={18} />
                    <span className="font-medium">Hantera objekt</span>
                  </div>
                  <ChevronDown 
                    size={18} 
                    className={`transition-transform ${showManageSection ? 'rotate-180' : ''}`}
                  />
                </button>
                {showManageSection && (
                  <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {/* Share button - only for owners */}
                    {isOwner && (
                      <button
                        onClick={() => onShare && onShare(object)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 transition-all"
                      >
                        <Share2 size={16} />
                        <span className="text-sm">Dela objekt</span>
                        {Object.keys(object.shares || {}).length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/30 text-xs">
                            {Object.keys(object.shares).length}
                          </span>
                        )}
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => onEdit({ parentId: object.id })}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                      >
                        <Plus size={16} />
                        <span className="text-sm">Lägg till barn</span>
                      </button>
                    )}
                    <div className="flex gap-2">
                      {canEdit && (
                        <button onClick={() => onEdit(object)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                          <Edit2 size={16} />
                          <span className="text-sm">Redigera</span>
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all">
                          <Trash2 size={16} />
                          <span className="text-sm">Ta bort</span>
                        </button>
                      )}
                    </div>
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
    </>
  );
}

function MapView({ objects, onSelectObject, currentUser, userLocation, categories, mapCenter }) {
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

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

  const center = markersData.length > 0
    ? [
        markersData.reduce((sum, m) => sum + m._position.lat, 0) / markersData.length,
        markersData.reduce((sum, m) => sum + m._position.lng, 0) / markersData.length
      ]
    : [59.33, 18.06];

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
    const handleCenterOnUser = () => {
      // Use already known userLocation (instant!)
      if (userLocation) {
        map.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 0.5 });
        return;
      }

      // Fallback: Request fresh GPS position
      if (!('geolocation' in navigator)) {
        alert('Din enhet stöder inte platsåtkomst');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.flyTo([position.coords.latitude, position.coords.longitude], 16, { duration: 0.5 });
        },
        () => {
          alert('Kunde inte hämta din position');
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
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
    <div className="w-full relative z-10" style={{ height: 'calc(100vh - 200px)' }}>
      <MapContainer center={mapCenter || center} zoom={mapCenter ? 14 : (markersData.length > 0 ? 7 : 6)} style={{ height: '100%', width: '100%' }} key={mapCenter ? `${mapCenter.lat}-${mapCenter.lng}` : 'default'}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={createUserIcon()}
            zIndexOffset={1000}
          >
            <Tooltip permanent={false} direction="top" offset={[0, -8]}>Din plats</Tooltip>
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
      </MapContainer>
    </div>
  );
}

function MapPicker({ onSelect, onClose, initialPosition, userLocation }) {
  const [position, setPosition] = useState(initialPosition || [59.33, 18.06]);

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      },
    });
    return position ? <Marker position={position} /> : null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/10 max-w-4xl w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Markera plats på kartan</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>
        <div className="h-[60vh] rounded-xl overflow-hidden border border-white/10 mb-4 relative">
          <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {userLocation && (
              <Marker 
                position={[userLocation.lat, userLocation.lng]} 
                icon={createUserIcon()}
                zIndexOffset={1000}
              >
                <Tooltip permanent={false} direction="top" offset={[0, -8]}>Din plats</Tooltip>
              </Marker>
            )}
            <LocationMarker />
          </MapContainer>
          
        </div>
        <p className="text-sm text-gray-400 mb-4">Klicka på kartan för att placera markören</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all">Avbryt</button>
          <button onClick={() => onSelect(position[0], position[1])} className="flex-1 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all">Använd denna plats</button>
        </div>
      </div>
    </div>
  );
}

// Share Modal - for inviting users to view/edit objects
function ShareModal({ object, onClose, currentUserEmail }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [includeChildren, setIncludeChildren] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const existingShares = object.shares || {};
  const sharesList = Object.entries(existingShares).map(([email, data]) => ({ email, ...data }));

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleInvite = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Ange en e-postadress');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Ogiltig e-postadress');
      return;
    }
    if (trimmedEmail === currentUserEmail) {
      setError('Du kan inte dela med dig själv');
      return;
    }
    if (existingShares[trimmedEmail]) {
      setError('Denna användare har redan tillgång');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${trimmedEmail}`]: {
          role,
          status: 'pending',
          includeChildren,
          invitedAt: Timestamp.now(),
          respondedAt: null
        },
        sharedWithEmails: arrayUnion(trimmedEmail)
      });
      setEmail('');
    } catch (err) {
      console.error('Error sharing:', err);
      setError('Kunde inte dela objektet');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveShare = async (emailToRemove) => {
    if (!confirm(`Ta bort delning för ${emailToRemove}?`)) return;
    
    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailToRemove}`]: deleteField(),
        sharedWithEmails: arrayRemove(emailToRemove)
      });
    } catch (err) {
      console.error('Error removing share:', err);
      alert('Kunde inte ta bort delningen');
    }
  };

  const handleUpdateRole = async (emailToUpdate, newRole) => {
    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailToUpdate}.role`]: newRole
      });
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const titleBlock = object.blocks?.find(b => b.type === 'title');

  return (
    <div 
      className="fixed inset-0 z-[1500] overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 30% 20%, rgba(59,130,246,0.35), transparent 40%),
          radial-gradient(circle at 70% 60%, rgba(139,92,246,0.25), transparent 45%),
          radial-gradient(circle at 50% 90%, rgba(56,189,248,0.2), transparent 50%),
          linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.85))
        `,
        backdropFilter: 'blur(16px)'
      }}
      onClick={onClose}
    >
      <div className="min-h-screen p-4 flex items-start justify-center pt-10 sm:pt-20">
        <div 
          className="rounded-3xl border max-w-md w-full p-6 max-h-[90vh] overflow-y-auto relative"
          style={{
            background: `
              radial-gradient(circle at 20% 10%, rgba(59,130,246,0.12), transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(139,92,246,0.08), transparent 50%),
              linear-gradient(135deg, rgba(15,23,42,0.98), rgba(6,7,12,0.98))
            `,
            backdropFilter: 'blur(32px)',
            borderColor: 'rgba(139,92,246,0.3)',
            boxShadow: `
              0 0 0 1px rgba(59,130,246,0.1) inset,
              0 32px 96px -16px rgba(0,0,0,0.9),
              0 0 80px -20px rgba(59,130,246,0.3),
              0 0 40px -10px rgba(139,92,246,0.2)
            `
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Share2 size={20} className="text-blue-400" />
                Dela objekt
              </h2>
              <p className="text-sm text-gray-400 mt-1">{titleBlock?.data?.text || 'Namnlöst objekt'}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
          </div>

          {/* Invite new user */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bjud in med e-post</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="exempel@email.com"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  />
                  {email && (
                    <button
                      onClick={() => setEmail('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-gray-300 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleInvite}
                  disabled={saving || !email.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Bjud in användare"
                >
                  {saving ? <Loader size={16} className="animate-spin" /> : <UserPlus size={16} />}
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">Roll</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-white/10 text-white text-base focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                >
                  <option value="viewer" className="bg-gray-800 text-white">Läsare (kan bara se)</option>
                  <option value="editor" className="bg-gray-800 text-white">Redigerare (kan ändra)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={includeChildren}
                onChange={(e) => setIncludeChildren(e.target.checked)}
                className="w-4 h-4 rounded border-blue-500 text-blue-500 focus:ring-blue-500"
              />
              <div>
                <span className="text-gray-200 text-sm">Inkludera barn-objekt</span>
                <p className="text-xs text-gray-500">Dela också alla objekt under detta</p>
              </div>
            </label>
          </div>

          {/* Current shares */}
          {sharesList.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Users size={16} />
                Delad med ({sharesList.length})
              </h3>
              <div className="space-y-2">
                {sharesList.map(share => (
                  <div key={share.email} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{share.email}</p>
                      <p className="text-xs text-gray-500">
                        {share.status === 'pending' ? '⏳ Väntar på svar' : share.status === 'accepted' ? '✓ Accepterad' : '✗ Nekad'}
                        {share.includeChildren && ' • Inkl. barn'}
                      </p>
                    </div>
                    <select
                      value={share.role}
                      onChange={(e) => handleUpdateRole(share.email, e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-gray-800 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '24px' }}
                    >
                      <option value="viewer" className="bg-gray-800 text-white">Läsare</option>
                      <option value="editor" className="bg-gray-800 text-white">Redigerare</option>
                    </select>
                    <button
                      onClick={() => handleRemoveShare(share.email)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                      title="Ta bort delning"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
            >
              Stäng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateObjectModal({ onClose, onSave, editObject, saving, availableParents, defaultParentId, userLocation, categories }) {
  const isEdit = !!editObject;
  // Default type: use parent's type if defaultParentId is provided, or first category
  const defaultTypeFromParent = defaultParentId ? (availableParents.find(p => p.id === defaultParentId)?.type || (categories[0]?.id || 'property')) : (categories[0]?.id || 'property');
  const [selectedType, setSelectedType] = useState(editObject?.type || defaultTypeFromParent);
  const [parentId, setParentId] = useState(editObject?.parentId || defaultParentId || '');
  const [inheritLocation, setInheritLocation] = useState(false);
  const [title, setTitle] = useState(editObject?.blocks?.find(b => b.type === 'title')?.data?.text || '');
  const [address, setAddress] = useState(editObject?.blocks?.find(b => b.type === 'location')?.data?.address || '');
  const [lat, setLat] = useState(editObject?.blocks?.find(b => b.type === 'location')?.data?.lat || null);
  const [lng, setLng] = useState(editObject?.blocks?.find(b => b.type === 'location')?.data?.lng || null);
  const [capturingGPS, setCapturingGPS] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState(editObject?.blocks?.find(b => b.type === 'image')?.data?.url || '');
  const [imageCropMode, setImageCropMode] = useState(editObject?.blocks?.find(b => b.type === 'image')?.data?.cropMode || 'auto');
  const [uploadingImage, setUploadingImage] = useState(false);
  // Store custom blocks (text, checklist, todo) as array to support multiple
  const [customBlocks, setCustomBlocks] = useState(() => {
    if (!editObject) return [];
    return editObject.blocks
      .filter(b => ['text', 'checklist', 'todo'].includes(b.type))
      .map(b => ({
        id: Math.random().toString(36).substr(2, 9),
        type: b.type,
        title: b.data.title || '', // Custom title for the block
        content: b.type === 'text' ? b.data.content : b.data.items.map(i => i.text).join('\n')
      }));
  });
  const [draggingBlockId, setDraggingBlockId] = useState(null);
  const [dragOverBlockId, setDragOverBlockId] = useState(null);
  const fileInputRef = useRef(null);

  const selectedParent = availableParents.find(p => p.id === parentId);
  const parentHasLocation = selectedParent?.blocks?.some(b => b.type === 'location');

  const handleGPSCapture = () => {
    if (!navigator.geolocation) {
      alert('GPS stöds inte av din enhet');
      return;
    }
    setCapturingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        // Only set address if user hasn't entered one
        if (!address.trim()) {
          setAddress(`GPS: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
        }
        setCapturingGPS(false);
      },
      (error) => {
        alert('Kunde inte hämta position: ' + error.message);
        setCapturingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapSelect = (latitude, longitude) => {
    setLat(latitude);
    setLng(longitude);
    // Only set address if user hasn't entered one
    if (!address.trim()) {
      setAddress(`Karta: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    }
    setShowMapPicker(false);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('Titel måste fyllas i!');
      return;
    }

    const blocks = [{ type: 'title', data: { text: title.trim() } }];
    if (!inheritLocation) {
      // Add location block if we have coords OR just address (for area objects)
      if ((lat !== null && lat !== undefined && lng !== null && lng !== undefined) || address.trim()) {
        const locationData = { 
          lat: (lat !== null && lat !== undefined) ? Number(lat) : null,
          lng: (lng !== null && lng !== undefined) ? Number(lng) : null,
          address: address.trim() || ((lat !== null && lat !== undefined && lng !== null && lng !== undefined) ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '')
        };
        blocks.push({ type: 'location', data: locationData });
      }
    }
    if (imageUrl.trim()) blocks.push({ type: 'image', data: { url: imageUrl.trim(), cropMode: imageCropMode } });
    
    // Add custom blocks (text, checklist, todo) from array
    customBlocks.forEach(block => {
      if (block.content.trim()) {
        if (block.type === 'text') {
          blocks.push({ type: 'text', data: { title: (block.title || 'Anteckning').trim(), content: block.content.trim() } });
        } else if (block.type === 'checklist') {
          const items = block.content.split('\n').filter(l => l.trim()).map(text => ({ text: text.trim(), checked: false }));
          if (items.length > 0) blocks.push({ type: 'checklist', data: { title: (block.title || 'Checklista').trim(), items } });
        } else if (block.type === 'todo') {
          const items = block.content.split('\n').filter(l => l.trim()).map(text => ({ text: text.trim(), done: false }));
          if (items.length > 0) blocks.push({ type: 'todo', data: { title: (block.title || 'Att göra').trim(), items } });
        }
      }
    });

    const objectData = { 
      type: selectedType, 
      layerId: 'default', 
      blocks,
      parentId: parentId || null
    };

    console.log('Submitting object data:', objectData); // Debug log
    onSave(objectData, isEdit ? editObject.id : null);
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // Extract EXIF GPS data if available (non-blocking)
      try {
        const gpsData = await extractGPSFromImage(file);
        if (gpsData && (lat === null || lat === undefined) && (lng === null || lng === undefined)) {
          setLat(gpsData.lat);
          setLng(gpsData.lng);
          if (!address.trim()) {
            setAddress(`Bild GPS: ${gpsData.lat.toFixed(5)}, ${gpsData.lng.toFixed(5)}`);
          }
        }
      } catch (gpsErr) {
        console.warn('GPS extraction failed:', gpsErr);
        // Continue with upload even if GPS fails
      }

      // Resize image before upload (with fallback to original)
      let fileToUpload = file;
      try {
        const resizedBlob = await resizeImage(file, 2000, 0.85);
        if (resizedBlob) fileToUpload = resizedBlob;
      } catch (resizeErr) {
        console.warn('Image resize failed, uploading original:', resizeErr);
        // Continue with original file
      }
      
      const formData = new FormData();
      formData.append('file', fileToUpload, file.name);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setImageUrl(data.secure_url);
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      alert('Kunde inte ladda upp bild. Försök igen!');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 flex items-start justify-center py-10">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/10 max-w-2xl w-full p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">{isEdit ? 'Redigera objekt' : 'Skapa nytt objekt'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={saving}><X size={24} /></button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Välj typ</label>
              {selectedType && !categories.find(c => c.id === selectedType) && (
                <div className="mb-3 text-sm text-yellow-400 bg-yellow-400/10 px-3 py-2 rounded border border-yellow-400/20">
                  ⚠️ Nuvarande kategori "{selectedType}" finns inte längre. Välj en ny kategori nedan.
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {categories.map(cat => {
                  const Icon = getIconComponent(cat.icon);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedType(cat.id)}
                      disabled={saving}
                      className={`p-4 rounded-xl border-2 transition-all ${selectedType === cat.id ? 'border-blue-500 bg-blue-500/20' : 'border-white/10 bg-white/5 hover:border-white/20'} ${saving ? 'opacity-50' : ''}`}
                    >
                      <Icon size={24} className="mx-auto mb-2 text-blue-400" />
                      <div className="text-xs text-gray-300">{cat.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Lägg under objekt (valfritt)</label>
              <select 
                value={parentId} 
                onChange={(e) => setParentId(e.target.value)} 
                disabled={saving}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                style={{ colorScheme: 'dark' }}
              >
                <option value="" className="bg-gray-800 text-white">- Inget parent-objekt -</option>
                {(() => {
                  // Group objects by category
                  const grouped = availableParents.reduce((acc, obj) => {
                    const categoryId = obj.type;
                    if (!acc[categoryId]) acc[categoryId] = [];
                    acc[categoryId].push(obj);
                    return acc;
                  }, {});

                  // Sort objects within each group: top-level first, then by title
                  Object.keys(grouped).forEach(catId => {
                    grouped[catId].sort((a, b) => {
                      const aIsTopLevel = !a.parentId;
                      const bIsTopLevel = !b.parentId;
                      
                      // Top-level objects come first
                      if (aIsTopLevel && !bIsTopLevel) return -1;
                      if (!aIsTopLevel && bIsTopLevel) return 1;
                      
                      // Within same level, sort alphabetically
                      const titleA = a.blocks.find(b => b.type === 'title')?.data?.text || 'Namnlöst';
                      const titleB = b.blocks.find(b => b.type === 'title')?.data?.text || 'Namnlöst';
                      return titleA.localeCompare(titleB, 'sv');
                    });
                  });

                  // Render optgroups for each category
                  return categories.map(category => {
                    const objectsInCategory = grouped[category.id] || [];
                    if (objectsInCategory.length === 0) return null;

                    return (
                      <optgroup key={category.id} label={category.label} className="bg-gray-800 text-gray-300">
                        {objectsInCategory.map(obj => {
                          const titleBlock = obj.blocks.find(b => b.type === 'title');
                          const title = titleBlock?.data?.text || 'Namnlöst';
                          const isChild = !!obj.parentId;
                          
                          // If child, find parent name
                          let displayText = title;
                          if (isChild) {
                            const parent = availableParents.find(p => p.id === obj.parentId);
                            const parentTitle = parent?.blocks.find(b => b.type === 'title')?.data?.text || 'Okänd';
                            displayText = `└─ ${title} (under ${parentTitle})`;
                          }
                          
                          return (
                            <option key={obj.id} value={obj.id} className="bg-gray-800 text-white">
                              {displayText}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  });
                })()}
              </select>
              <p className="text-xs text-gray-500 mt-1">T.ex. lägg "Huset" under "Sommarstugan"</p>
            </div>
            {parentId && parentHasLocation && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <input 
                  type="checkbox" 
                  id="inheritLocation" 
                  checked={inheritLocation} 
                  onChange={(e) => {
                    setInheritLocation(e.target.checked);
                    if (e.target.checked) setAddress('');
                  }}
                  disabled={saving}
                  className="w-4 h-4 rounded border-blue-500 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="inheritLocation" className="text-sm text-gray-200 cursor-pointer">
                  Använd samma plats som {selectedParent?.blocks?.find(b => b.type === 'title')?.data?.text || 'parent-objektet'}
                </label>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Titel *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="T.ex. Sommarstugan i Dalarna" disabled={saving} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50" />
            </div>
            {!inheritLocation && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Plats</label>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Skriv plats/beskrivning (t.ex. Kantarellstället vid stigen)" 
                    disabled={saving} 
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50" 
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleGPSCapture}
                      disabled={saving || capturingGPS}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <Navigation size={18} className={capturingGPS ? 'animate-pulse' : ''} />
                      <span className="text-sm font-medium">{capturingGPS ? 'Hämtar...' : 'Använd min plats'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(true)}
                      disabled={saving}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <MapIcon size={18} />
                      <span className="text-sm font-medium">Markera på karta</span>
                    </button>
                  </div>
                  {lat && lng && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 p-2 rounded-lg">
                      <span className="flex-1">📍 Koordinater: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLat(null);
                          setLng(null);
                        }}
                        disabled={saving}
                        className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all disabled:opacity-50 flex items-center gap-1"
                        title="Rensa koordinater"
                      >
                        <X size={14} />
                        <span className="text-xs">Rensa</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bild</label>
              <div className="space-y-3">
                {imageUrl && (
                  <>
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10 bg-gray-900">
                      <img 
                        src={getTransformedImageUrl(imageUrl, imageCropMode, 800, 600)} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          setImageCropMode('auto');
                        }}
                        disabled={uploadingImage || saving}
                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-lg transition-all disabled:opacity-50"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">Smart beskärning</label>
                      <select
                        value={imageCropMode}
                        onChange={(e) => setImageCropMode(e.target.value)}
                        disabled={uploadingImage || saving}
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="auto">Auto (AI väljer bästa fokus)</option>
                        <option value="face">Ansikten (fokusera på personer)</option>
                        <option value="center">Centrum (traditionell)</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <label className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2">
                    <Upload size={18} />
                    <span className="text-sm font-medium">{uploadingImage ? 'Laddar...' : 'Ladda upp'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFile}
                      disabled={uploadingImage || saving}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Eller klistra in bild-URL:');
                      if (url?.trim()) setImageUrl(url.trim());
                    }}
                    disabled={uploadingImage || saving}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                  >
                    URL
                  </button>
                </div>
              </div>
            </div>
            
            {/* Dynamic custom blocks */}
            <div className="space-y-4">
              {customBlocks.map((block) => {
                const isDragging = draggingBlockId === block.id;
                const isDragOver = dragOverBlockId === block.id && draggingBlockId !== block.id;

                const handleDrop = (targetId) => {
                  if (!draggingBlockId || draggingBlockId === targetId) return;
                  setCustomBlocks(prev => {
                    const items = [...prev];
                    const from = items.findIndex(b => b.id === draggingBlockId);
                    const to = items.findIndex(b => b.id === targetId);
                    if (from === -1 || to === -1) return prev;
                    const [moved] = items.splice(from, 1);
                    items.splice(to, 0, moved);
                    return items;
                  });
                };

                const handleMove = (delta) => {
                  setCustomBlocks(prev => {
                    const items = [...prev];
                    const from = items.findIndex(b => b.id === block.id);
                    const to = from + delta;
                    if (from === -1 || to < 0 || to >= items.length) return prev;
                    const [moved] = items.splice(from, 1);
                    items.splice(to, 0, moved);
                    return items;
                  });
                };

                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setDraggingBlockId(block.id)}
                    onDragEnd={() => { setDraggingBlockId(null); setDragOverBlockId(null); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverBlockId(block.id); }}
                    onDragLeave={() => setDragOverBlockId(null)}
                    onDrop={(e) => { e.preventDefault(); setDragOverBlockId(null); handleDrop(block.id); }}
                    className={`rounded-xl border border-white/10 p-3 bg-white/5 transition-all ${isDragging ? 'opacity-70 border-blue-400' : ''} ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-0 ring-offset-transparent' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          {block.type === 'text' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          )}
                          {block.type === 'text' && 'Anteckning'}
                          {block.type === 'checklist' && <Check size={14} className="text-blue-400" />}
                          {block.type === 'checklist' && 'Checklista'}
                          {block.type === 'todo' && <Circle size={14} className="text-green-400" />}
                          {block.type === 'todo' && 'Att göra'}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMove(-1)}
                            disabled={saving}
                            className="w-7 h-7 rounded-md bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center"
                            title="Flytta upp"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(1)}
                            disabled={saving}
                            className="w-7 h-7 rounded-md bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center"
                            title="Flytta ner"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomBlocks(customBlocks.filter(b => b.id !== block.id))}
                          disabled={saving}
                          className="w-7 h-7 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center"
                          title="Ta bort"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={block.title}
                      onChange={(e) => setCustomBlocks(customBlocks.map(b => b.id === block.id ? { ...b, title: e.target.value } : b))}
                      placeholder={block.type === 'text' ? 'T.ex. Mat plan' : block.type === 'checklist' ? 'T.ex. Före semester' : 'T.ex. Packlista'}
                      disabled={saving}
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors mb-2 disabled:opacity-50 text-sm"
                    />
                    <textarea 
                      value={block.content} 
                      onChange={(e) => setCustomBlocks(customBlocks.map(b => b.id === block.id ? { ...b, content: e.target.value } : b))}
                      placeholder={block.type === 'text' ? 'Skriv anteckning...' : 'En per rad'}
                      rows={3} 
                      disabled={saving}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none disabled:opacity-50 font-mono text-sm"
                    />
                  </div>
                );
              })}
            </div>

            {/* Add block buttons */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Lägg till block</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCustomBlocks([...customBlocks, { id: Math.random().toString(36).substr(2, 9), type: 'text', title: '', content: '' }])}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-blue-500/30 hover:text-white text-sm transition-all disabled:opacity-50"
                >
                  <Plus size={16} />
                  <span>Anteckning</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomBlocks([...customBlocks, { id: Math.random().toString(36).substr(2, 9), type: 'checklist', title: '', content: '' }])}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-blue-500/30 hover:text-white text-sm transition-all disabled:opacity-50"
                >
                  <Plus size={16} />
                  <span>Checklista</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomBlocks([...customBlocks, { id: Math.random().toString(36).substr(2, 9), type: 'todo', title: '', content: '' }])}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-blue-500/30 hover:text-white text-sm transition-all disabled:opacity-50"
                >
                  <Plus size={16} />
                  <span>Att göra</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-6 border-t border-white/10">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50">Avbryt</button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader size={18} className="animate-spin" /><span>Sparar...</span></> : <span>{isEdit ? 'Uppdatera' : 'Skapa objekt'}</span>}
            </button>
          </div>
        </div>
      </div>
      {showMapPicker && (
        <MapPicker
          onSelect={handleMapSelect}
          onClose={() => setShowMapPicker(false)}
          initialPosition={lat && lng ? [lat, lng] : null}
          userLocation={userLocation}
        />
      )}
    </div>
  );
}

// Public Object View Component (för delad vy utan inloggning)
function PublicObjectView({ object, onBackToApp }) {
  const [checkedItems, setCheckedItems] = useState({});
  const [expandedChildren, setExpandedChildren] = useState(new Set());

  const handleCheck = (blockId, item) => {
    const key = `${blockId}-${item}`;
    setCheckedItems(prev => ({...prev, [key]: !prev[key]}));
  };

  const getBlockIcon = (type) => {
    const icons = {
      text: '📝',
      checklist: '☑️',
      todo: '✓',
      image: '🖼️',
      location: '📍'
    };
    return icons[type] || '•';
  };

  const renderBlock = (block) => {
    if (!block) return null;

    switch (block.type) {
      case 'text':
        // Skip empty text blocks
        if (!block.title && !block.content) return null;
        return (
          <div key={block.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            {block.title && <h3 className="text-base font-semibold text-white mb-2">{block.title}</h3>}
            {block.content && (
              <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {block.content}
              </div>
            )}
          </div>
        );
      
      case 'checklist':
      case 'todo':
        const items = block.content ? block.content.split('\n').filter(line => line.trim()) : [];
        // Skip empty checklists/todos
        if (items.length === 0 && !block.title) return null;
        return (
          <div key={block.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            {block.title && <h3 className="text-base font-semibold text-white mb-3">{block.title}</h3>}
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 group">
                    <button
                      onClick={() => handleCheck(block.id, item)}
                      className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 border-gray-500 hover:border-blue-400 transition-colors flex items-center justify-center"
                    >
                      {checkedItems[`${block.id}-${item}`] && <Check size={14} className="text-blue-400" />}
                    </button>
                    <span className={`text-sm leading-snug ${checkedItems[`${block.id}-${item}`] ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              block.title && <p className="text-gray-500 text-sm italic">Inga items ännu</p>
            )}
          </div>
        );
      
      case 'image':
        return block.data?.url ? (
          <div key={block.id} className="bg-white/5 rounded-xl p-2 border border-white/10">
            <img 
              src={block.data.url} 
              alt={block.title || 'Bild'}
              className="w-full h-auto rounded-lg"
            />
          </div>
        ) : null;
      
      case 'location':
        return block.data?.lat && block.data?.lng ? (
          <div key={block.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {block.data.address && (
                  <p className="text-white font-medium mb-1 break-words">{block.data.address}</p>
                )}
                <p className="text-gray-400 text-sm">
                  {block.data.lat.toFixed(5)}, {block.data.lng.toFixed(5)}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${block.data.lat},${block.data.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                >
                  Öppna i Google Maps →
                </a>
              </div>
            </div>
          </div>
        ) : null;
      
      default:
        return null;
    }
  };

  const getTitleBlock = (obj) => obj.blocks?.find(b => b.type === 'title');
  const getImageBlock = (obj) => obj.blocks?.find(b => b.type === 'image');
  const getOtherBlocks = (obj) => obj.blocks?.filter(b => !['title', 'image'].includes(b.type)) || [];

  const titleBlock = getTitleBlock(object);
  const imageBlock = getImageBlock(object);
  const otherBlocks = getOtherBlocks(object);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
      style={{
         backgroundImage: `radial-gradient(circle at 15% 12%, rgba(59,130,246,0.20), transparent 35%),
                           radial-gradient(circle at 85% 8%, rgba(56,189,248,0.16), transparent 32%),
                           radial-gradient(circle at 50% 88%, rgba(59,130,246,0.14), transparent 36%),
                           linear-gradient(to bottom right, #06070c, #0b1220, #06070c)`
      }}
    >
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">OurSpots</h1>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm transition-all"
              >
                Till appen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Title */}
        {titleBlock?.content && (
          <h2 className="text-3xl font-bold text-white mb-6">{titleBlock.content}</h2>
        )}

        {/* Image */}
        {imageBlock?.data?.url && (
          <div className="mb-6">
            <img 
              src={imageBlock.data.url} 
              alt={titleBlock?.content || 'Bild'}
              className="w-full max-w-sm h-48 object-cover rounded-xl shadow-lg"
            />
          </div>
        )}

        {/* Category badge */}
        {object.categoryName && (
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
            <span className="text-gray-300 text-sm">{object.categoryName}</span>
          </div>
        )}

        {/* Other blocks */}
        <div className="space-y-4 mb-8">
          {otherBlocks.map(block => renderBlock(block))}
        </div>

        {/* Children */}
        {object.children && object.children.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Relaterade objekt</h3>
            {object.children.map(child => {
              const childTitle = getTitleBlock(child);
              const childImage = getImageBlock(child);
              const isExpanded = expandedChildren.has(child.id);
              
              return (
                <div key={child.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedChildren);
                      if (isExpanded) {
                        newExpanded.delete(child.id);
                      } else {
                        newExpanded.add(child.id);
                      }
                      setExpandedChildren(newExpanded);
                    }}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {childImage?.data?.url && (
                        <img src={childImage.data.url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      )}
                      <span className="text-white font-medium">{childTitle?.content || 'Utan titel'}</span>
                    </div>
                    <ChevronDown 
                      size={20} 
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 pt-0 space-y-3">
                      {getOtherBlocks(child).map(block => renderBlock(block))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Login prompt */}
        <div className="mt-12 p-6 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <p className="text-gray-300 text-sm mb-4">
            Logga in på OurSpots för att skapa och dela dina egna platser, listor och anteckningar.
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-6 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all"
            >
              Gå till OurSpots
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showSharedWithMe, setShowSharedWithMe] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(null); // null or object to share
  const [editingObject, setEditingObject] = useState(null);
  const [showAllObjects, setShowAllObjects] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [userLocation, setUserLocation] = useState(null);
  const [sortByDistance, setSortByDistance] = useState(() => {
    const saved = localStorage.getItem('sortByDistance');
    return saved === 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCategoryAdmin, setShowCategoryAdmin] = useState(false);
  const [showObjectsAdmin, setShowObjectsAdmin] = useState(false);
  const [captures, setCaptures] = useState(() => {
    try {
      const saved = localStorage.getItem('ourspots_captures');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showCaptures, setShowCaptures] = useState(false);
  const [keepScreenOn, setKeepScreenOn] = useState(() => {
    const saved = localStorage.getItem('keepScreenOn');
    return saved === 'true';
  });
  const [showQuickCapture, setShowQuickCapture] = useState(() => {
    const saved = localStorage.getItem('showQuickCapture');
    return saved === 'true'; // Default false
  });
  const [quickCaptureObjectId, setQuickCaptureObjectId] = useState(() => {
    return localStorage.getItem('quickCaptureObjectId') || '';
  });
  const [mapCenter, setMapCenter] = useState(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const seedingRef = useRef(false);
  const wakeLockRef = useRef(null);
  const [shareToken, setShareToken] = useState(() => {
    // Check immediately on mount if we're on a share route
    const hash = window.location.hash;
    if (hash.startsWith('#/share/')) {
      const token = hash.split('/share/')[1];
      return token || null;
    }
    return null;
  });
  const [sharedObject, setSharedObject] = useState(null);
  const [loadingShare, setLoadingShare] = useState(() => {
    // Start loading if we detected a share token
    return window.location.hash.startsWith('#/share/');
  });

  // Distance helper (Haversine formula)
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + 
              Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*
              Math.sin(dLng/2)*Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getObjectDistance = (obj) => {
    if (!userLocation) return undefined;
    const locBlock = obj.blocks?.find(b => b.type === 'location');
    if (locBlock?.data?.lat && locBlock?.data?.lng) {
      return getDistance(userLocation.lat, userLocation.lng, locBlock.data.lat, locBlock.data.lng);
    }
    return undefined;
  };

  // Save sortByDistance preference
  useEffect(() => {
    localStorage.setItem('sortByDistance', sortByDistance.toString());
  }, [sortByDistance]);

  // Detect and handle share routes (#/share/:token)
  useEffect(() => {
    const checkShareRoute = async () => {
      const hash = window.location.hash;
      console.log('Checking share route, hash:', hash);
      
      if (hash.startsWith('#/share/')) {
        const token = hash.split('/share/')[1];
        console.log('Share token detected:', token);
        
        if (token) {
          setShareToken(token);
          setLoadingShare(true);
          
          try {
            // Query for object with this public share token
            const objectsRef = collection(db, 'objects');
            const q = query(
              objectsRef,
              where('publicShareToken', '==', token),
              where('isPublicShared', '==', true)
            );
            console.log('Querying Firestore for token:', token);
            const snapshot = await getDocs(q);
            console.log('Firestore query result, empty?:', snapshot.empty);
            
            if (!snapshot.empty) {
              const objectData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
              console.log('Found shared object:', objectData.id);
              setSharedObject(objectData);
            } else {
              console.log('No shared object found with this token');
              setSharedObject(null);
            }
          } catch (err) {
            console.error('Error loading shared object:', err);
            setSharedObject(null);
          } finally {
            setLoadingShare(false);
          }
        }
      } else {
        console.log('Not a share route');
      }
    };

    checkShareRoute();
    
    // Listen for hash changes
    const handleHashChange = () => {
      console.log('Hash changed to:', window.location.hash);
      checkShareRoute();
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Wake Lock för att hålla skärmen påslagen
  useEffect(() => {
    localStorage.setItem('keepScreenOn', keepScreenOn.toString());

    let isActive = true; // Track if effect is still active

    const requestWakeLock = async () => {
      if (!keepScreenOn || !isActive) {
        // Release wake lock if turned off
        if (wakeLockRef.current) {
          try {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
            console.log('Wake Lock released (turned off)');
          } catch (err) {
            console.error('Error releasing wake lock:', err);
          }
        }
        return;
      }

      // Request wake lock if supported
      if ('wakeLock' in navigator) {
        try {
          // Release old lock if exists
          if (wakeLockRef.current) {
            await wakeLockRef.current.release();
          }
          
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Wake Lock aktiverad:', new Date().toLocaleTimeString());

          // Re-acquire wake lock when it's released
          wakeLockRef.current.addEventListener('release', () => {
            console.log('Wake Lock released:', new Date().toLocaleTimeString());
            // Automatically re-request if still active
            if (keepScreenOn && isActive) {
              console.log('Försöker återaktivera Wake Lock...');
              setTimeout(() => requestWakeLock(), 100);
            }
          });
        } catch (err) {
          console.error('Wake Lock fel:', err);
          // Retry after a delay if error
          if (keepScreenOn && isActive) {
            setTimeout(() => requestWakeLock(), 1000);
          }
        }
      }
    };

    requestWakeLock();

    // Re-acquire wake lock on page visibility change
    const handleVisibilityChange = () => {
      console.log('Visibility changed:', document.visibilityState);
      if (keepScreenOn && document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error);
        wakeLockRef.current = null;
      }
    };
  }, [keepScreenOn]);

  useEffect(() => {
    localStorage.setItem('showQuickCapture', showQuickCapture.toString());
  }, [showQuickCapture]);

  useEffect(() => {
    if (quickCaptureObjectId) {
      localStorage.setItem('quickCaptureObjectId', quickCaptureObjectId);
    } else {
      localStorage.removeItem('quickCaptureObjectId');
    }
  }, [quickCaptureObjectId]);

  // Auth listener + check admin status
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check if user is admin
        try {
          console.log('Fetching user doc for:', u.uid);
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          console.log('User doc exists:', userDoc.exists());
          if (userDoc.exists()) {
            console.log('User doc data:', userDoc.data());
            const adminFlag = userDoc.data()?.isAdmin === true;
            const userFavorites = userDoc.data()?.favorites || [];
            console.log('isAdmin flag:', adminFlag);
            setIsAdmin(adminFlag);
            setFavorites(userFavorites);
          } else {
            console.log('User doc does not exist - creating one');
            // Create user doc if it doesn't exist
            await setDoc(doc(db, 'users', u.uid), {
              email: u.email,
              isAdmin: false,
              favorites: [],
              createdAt: Timestamp.now()
            });
            setIsAdmin(false);
            setFavorites([]);
          }
        } catch (err) {
          console.error('Error fetching user doc:', err);
          setIsAdmin(false);
          setFavorites([]);
        }
      } else {
        setIsAdmin(false);
        setFavorites([]);
      }
    });
    return () => unsubAuth();
  }, []);

  useLayoutEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.getBoundingClientRect().height);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  // Capture user's location on mount and watch for updates
  useEffect(() => {
    if ('geolocation' in navigator) {
      // Try high accuracy GPS first, fallback to low accuracy if it fails
      const getPositionWithFallback = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          (error) => {
            // High accuracy failed - try low accuracy as fallback (WiFi/cell towers)
            console.log('High accuracy GPS failed, trying fallback...', error.message);
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setUserLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  accuracy: position.coords.accuracy
                });
              },
              () => {
                // Complete failure - continue without location
                console.log('Location unavailable');
              },
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      };

      getPositionWithFallback();

      // Watch position for continuous updates (important for mushroom picking!)
      // Uses high accuracy, but the watch API handles fallback internally
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // State for shared objects (fetched separately)
  const [sharedObjects, setSharedObjects] = useState([]);

  useEffect(() => {
    if (!user) {
      setObjects([]);
      setSharedObjects([]);
      setLoading(false);
      return;
    }

    // Fetch objects where user is owner
    const objectsRef = collection(db, 'objects');
    const ownedQuery = query(objectsRef, where('ownerId', '==', user.uid));
    
    const unsubOwned = onSnapshot(ownedQuery, (snap) => {
      const userObjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setObjects(userObjects);
      setLoading(false);
      
      // Update selectedObject if it exists and has been modified
      setSelectedObject(prev => {
        if (!prev?.id) return prev;
        const updated = userObjects.find(obj => obj.id === prev.id);
        if (updated) return updated;
        // Check shared objects too
        const sharedUpdated = sharedObjects.find(obj => obj.id === prev.id);
        return sharedUpdated || prev;
      });
    });

    // Fetch objects shared with this user (using sharedWithEmails array)
    const sharedQuery = query(objectsRef, where('sharedWithEmails', 'array-contains', user.email));
    
    const unsubShared = onSnapshot(sharedQuery, (snap) => {
      const shared = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(obj => obj.ownerId !== user.uid); // Exclude own objects
      setSharedObjects(shared);
      
      // Update selectedObject if viewing a shared object
      setSelectedObject(prev => {
        if (!prev?.id) return prev;
        const updated = shared.find(obj => obj.id === prev.id);
        return updated || prev;
      });
    });

    return () => {
      unsubOwned();
      unsubShared();
    };
  }, [user]);

  // Listen to categories
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.order - b.order);
      console.log('Categories loaded:', cats.length, 'isAdmin:', isAdmin, 'user:', !!user);
      setCategories(cats);
      setCategoriesLoaded(true);
    });
    return () => unsub();
  }, []);

  // Seed initial categories if needed
  useEffect(() => {
    const seedCategories = async () => {
      if (!isAdmin || !user || seedingRef.current) {
        console.log('Not seeding - isAdmin:', isAdmin, 'user:', !!user, 'already seeding:', seedingRef.current);
        return;
      }

      seedingRef.current = true;
      
      try {
        // Check if categories exist
        const snap = await getDoc(doc(db, 'categories', 'property'));
        if (snap.exists()) {
          console.log('Categories already exist, skipping seed');
          return;
        }

        console.log('Seeding initial categories...');
        const initialCategories = [
          { id: 'property', label: 'Fastigheter', icon: 'Home', color: '#6B7280', order: 1 },
          { id: 'cafe', label: 'Kaféer', icon: 'Coffee', color: '#92400E', order: 2 },
          { id: 'nature', label: 'Natur', icon: 'Mountain', color: '#065F46', order: 3 }
        ];

        for (const cat of initialCategories) {
          await setDoc(doc(db, 'categories', cat.id), {
            label: cat.label,
            icon: cat.icon,
            color: cat.color,
            order: cat.order,
            createdAt: Timestamp.now(),
            createdBy: user.uid
          });
        }
        console.log('Categories seeded successfully');
      } catch (err) {
        console.error('Error seeding categories:', err);
      } finally {
        seedingRef.current = false;
      }
    };

    seedCategories();
  }, [isAdmin, user]);

  useEffect(() => {
    if (!selectedObject) return;
    
    const selectedId = selectedObject.id;
    const fresh = objects.find(o => o.id === selectedId);
    
    // Only update if still the same object is selected
    setSelectedObject(current => {
      if (!current || current.id !== selectedId) return current;
      return fresh || null;
    });
  }, [objects, selectedObject?.id]);

  // Lock background scroll when any modal is open
  useEffect(() => {
    const hasModalOpen = !!selectedObject || !!showCreateModal || !!showMenu;
    const previousOverflow = document.body.style.overflow;
    if (hasModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedObject, showCreateModal, showMenu]);

  const searchTerm = searchQuery.trim().toLowerCase();
  const matchesSearch = (obj) => {
    if (!searchTerm) return true;
    const values = [];
    const titleBlock = obj.blocks?.find(b => b.type === 'title');
    if (titleBlock?.data?.text) values.push(titleBlock.data.text);
    const locationBlock = obj.blocks?.find(b => b.type === 'location');
    if (locationBlock?.data?.address) values.push(locationBlock.data.address);
    obj.blocks?.forEach(block => {
      if (block.type === 'text' && block.data?.text) {
        values.push(block.data.text);
      }
      if ((block.type === 'checklist' || block.type === 'todo') && Array.isArray(block.data?.items)) {
        block.data.items.forEach(item => {
          if (item?.text) values.push(item.text);
        });
      }
    });
    return values.some(v => v.toString().toLowerCase().includes(searchTerm));
  };

  // Combine owned objects with shared objects (accepted only)
  const allAvailableObjects = [
    ...objects,
    ...sharedObjects.filter(obj => obj.shares?.[user?.email]?.status === 'accepted')
  ];

  // Filter by category (combine with favorites if both selected)
  let filteredObjects = showSharedWithMe 
    ? sharedObjects.filter(obj => obj.shares?.[user?.email]?.status === 'accepted')
    : allAvailableObjects;
  
  // Apply category filter
  if (activeCategory !== 'all' && activeCategory !== 'favorites') {
    filteredObjects = filteredObjects.filter(o => o.type === activeCategory);
  }
  
  // Apply favorites filter (can be combined with category)
  if (showFavoritesOnly) {
    filteredObjects = filteredObjects.filter(o => favorites.includes(o.id));
  }
  
  let displayObjects = showAllObjects ? filteredObjects : filteredObjects.filter(o => !o.parentId);
  
  // Apply search filter - include parents if any child matches
  if (searchTerm) {
    displayObjects = displayObjects.filter(obj => {
      // Check if object itself matches
      if (matchesSearch(obj)) return true;
      // Check if any child matches
      const children = allAvailableObjects.filter(o => o.parentId === obj.id);
      return children.some(child => matchesSearch(child));
    });
  }

  if (maxDistanceKm && userLocation) {
    displayObjects = displayObjects.filter(obj => {
      const dist = getObjectDistance(obj);
      return typeof dist === 'number' && dist <= maxDistanceKm;
    });
  }
  
  // Apply distance sorting if enabled
  if (sortByDistance && userLocation) {
    displayObjects = [...displayObjects].sort((a, b) => {
      const distA = getObjectDistance(a);
      const distB = getObjectDistance(b);
      return (distA ?? Infinity) - (distB ?? Infinity);
    });
  }

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      alert('Kunde inte logga in. Försök igen!');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {}
  };

  const handleToggleFavorite = async (objectId) => {
    if (!user) return;
    
    const isFavorite = favorites.includes(objectId);
    const newFavorites = isFavorite 
      ? favorites.filter(id => id !== objectId)
      : [...favorites, objectId];
    
    setFavorites(newFavorites);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        favorites: newFavorites
      });
    } catch (err) {
      console.error('Error updating favorites:', err);
      // Revert on error
      setFavorites(favorites);
    }
  };

  // Quick capture functions
  const handleQuickCapture = async () => {
    if (!userLocation) {
      alert('⚠️ Ingen GPS-position! Vänta tills GPS har hittats.');
      return;
    }

    // If quick capture object is set, add location block directly
    if (quickCaptureObjectId) {
      const targetObject = objects.find(o => o.id === quickCaptureObjectId);
      if (targetObject) {
        try {
          const newBlock = {
            type: 'location',
            data: {
              lat: userLocation.lat,
              lng: userLocation.lng,
              address: ''
            }
          };
          const updatedBlocks = [...(targetObject.blocks || []), newBlock];
          await updateDoc(doc(db, 'objects', quickCaptureObjectId), {
            blocks: updatedBlocks
          });
          const objectName = targetObject.blocks?.find(b => b.type === 'title')?.data?.text || 'objektet';
          alert(`🍄 Position tillagd till "${objectName}"!`);
          return;
        } catch (err) {
          console.error('Error adding location:', err);
          alert('❌ Kunde inte lägga till position');
          return;
        }
      } else {
        alert('⚠️ Valt objekt finns inte längre. Välj ett nytt i inställningar.');
        return;
      }
    }

    // Fallback: Save to captures list
    const capture = {
      id: `capture_${Date.now()}`,
      lat: userLocation.lat,
      lng: userLocation.lng,
      timestamp: Date.now(),
      note: ''
    };

    const newCaptures = [...captures, capture];
    setCaptures(newCaptures);
    localStorage.setItem('ourspots_captures', JSON.stringify(newCaptures));
    
    // Visual feedback
    alert('🍄 Position sparad! (' + newCaptures.length + ' st)');
  };

  const handleDeleteCapture = (captureId) => {
    const newCaptures = captures.filter(c => c.id !== captureId);
    setCaptures(newCaptures);
    localStorage.setItem('ourspots_captures', JSON.stringify(newCaptures));
  };

  const handleCreateFromCapture = (capture) => {
    setShowCaptures(false);
    setEditingObject({
      parentId: null,
      blocks: [
        { type: 'location', data: { lat: capture.lat, lng: capture.lng, address: '' } }
      ]
    });
    setShowCreateModal(true);
  };

  const handleBlockUpdate = async (objectId, blockIndex, newBlockData) => {
    const applyBlockUpdate = (obj) => ({
      ...obj,
      blocks: obj.blocks.map((b, i) => i === blockIndex ? { ...b, data: newBlockData } : b)
    });

    setObjects(prev => prev.map(obj => obj.id === objectId ? applyBlockUpdate(obj) : obj));
    setSelectedObject(prev => (prev && prev.id === objectId) ? applyBlockUpdate(prev) : prev);

    try {
      const obj = objects.find(o => o.id === objectId);
      if (!obj) return;
      const updatedBlocks = obj.blocks.map((b, i) => i === blockIndex ? { ...b, data: newBlockData } : b);
      await updateDoc(doc(db, 'objects', objectId), { blocks: updatedBlocks, updatedAt: Timestamp.now() });
    } catch (err) {
      console.error('Error updating block:', err);
    }
  };

  const handleSaveObject = async (objectData, editId) => {
    if (!user) {
      alert('Du måste vara inloggad!');
      return;
    }
    setSaving(true);
    try {
      const saveOperation = editId 
        ? updateDoc(doc(db, 'objects', editId), { ...objectData, updatedAt: Timestamp.now() })
        : addDoc(collection(db, 'objects'), { 
            ...objectData, 
            ownerId: user.uid, 
            ownerName: user.displayName, 
            ownerEmail: user.email, 
            createdAt: Timestamp.now(), 
            updatedAt: Timestamp.now() 
          });
      
      // Timeout after 10 seconds
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      await Promise.race([saveOperation, timeoutPromise]);
      
      setShowCreateModal(false);
      setEditingObject(null);
      setDefaultParentId(null); // Clear defaultParentId to prevent wrong parent on next create
      // Don't close selectedObject if we just created a child - keep parent view open
      // setSelectedObject(null);
    } catch (err) {
      console.error('Save error:', err);
      alert(err.message === 'Timeout' ? 'Sparningen tog för lång tid. Försök igen.' : 'Kunde inte spara!');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteObject = async (id) => {
    try {
      await deleteDoc(doc(db, 'objects', id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Kunde inte ta bort objektet!');
    }
  };

  const handleUpdateShares = async (updatedObject) => {
    if (!user) {
      alert('Du måste vara inloggad!');
      return;
    }
    
    try {
      const updateData = {
        shares: updatedObject.shares || {},
        isPublicShared: updatedObject.isPublicShared || false,
        updatedAt: Timestamp.now()
      };
      
      // Add publicShareToken if enabling public sharing and token doesn't exist
      if (updatedObject.isPublicShared && updatedObject.publicShareToken) {
        updateData.publicShareToken = updatedObject.publicShareToken;
      }
      
      await updateDoc(doc(db, 'objects', updatedObject.id), updateData);
      
      // Update local state to reflect changes immediately
      setObjects(prev => prev.map(obj => 
        obj.id === updatedObject.id 
          ? { ...obj, ...updateData }
          : obj
      ));
      
      // Update selectedObject if it's the one being shared
      setSelectedObject(prev => 
        prev && prev.id === updatedObject.id 
          ? { ...prev, ...updateData }
          : prev
      );
      
    } catch (err) {
      console.error('Share update error:', err);
      alert('Kunde inte uppdatera delning!');
    }
  };

  const handleEdit = (obj) => {
    if (!user || (obj.id && obj.ownerId !== user.uid)) {
      alert('Du kan bara redigera dina objekt!');
      return;
    }
    if (obj.parentId) {
      setDefaultParentId(obj.parentId);
    }
    setEditingObject(obj.id ? obj : null);
    setShowCreateModal(true);
    setSelectedObject(null);
  };

  // Handle public share view FIRST (before checking loading)
  if (shareToken) {
    if (loadingShare) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
          <div className="text-center">
            <Loader size={48} className="animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Laddar delat objekt...</p>
          </div>
        </div>
      );
    }

    if (!sharedObject) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-4">
              <h2 className="text-xl font-semibold text-white mb-2">Objekt hittades inte</h2>
              <p className="text-gray-300 text-sm">Detta objekt finns inte eller är inte längre publikt delat.</p>
            </div>
            <button
              onClick={() => {
                window.location.hash = '';
                window.location.reload();
              }}
              className="px-6 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all"
            >
              Gå till OurSpots
            </button>
          </div>
        </div>
      );
    }

    return (
      <PublicObjectView 
        object={sharedObject} 
        onBackToApp={() => {
          window.location.hash = '';
          window.location.reload();
        }}
      />
    );
  }

  // Check loading state for normal app (after share view check)
  if (loading || !categoriesLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Laddar dina platser...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
      style={{
         backgroundImage: `radial-gradient(circle at 15% 12%, rgba(59,130,246,0.20), transparent 35%),
                           radial-gradient(circle at 85% 8%, rgba(56,189,248,0.16), transparent 32%),
                           radial-gradient(circle at 50% 88%, rgba(59,130,246,0.14), transparent 36%),
                           linear-gradient(to bottom right, #06070c, #0b1220, #06070c)`
      }}
    >
      <header ref={headerRef} className="bg-gray-900/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMenu(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              title="Meny"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-white">OurSpots</h1>
          </div>
          <div>
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm text-white">{user.displayName}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
                {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 sm:w-10 h-10 rounded-full border border-white/10" />}
                <button onClick={handleLogout} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Logga ut">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-all">
                <LogIn size={18} />
                <span>Logga in</span>
              </button>
            )}
          </div>
        </div>
      </header>
      
      <div className="bg-gray-900/30 backdrop-blur-md border-b border-white/10 sticky z-30" style={{ top: headerHeight }}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto items-center justify-between">
            <div className="flex gap-2 overflow-x-auto">
              {/* Favorites category (only for logged in users) */}
              {user && (
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl whitespace-nowrap transition-all ${showFavoritesOnly ? 'bg-yellow-500 text-white' : 'bg-white/20 text-gray-200 hover:bg-white/30'}`}
                >
                  <Star size={16} className={showFavoritesOnly ? 'fill-white' : ''} />
                  <span className="text-sm font-medium hidden sm:inline">Favoriter</span>
                  {favorites.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                      {favorites.length}
                    </span>
                  )}
                </button>
              )}
              
              {/* Always show "Alla" category */}
              <button
                onClick={() => setActiveCategory('all')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl whitespace-nowrap transition-all ${activeCategory === 'all' ? 'bg-blue-500 text-white' : 'bg-white/20 text-gray-200 hover:bg-white/30'}`}
              >
                <span className="text-sm font-medium">Alla</span>
              </button>
              
              {/* Dynamic categories from Firestore */}
              {categories.map(cat => {
                const IconComponent = getIconComponent(cat.icon);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-blue-500 text-white' : 'bg-white/20 text-gray-200 hover:bg-white/30'}`}
                  >
                    <IconComponent size={16} />
                    <span className="text-sm font-medium hidden sm:inline">{cat.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all text-sm font-medium ${showFilters ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                title={showFilters ? 'Dölj filter' : 'Visa filter'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"></line>
                  <line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line>
                  <line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line>
                  <line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
              </button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 text-white placeholder:text-gray-400 rounded-xl pl-10 pr-3 py-2.5 border border-white/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all"
                  placeholder="Sök på namn eller innehåll"
                />
              </div>
              
              {/* Favorites + Shared + Sort by distance */}
              <div className="flex gap-2 flex-wrap">
                {user && (
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${showFavoritesOnly ? 'bg-yellow-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'}`}
                  >
                    <Star size={16} className={showFavoritesOnly ? 'fill-white' : ''} />
                    <span>Favoriter</span>
                    {favorites.length > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${showFavoritesOnly ? 'bg-white/25' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {favorites.length}
                      </span>
                    )}
                  </button>
                )}
                {user && sharedObjects.filter(o => o.shares?.[user.email]?.status === 'accepted').length > 0 && (
                  <button
                    onClick={() => setShowSharedWithMe(!showSharedWithMe)}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${showSharedWithMe ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'}`}
                  >
                    <Users size={16} />
                    <span>Delade</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${showSharedWithMe ? 'bg-white/25' : 'bg-purple-500/20 text-purple-400'}`}>
                      {sharedObjects.filter(o => o.shares?.[user.email]?.status === 'accepted').length}
                    </span>
                  </button>
                )}
                {userLocation && (
                  <button 
                    onClick={() => setSortByDistance(!sortByDistance)}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${sortByDistance ? 'bg-blue-500/80 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'}`}
                  >
                    <Navigation size={16} />
                    <span>Närmast</span>
                  </button>
                )}
              </div>
              
              {/* Pending share invites */}
              {user && sharedObjects.filter(o => o.shares?.[user.email]?.status === 'pending').length > 0 && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <h4 className="text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
                    <Mail size={14} />
                    Inbjudningar ({sharedObjects.filter(o => o.shares?.[user.email]?.status === 'pending').length})
                  </h4>
                  <div className="space-y-2">
                    {sharedObjects.filter(o => o.shares?.[user.email]?.status === 'pending').map(obj => {
                      const titleBlock = obj.blocks?.find(b => b.type === 'title');
                      const shareInfo = obj.shares[user.email];
                      return (
                        <div key={obj.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{titleBlock?.data?.text || 'Namnlöst'}</p>
                            <p className="text-xs text-gray-500">
                              {shareInfo.role === 'editor' ? 'Redigerare' : 'Läsare'}
                              {shareInfo.includeChildren && ' • Inkl. barn'}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              await updateDoc(doc(db, 'objects', obj.id), {
                                [`shares.${user.email}.status`]: 'accepted',
                                [`shares.${user.email}.respondedAt`]: Timestamp.now()
                              });
                            }}
                            className="px-2 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs hover:bg-green-500/30 transition-colors"
                          >
                            Acceptera
                          </button>
                          <button
                            onClick={async () => {
                              await updateDoc(doc(db, 'objects', obj.id), {
                                [`shares.${user.email}.status`]: 'declined',
                                [`shares.${user.email}.respondedAt`]: Timestamp.now()
                              });
                            }}
                            className="px-2 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs hover:bg-red-500/30 transition-colors"
                          >
                            Neka
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Distance slider */}
              {userLocation && (
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Max avstånd</span>
                    <span className="text-gray-200">
                      {!userLocation ? 'Plats krävs' : maxDistanceKm ? `${maxDistanceKm} km` : 'Alla avstånd'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={maxDistanceKm ?? 25}
                      onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                      disabled={!userLocation}
                      className="flex-1 accent-blue-500 disabled:opacity-40"
                    />
                    <button
                      onClick={() => setMaxDistanceKm(null)}
                      disabled={!maxDistanceKm}
                      className="text-xs px-3 py-1 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10 disabled:opacity-40"
                    >
                      Rensa
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <main className="max-w-6xl mx-auto px-4">
        {viewMode === 'list' ? (
          <div className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayObjects.map(obj => {
                const childCount = allAvailableObjects.filter(o => o.parentId === obj.id).length;
                const distance = getObjectDistance(obj);
                return (
                  <ObjectCard 
                    key={obj.id} 
                    object={obj} 
                    onClick={() => setSelectedObject(obj)} 
                    currentUser={user} 
                    childCount={childCount} 
                    distance={distance} 
                    categories={categories}
                    isFavorite={favorites.includes(obj.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onNavigate={(coords) => {
                      setViewMode('map');
                      setMapCenter(coords);
                      window.scrollTo(0, 0);
                    }}
                    onShare={(obj) => setShowShareModal(obj)}
                  />
                );
              })}
            </div>
            {displayObjects.length === 0 && (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <MapPin size={32} className="text-gray-600" />
                </div>
                <p className="text-gray-400 text-lg font-medium">
                  {showFavoritesOnly ? 'Inga favoriter ännu' : showSharedWithMe ? 'Inga delade objekt' : 'Inga objekt hittades'}
                </p>
                <p className="text-gray-600 text-sm mt-2 max-w-xs mx-auto">
                  {!user ? 'Logga in för att skapa objekt!' : 
                   showFavoritesOnly ? 'Markera objekt med stjärnan för att lägga till favoriter' :
                   showSharedWithMe ? 'Objekt som andra delar med dig visas här' :
                   'Tryck på + knappen för att skapa ditt första objekt'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <MapView objects={filteredObjects} onSelectObject={setSelectedObject} currentUser={user} userLocation={userLocation} categories={categories} mapCenter={mapCenter} />
        )}
      </main>

      {user && (
        <>
          <button 
            onClick={() => { setEditingObject(null); setShowCreateModal(true); }} 
            className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 z-[1200]"
          >
            <Plus size={28} />
          </button>
          {!selectedObject && (
            <button
              onClick={() => {
                const newMode = viewMode === 'list' ? 'map' : 'list';
                setViewMode(newMode);
                if (newMode === 'map') {
                  window.scrollTo(0, 0);
                }
              }}
              className="fixed bottom-24 right-6 w-14 h-14 bg-gray-800 hover:bg-gray-700 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 z-[1200] border border-white/10"
              title={viewMode === 'list' ? 'Visa karta' : 'Visa lista'}
            >
              {viewMode === 'list' ? <MapIcon size={24} /> : <List size={24} />}
            </button>
          )}
          {/* Quick capture mushroom button */}
          {showQuickCapture && (
            <button
              onClick={handleQuickCapture}
              className={`fixed right-6 w-14 h-14 bg-orange-600 hover:bg-orange-500 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 z-[1200] border border-orange-400/30 transition-all duration-300 ${selectedObject ? 'bottom-24' : 'bottom-[10.5rem]'}`}
              title="Snabbpinna GPS-position 🍄"
            >
              <Target size={24} />
              {captures.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {captures.length}
                </span>
              )}
            </button>
          )}
        </>
      )}

      {selectedObject && (
        <ObjectDetail 
          object={selectedObject} 
          onClose={() => setSelectedObject(null)} 
          onEdit={handleEdit} 
          onDelete={handleDeleteObject} 
          onBlockUpdate={handleBlockUpdate} 
          onUpdateShares={handleUpdateShares}
          currentUser={user} 
          allObjects={allAvailableObjects} 
          onNavigate={(obj) => setSelectedObject(obj)} 
          categories={categories} 
          isAdmin={isAdmin}
          onShowOnMap={(coords) => {
            setSelectedObject(null);
            setViewMode('map');
            setMapCenter(coords);
            window.scrollTo(0, 0);
          }}
          onShare={(obj) => setShowShareModal(obj)}
        />
      )}

      {showShareModal && (
        <ShareModal
          object={showShareModal}
          onClose={() => setShowShareModal(null)}
          currentUserEmail={user?.email}
        />
      )}

      {showCreateModal && (
        <CreateObjectModal 
          onClose={() => { setShowCreateModal(false); setEditingObject(null); setDefaultParentId(null); }} 
          onSave={handleSaveObject} 
          editObject={editingObject} 
          saving={saving} 
          availableParents={objects.filter(o => {
            // Filter out the object itself
            if (o.id === editingObject?.id) return false;
            // Filter out children of the object (to prevent circular references)
            if (o.parentId === editingObject?.id) return false;
            return true;
          })} 
          defaultParentId={defaultParentId} 
          userLocation={userLocation} 
          categories={categories} 
        />
      )}

      {showCategoryAdmin && (
        <CategoryAdminModal
          categories={categories}
          onClose={() => setShowCategoryAdmin(false)}
          currentUser={user}
          objects={objects}
        />
      )}

      {showObjectsAdmin && (
        <ObjectsAdminModal
          objects={objects}
          categories={categories}
          onClose={() => setShowObjectsAdmin(false)}
          onEditObject={(obj) => {
            setEditingObject(obj);
            setShowCreateModal(true);
          }}
        />
      )}

      {/* Captures Modal */}
      {showCaptures && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000]" onClick={() => setShowCaptures(false)}></div>
          <div className="fixed top-0 right-0 h-full w-96 bg-gray-950/98 backdrop-blur-xl border-l border-white/10 z-[2001] shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Target className="text-orange-400" size={24} />
                  <h2 className="text-2xl font-bold text-white">GPS-pinningar 🍄</h2>
                </div>
                <button
                  onClick={() => setShowCaptures(false)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-gray-300">
                <p className="mb-2">💡 Använd orange svampknappen för att snabbt spara GPS-positioner när du är i skogen!</p>
                <p className="text-xs text-gray-400">Perfekt för kantarellställen utan uppkoppling. Skapa objekt senare.</p>
              </div>

              {captures.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Target size={48} className="mx-auto mb-4 text-gray-600" />
                  <p className="text-lg mb-2">Inga pinningar än</p>
                  <p className="text-sm">Tryck på orange knappen för att spara en position</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {captures.map((capture, index) => {
                    const date = new Date(capture.timestamp);
                    const timeStr = date.toLocaleString('sv-SE', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    
                    return (
                      <div key={capture.id} className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-white font-medium mb-1">
                              🍄 Pinning #{captures.length - index}
                            </div>
                            <div className="text-xs text-gray-400">{timeStr}</div>
                          </div>
                          <button
                            onClick={() => handleDeleteCapture(capture.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                            title="Ta bort"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        <div className="text-xs text-gray-400 space-y-1 mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin size={12} />
                            <span>{capture.lat.toFixed(6)}, {capture.lng.toFixed(6)}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleCreateFromCapture(capture)}
                          className="w-full py-2 px-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={16} />
                          Skapa objekt från denna
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showMenu && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000]" onClick={() => setShowMenu(false)}></div>
          <div className="fixed top-0 left-0 h-full w-80 bg-gray-950/98 backdrop-blur-xl border-r border-white/10 z-[2001] shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">Meny</h2>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2">
                {isAdmin && (
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Admin</div>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setShowCategoryAdmin(true);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all group"
                      >
                        <Settings size={18} className="text-blue-400" />
                        <span className="font-medium">Hantera kategorier</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowObjectsAdmin(true);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all group"
                      >
                        <Settings size={18} className="text-purple-400" />
                        <span className="font-medium">Alla objekt</span>
                      </button>
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Inställningar</div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">Håll skärmen påslagen</div>
                        <div className="text-xs text-gray-400 mt-0.5">Förhindrar att skärmen släcks</div>
                      </div>
                      <button
                        onClick={() => setKeepScreenOn(!keepScreenOn)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          keepScreenOn ? 'bg-blue-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            keepScreenOn ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {!('wakeLock' in navigator) && (
                      <div className="mt-2 text-xs text-yellow-400">
                        ⚠️ Din webbläsare stöder inte denna funktion
                      </div>
                    )}
                    {keepScreenOn && 'wakeLock' in navigator && (
                      <div className="mt-2 text-xs text-green-400">
                        ✓ Aktiv - skärmen ska förbli påslagen
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2 mt-4">Snabbpinningar</div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">Visa svampknapp 🍄</div>
                        <div className="text-xs text-gray-400 mt-0.5">Orange snabb-pinning för offline</div>
                      </div>
                      <button
                        onClick={() => setShowQuickCapture(!showQuickCapture)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          showQuickCapture ? 'bg-orange-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showQuickCapture ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  {showQuickCapture && (
                    <>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex-1 mb-2">
                          <div className="text-sm font-medium text-white">Snabbpinning går till objekt</div>
                          <div className="text-xs text-gray-400 mt-0.5">Lägg till positioner direkt på valt objekt</div>
                        </div>
                        <select
                          value={quickCaptureObjectId}
                          onChange={(e) => setQuickCaptureObjectId(e.target.value)}
                          className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        >
                          <option value="">Ingen (spara i lista)</option>
                          {objects && user && objects
                            .filter(obj => obj.ownerId === user.uid)
                            .map(obj => ({
                              ...obj,
                              displayName: obj.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlöst objekt'
                            }))
                            .sort((a, b) => a.displayName.localeCompare(b.displayName))
                            .map(obj => (
                              <option key={obj.id} value={obj.id}>
                                {obj.displayName}
                              </option>
                            ))}
                        </select>
                      </div>
                      <button
                        onClick={() => { setShowMenu(false); setShowCaptures(true); }}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Target size={18} className="text-orange-400" />
                          <span className="font-medium">Visa pinningar</span>
                        </div>
                        {captures.length > 0 && (
                          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {captures.length}
                          </span>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;