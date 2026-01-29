import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { 
  MapPin, Home, Coffee, Mountain, Star, Calendar, X, Plus, Image, Edit2, Trash2, 
  Loader, LogOut, LogIn, Check, Circle, Upload, Folder, Navigation, Plane, 
  Map as MapIcon, List, ChevronDown, ArrowUp, ArrowDown, Search, Settings,
  UtensilsCrossed, Pizza, Wine, Beer, Gamepad2, Music, Film, PartyPopper, 
  Bike, Dumbbell, Waves, TreePine, Shell, Sprout, RotateCcw, Target, Lightbulb,
  SlidersHorizontal, Menu, Filter, Share2, UserPlus, UserMinus, Users, Mail
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Tooltip, Popup } from 'react-leaflet';
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
    html: `<div class="user-position-marker" style="width: 20px; height: 20px; border-radius: 50%; background: #3B82F6; border: 3px solid white; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.3); position: relative;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(59, 130, 246, 0.4); animation: pulse 2s infinite;"></div>
    </div>`,
    className: 'user-position-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
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

// Helper to transform Cloudinary URLs - only does basic resize, cropping handled by CSS
const getTransformedImageUrl = (url, cropMode = 'auto', width = 800, height = 600, focalPoint = null) => {
  if (!url || !url.includes('cloudinary.com')) return url; // Return non-Cloudinary URLs as-is
  
  // If we have a custom focal point, don't use Cloudinary cropping - we'll handle it with CSS
  if (focalPoint && focalPoint.x !== undefined && focalPoint.y !== undefined) {
    // Just resize, don't crop - CSS object-position will handle positioning
    const transformation = `c_limit,w_${width * 2},h_${height * 2},q_auto`;
    return url.replace('/upload/', `/upload/${transformation}/`);
  }
  
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

// Helper to get CSS styles for focal point positioning
const getFocalPointStyles = (focalPoint) => {
  if (!focalPoint || focalPoint.x === undefined || focalPoint.y === undefined) {
    return {};
  }
  return {
    objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
    transform: focalPoint.zoom ? `scale(${focalPoint.zoom})` : undefined
  };
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
              const coords = parseGPS(view, gpsOffset, exifOffset, littleEndian);
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

const parseGPS = (view, gpsOffset, exifOffset, littleEndian) => {
  const tags = view.getUint16(gpsOffset, littleEndian);
  let latRef, lat, lngRef, lng;
  
  for (let i = 0; i < tags; i++) {
    const tagOffset = gpsOffset + 2 + (i * 12);
    const tag = view.getUint16(tagOffset, littleEndian);
    // Value offset is relative to TIFF header (exifOffset)
    const valueOffset = exifOffset + view.getUint32(tagOffset + 8, littleEndian);
    
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

// Email key helpers for Firestore (dots are not allowed in object keys)
const emailToKey = (email) => email.replace(/\./g, '_DOT_');
const keyToEmail = (key) => key.replace(/_DOT_/g, '.');

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
  const openGoogleMaps = () => {
    if (data.lat && data.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`, '_blank');
    }
  };

  const openWaze = () => {
    if (data.lat && data.lng) {
      window.open(`https://waze.com/ul?ll=${data.lat},${data.lng}&navigate=yes`, '_blank');
    }
  };

  const handleShowOnMap = () => {
    if (onShowOnMap && data.lat && data.lng) {
      onShowOnMap({ lat: data.lat, lng: data.lng });
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MapPin size={16} className="text-gray-400 flex-shrink-0" />
        {positionNumber && (
          <span className="text-xs font-medium text-orange-400">
            #{positionNumber}
          </span>
        )}
        <span className="text-sm text-gray-300 truncate">
          {data.address || (data.lat && data.lng ? `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}` : 'Ingen plats')}
        </span>
        {inherited && <span className="text-xs text-gray-500">(från parent)</span>}
      </div>
      {data.lat && data.lng && (
        <div className="flex items-center gap-1">
          {onShowOnMap && (
            <button
              onClick={handleShowOnMap}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
              title="Visa på karta"
            >
              <MapIcon size={16} />
            </button>
          )}
          <button
            onClick={openGoogleMaps}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
            title="Google Maps"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </button>
          <button
            onClick={openWaze}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
            title="Waze"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.8-3.2c-.3-.5-.8-.8-1.4-.8H9.2c-.6 0-1.1.3-1.4.8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </button>
        </div>
      )}
      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
          title="Ta bort position"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

const ImageBlock = ({ data }) => {
  const focalStyles = getFocalPointStyles(data.focalPoint);
  return (
    <div className="w-full h-48 rounded-xl overflow-hidden mb-4 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)]">
      <img 
        src={getTransformedImageUrl(data.url, data.focalPoint ? 'custom' : data.cropMode, 800, 480, data.focalPoint)} 
        alt="" 
        className="w-full h-full object-cover"
        style={focalStyles}
      />
    </div>
  );
};

// Lightweight markdown renderer - supports **bold**, *italic*, - bullets, numbered lists
const renderMarkdown = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null; // 'ul' or 'ol'
  
  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
            {listItems}
          </ul>
        );
      }
      listItems = [];
      listType = null;
    }
  };
  
  const formatInline = (line) => {
    // Process bold and italic
    const parts = [];
    let remaining = line;
    let keyIndex = 0;
    
    while (remaining.length > 0) {
      // Check for **bold**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Check for *italic* (but not **)
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      
      let firstMatch = null;
      let matchType = null;
      
      if (boldMatch && (!italicMatch || boldMatch.index <= italicMatch.index)) {
        firstMatch = boldMatch;
        matchType = 'bold';
      } else if (italicMatch) {
        firstMatch = italicMatch;
        matchType = 'italic';
      }
      
      if (firstMatch) {
        // Add text before match
        if (firstMatch.index > 0) {
          parts.push(remaining.substring(0, firstMatch.index));
        }
        // Add formatted text
        if (matchType === 'bold') {
          parts.push(<strong key={keyIndex++} className="font-semibold text-white">{firstMatch[1]}</strong>);
        } else {
          parts.push(<em key={keyIndex++} className="italic text-gray-300">{firstMatch[1]}</em>);
        }
        remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }
    
    return parts.length > 0 ? parts : line;
  };
  
  lines.forEach((line, index) => {
    // Check for H1 heading (# )
    const h1Match = line.match(/^#\s+(.+)/);
    // Check for H2 heading (## )
    const h2Match = line.match(/^##\s+(.+)/);
    // Check for bullet list (- or *)
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    // Check for numbered list (1. 2. etc)
    const numberedMatch = line.match(/^\s*\d+\.\s+(.+)/);
    
    if (h2Match) {
      flushList();
      elements.push(<h3 key={`h2-${index}`} className="text-base font-semibold text-white mt-3 mb-1">{formatInline(h2Match[1])}</h3>);
    } else if (h1Match) {
      flushList();
      elements.push(<h2 key={`h1-${index}`} className="text-lg font-bold text-white mt-4 mb-2">{formatInline(h1Match[1])}</h2>);
    } else if (bulletMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={`li-${index}`} className="text-gray-200">{formatInline(bulletMatch[1])}</li>);
    } else if (numberedMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={`li-${index}`} className="text-gray-200">{formatInline(numberedMatch[1])}</li>);
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<div key={`br-${index}`} className="h-2" />);
      } else {
        elements.push(<p key={`p-${index}`} className="text-gray-200">{formatInline(line)}</p>);
      }
    }
  });
  
  flushList();
  return elements;
};

const TextBlock = ({ data }) => (
  <div className="bg-white/[0.03] rounded-xl p-4">
    <div className="text-sm leading-relaxed space-y-1">
      {renderMarkdown(data.content)}
    </div>
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

  const checkedCount = data.items.filter(item => item.checked).length;
  const totalCount = data.items.length;

  return (
    <div className="bg-white/[0.03] rounded-xl overflow-hidden">
      {/* Header with progress */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{checkedCount}/{totalCount}</span>
        </div>
        {checkedCount > 0 && onUpdate && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-blue-400 transition-all"
            title="Nollställ alla markeringar"
          >
            <RotateCcw size={12} />
            <span>Nollställ</span>
          </button>
        )}
      </div>
      {/* Items */}
      <div className="divide-y divide-white/5">
        {data.items.map((item, i) => (
          <div 
            key={i}
            onClick={() => handleToggle(i)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors group"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              item.checked ? 'bg-blue-500 border-blue-500' : 'border-gray-600 group-hover:border-blue-400'
            }`}>
              {item.checked && <Check size={14} className="text-white" />}
            </div>
            <span className={`text-sm transition-all ${
              item.checked ? 'text-gray-500 line-through' : 'text-gray-200'
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
    <div className="bg-white/[0.03] rounded-xl overflow-hidden">
      {/* Header with progress */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{doneItems}/{totalItems}</span>
        </div>
        {doneItems > 0 && onUpdate && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-green-400 transition-all"
            title="Nollställ alla markeringar"
          >
            <RotateCcw size={12} />
            <span>Nollställ</span>
          </button>
        )}
      </div>
      {/* Items */}
      <div className="divide-y divide-white/5">
        {data.items.map((item, i) => (
          <div 
            key={i}
            onClick={() => handleToggle(i)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors group"
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              item.done ? 'bg-green-500 border-green-500' : 'border-gray-600 group-hover:border-green-400'
            }`}>
              {item.done && <Check size={14} className="text-white" />}
            </div>
            <span className={`text-sm transition-all ${
              item.done ? 'text-gray-500 line-through' : 'text-gray-200'
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
  const textBlock = object.blocks.find(b => b.type === 'text');
  const isOwner = currentUser && object.ownerId === currentUser.uid;
  const isSharedWithMe = object.isSharedWithMe;
  const myShareRole = isSharedWithMe ? object.shares?.[currentUser?.email?.toLowerCase()]?.role : null;

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
  
  // Get a preview snippet from text block
  const textPreview = textBlock?.data?.content?.slice(0, 80)?.replace(/[#*_-]/g, '')?.trim();

  return (
    <div onClick={onClick} className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-blue-400/50 transition-all cursor-pointer transform hover:scale-[1.02] relative group">
      {imageBlock ? (
        <>
          {/* Top left buttons: Favorite + Share */}
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
            {currentUser && (
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
            )}
            {isOwner && (
              <button
                onClick={handleShareClick}
                className="p-1.5 rounded-full bg-gray-900/70 backdrop-blur-sm hover:bg-gray-800/90 hover:scale-110 transition-all duration-200"
                title="Dela"
              >
                <Share2 size={16} className="text-gray-400 hover:text-blue-300" />
              </button>
            )}
          </div>
          {/* Top right badges: Shared indicator + Child count */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
            {isSharedWithMe && (
              <div className="bg-purple-500/20 backdrop-blur-sm text-purple-300 text-xs px-2 py-1 rounded-full border border-purple-500/30 flex items-center gap-1" title={`Delad med dig som ${myShareRole === 'editor' ? 'redigerare' : 'läsare'}`}>
                <Users size={12} />
              </div>
            )}
            {childCount > 0 && (
              <div className="bg-white/10 backdrop-blur-sm text-gray-200 text-xs px-2 py-1 rounded-full border border-white/15 flex items-center gap-1">
                <Folder size={12} className="text-gray-300" />
                {childCount}
              </div>
            )}
          </div>
          <div className="w-full h-40 overflow-hidden relative">
            <img 
              src={getTransformedImageUrl(imageBlock.data.url, imageBlock.data.focalPoint ? 'custom' : imageBlock.data.cropMode, 800, 320, imageBlock.data.focalPoint)} 
              alt="" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              style={getFocalPointStyles(imageBlock.data.focalPoint)}
            />
          </div>
        </>
      ) : null}
      <div className={imageBlock ? "p-4" : "p-4"}>
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
          {/* Favorite + Share buttons for cards without image */}
          {!imageBlock && (
            <div className="flex items-center gap-1">
              {currentUser && (
                <button
                  onClick={handleFavoriteClick}
                  className="p-1.5 rounded-full hover:bg-white/10 hover:scale-110 transition-all duration-200 flex-shrink-0"
                  title={isFavorite ? 'Ta bort från favoriter' : 'Lägg till i favoriter'}
                >
                  <Star 
                    size={16} 
                    className={`transition-colors ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-300'}`}
                  />
                </button>
              )}
              {isOwner && (
                <button
                  onClick={handleShareClick}
                  className="p-1.5 rounded-full hover:bg-white/10 hover:scale-110 transition-all duration-200 flex-shrink-0"
                  title="Dela"
                >
                  <Share2 size={16} className="text-gray-400 hover:text-blue-300" />
                </button>
              )}
              {isSharedWithMe && (
                <div className="p-1.5 rounded-full flex-shrink-0" title={`Delad med dig som ${myShareRole === 'editor' ? 'redigerare' : 'läsare'}`}>
                  <Users size={16} className="text-purple-400" />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Compact info row for cards without image */}
        {!imageBlock && (childCount > 0 || distance !== undefined) && (
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
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

function ObjectsAdminModal({ objects: passedObjects, categories, onClose, onEditObject }) {
  const [sortBy, setSortBy] = useState('title'); // title, category, parent
  const [filterUserId, setFilterUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [allObjects, setAllObjects] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  
  // Fetch ALL objects for admin view
  useEffect(() => {
    const objectsRef = collection(db, 'objects');
    const unsub = onSnapshot(objectsRef, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setAllObjects(all);
      setLoadingAll(false);
    }, (error) => {
      console.error('Admin: Error loading all objects:', error);
      // Fallback to passed objects if admin query fails
      setAllObjects(passedObjects);
      setLoadingAll(false);
    });
    return () => unsub();
  }, [passedObjects]);
  
  // Use allObjects if loaded, otherwise passedObjects
  const objects = loadingAll ? passedObjects : allObjects;
  
  // Swipe to close state
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const modalRef = useRef(null);
  
  const SWIPE_THRESHOLD = 30;
  const CLOSE_THRESHOLD = 150;
  const RESISTANCE = 0.5;
  
  const handleTouchStart = (e) => {
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
    <div 
      className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-lg sm:w-[90%] h-full sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col transition-transform duration-200 ease-out relative sm:shadow-2xl sm:shadow-black/50"
        style={{ transform: `translateX(${touchDelta}px)`, opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-blue-600/8 via-blue-900/5 to-transparent pointer-events-none" />
        
        {/* Fixed header */}
        <div className="sticky top-0 z-10 px-4 py-4 sm:p-6 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
              <List size={20} className="text-blue-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Alla objekt</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation"
            aria-label="Stäng"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* Filters section */}
        <div className="px-4 py-3 sm:p-4 border-b border-white/5 relative z-[1]">
          {/* User select with proper dark mode styling */}
          <div className="relative">
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-400/50 appearance-none cursor-pointer"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">Välj användare...</option>
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
            <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          
          {filterUserId && (
            <div className="mt-3">
              {/* Toggle filters button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-3"
              >
                <ChevronDown size={16} className={`transition-transform ${showFilters ? '' : '-rotate-90'}`} />
                <span>{sortedObjects.length} objekt{filterUserId !== 'all' && ` av ${objects.length}`}</span>
                <span className="text-gray-600">•</span>
                <span>Sök & sortera</span>
              </button>
              
              {showFilters && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Sök på titel..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-400/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortBy('title')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'title' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      Titel
                    </button>
                    <button
                      onClick={() => setSortBy('category')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'category' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      Kategori
                    </button>
                    <button
                      onClick={() => setSortBy('parent')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'parent' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      Parent
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 pb-8 sm:pb-10">
          <div className="space-y-2">
            {!filterUserId ? (
              <div className="text-center py-12 text-gray-500">
                <List size={48} className="mx-auto mb-4 opacity-50" />
                <p>Välj en användare ovan för att se objekt</p>
              </div>
            ) : sortedObjects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Inga objekt hittades</p>
              </div>
            ) : sortedObjects.map(obj => {
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
  
  // Swipe to close state
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);
  
  const SWIPE_THRESHOLD = 30; // Minimum px before swipe activates
  const CLOSE_THRESHOLD = 150; // px needed to trigger close
  const RESISTANCE = 0.5; // Friction factor (0.5 = moves half as fast as finger)
  
  const handleTouchStart = (e) => {
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
    
    // Check if this is a horizontal swipe (not vertical scrolling)
    if (!isSwipeActive) {
      // Only activate if moved past threshold and clearly more horizontal than vertical
      if (deltaX > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        setIsSwipeActive(true);
        e.preventDefault(); // Only prevent default once we're sure it's a swipe
      } else if (Math.abs(deltaY) > 10) {
        // User is scrolling vertically, don't activate swipe
        setTouchStart(null);
        return;
      } else {
        return; // Not yet determined, allow normal behavior
      }
    }
    
    // Apply resistance and only allow swiping right
    if (deltaX > SWIPE_THRESHOLD) {
      e.preventDefault();
      const adjustedDelta = (deltaX - SWIPE_THRESHOLD) * RESISTANCE;
      setTouchDelta(adjustedDelta);
    }
  };
  
  const handleTouchEnd = () => {
    // If swiped past close threshold, close the modal
    if (touchDelta > CLOSE_THRESHOLD * RESISTANCE) {
      setIsClosing(true);
      setTouchDelta(200); // Animate out
      setTimeout(onClose, 200);
    } else {
      setTouchDelta(0);
    }
    setTouchStart(null);
    setTouchStartY(null);
    setIsSwipeActive(false);
  };

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
    <div 
      className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[2100] flex items-end sm:items-center justify-center sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-lg sm:w-[90%] h-full sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col transition-transform duration-200 ease-out relative sm:shadow-2xl sm:shadow-black/50"
        style={{ transform: `translateX(${touchDelta}px)`, opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-blue-600/8 via-blue-900/5 to-transparent pointer-events-none" />
        
        {/* Fixed header */}
        <div className="sticky top-0 z-10 px-4 py-4 sm:p-6 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
              <Settings size={20} className="text-blue-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Kategorier</h2>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation"
            aria-label="Stäng"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
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

function ObjectDetail({ object, onClose, onEdit, onDelete, onBlockUpdate, currentUser, allObjects, onNavigate, categories, isAdmin, onShowOnMap, onShare, onLeaveShare }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState(new Set([0])); // First block expanded by default
  const [showManageSection, setShowManageSection] = useState(false);
  
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
  const IconComponent = category ? getIconComponent(category.icon) : (PREDEFINED_ICONS[object.type]?.icon || Home);
  const categoryColor = category?.color || '#3B82F6';
  const isOwner = currentUser && object.ownerId === currentUser.uid;
  const isSharedWithMe = object.isSharedWithMe;
  const userEmailKey = currentUser?.email ? emailToKey(currentUser.email.toLowerCase()) : null;
  const myShareRole = isSharedWithMe && userEmailKey ? object.shares?.[userEmailKey]?.role : null;
  const canEdit = isOwner || isAdmin || myShareRole === 'editor';
  const canManage = isOwner || isAdmin;
  
  const childObjects = allObjects.filter(o => o.parentId === object.id);
  const parentObject = object.parentId ? allObjects.find(o => o.id === object.parentId) : null;
  
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
    const order = { 'title': 0, 'image': 1, 'location': 2, 'text': 3, 'checklist': 3, 'todo': 3 };
    const aOrder = order[a.type] !== undefined ? order[a.type] : 4;
    const bOrder = order[b.type] !== undefined ? order[b.type] : 4;
    return aOrder - bOrder;
  });
  
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
        className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center sm:p-8"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div 
          ref={modalRef}
          className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-lg sm:w-[90%] h-full sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col transition-transform duration-200 ease-out relative sm:shadow-2xl sm:shadow-black/50"
          style={{ transform: `translateX(${touchDelta}px)`, opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1 }}
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
          <div className="sticky top-0 z-10 px-4 py-4 sm:p-5 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${categoryColor}20` }}
              >
                <IconComponent size={20} style={{ color: categoryColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{objectTitle}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{category?.label || 'Objekt'}</span>
                  {isSharedWithMe && (
                    <span className="text-xs text-purple-400 flex items-center gap-1">
                      <Users size={10} />
                      {myShareRole === 'editor' ? 'Redigerare' : 'Läsare'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <button 
                  onClick={() => onShare && onShare(object)} 
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0"
                  aria-label="Dela"
                  title="Dela"
                >
                  <Share2 size={20} />
                </button>
              )}
              <button 
                onClick={onClose} 
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0"
                aria-label="Stäng"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Parent navigation */}
          {parentObject && (
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
          <div className="overflow-y-auto flex-1 p-4 sm:p-5 pb-8 sm:pb-10">
            <div className="space-y-5">
              {(() => {
                const sorted = blocksToRender
                  .filter(block => blockComponents[block.type] && block.type !== 'title');
                return sorted.map((block, index) => {
                // Use the original index in object.blocks (tracked as objectBlockIndex)
                const actualBlockIndex = block.objectBlockIndex;
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
                
                // For location blocks, show delete if there are multiple AND user can edit
                const locationBlocks = blocksToRender.filter(b => b.type === 'location' && !b.inherited);
                const canDeleteLocation = canEdit && block.type === 'location' && locationBlocks.length > 1 && !block.inherited;
                const locationIndex = block.type === 'location' && !block.inherited ? locationBlocks.indexOf(block) + 1 : null;
                
                const handleDeleteBlock = async () => {
                  if (!window.confirm('Ta bort denna position?')) return;
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
                
                return BlockComponent ? (
                  <div key={actualBlockIndex} className="space-y-2">
                    {isCollapsible && (
                      <button
                        onClick={toggleExpanded}
                        className="w-full flex items-center gap-2.5 py-1 group"
                      >
                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <ChevronDown 
                            size={14} 
                            className={`text-gray-400 group-hover:text-white transition-all ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {block.type === 'text' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                          )}
                          {block.type === 'checklist' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                              <path d="M9 11l3 3L22 4"></path>
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                            </svg>
                          )}
                          {block.type === 'todo' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                          )}
                          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                            {customTitle ? customTitle : (
                              <>
                                {block.type === 'text' && (showBlockLabel ? `Anteckning ${blockNumber}` : 'Anteckning')}
                                {block.type === 'checklist' && (showBlockLabel ? `Checklista ${blockNumber}` : 'Checklista')}
                                {block.type === 'todo' && (showBlockLabel ? `Att göra ${blockNumber}` : 'Att göra')}
                              </>
                            )}
                          </span>
                        </div>
                      </button>
                    )}
                    {(!isCollapsible || isExpanded) && (
                      <div>
                        <BlockComponent 
                          key={actualBlockIndex} 
                          data={block.data} 
                          objectId={object.id} 
                          blockIndex={actualBlockIndex} 
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
                <div className="flex items-center gap-2 mb-3">
                  <Folder size={16} className="text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-400">Barn ({childObjects.length})</h3>
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
                            <img 
                              src={getTransformedImageUrl(childImage.data.url, childImage.data.focalPoint ? 'custom' : childImage.data.cropMode, 64, 64, childImage.data.focalPoint)} 
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
              </div>
            )}
            {(canManage || canEdit || isSharedWithMe) && (
              <div ref={manageSectionRef} className="mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={() => setShowManageSection(!showManageSection)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Settings size={18} />
                    <span className="font-medium">{isSharedWithMe && !canEdit ? 'Delning' : 'Hantera objekt'}</span>
                  </div>
                  <ChevronDown 
                    size={18} 
                    className={`transition-transform ${showManageSection ? 'rotate-180' : ''}`}
                  />
                </button>
                {showManageSection && (
                  <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {canManage && (
                      <button
                        onClick={() => onEdit({ parentId: object.id })}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                      >
                        <Plus size={16} />
                        <span className="text-sm">Lägg till barn</span>
                      </button>
                    )}
                    {canEdit && (
                      <div className="flex gap-2">
                        <button onClick={() => onEdit(object)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                          <Edit2 size={16} />
                          <span className="text-sm">Redigera</span>
                        </button>
                        {canManage && (
                          <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all">
                            <Trash2 size={16} />
                            <span className="text-sm">Ta bort</span>
                          </button>
                        )}
                      </div>
                    )}
                    {isSharedWithMe && !isOwner && (
                      <button 
                        onClick={() => onLeaveShare(object)} 
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/30 transition-all"
                      >
                        <UserMinus size={16} />
                        <span className="text-sm">Lämna delning</span>
                      </button>
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
    </>
  );
}

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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/10 max-w-4xl w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Markera plats på kartan</h3>
          <button 
            onClick={onClose} 
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation"
            aria-label="Stäng"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="h-[60vh] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-gray-900/80 transition-all duration-300 mb-4 relative">
          <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
                <Tooltip permanent={false} direction="top">Din plats</Tooltip>
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

function ShareModal({ object, onClose, currentUserEmail }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [includeChildren, setIncludeChildren] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shares, setShares] = useState(object.shares || {});
  
  // Swipe to close state
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const modalRef = useRef(null);
  
  const SWIPE_THRESHOLD = 30;
  const CLOSE_THRESHOLD = 150;
  const RESISTANCE = 0.5;
  
  // Listen to real-time updates for this object's shares
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'objects', object.id), (snap) => {
      if (snap.exists()) {
        setShares(snap.data().shares || {});
      }
    });
    return () => unsub();
  }, [object.id]);
  
  const handleTouchStart = (e) => {
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

  // Convert shares object to list, using stored email or converting key back to email
  const sharesList = Object.entries(shares).map(([key, data]) => ({ 
    key, // Keep the Firestore key for updates/deletes
    email: data.email || keyToEmail(key), // Use stored email or convert key
    ...data 
  }));

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
    const emailKey = emailToKey(trimmedEmail);
    if (shares[emailKey]) {
      setError('Denna användare har redan tillgång');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailKey}`]: {
          email: trimmedEmail, // Store original email for display
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

  const handleRemoveShare = async (emailKey, originalEmail) => {
    const displayEmail = originalEmail || keyToEmail(emailKey);
    if (!confirm(`Ta bort delning för ${displayEmail}?`)) return;
    
    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailKey}`]: deleteField(),
        sharedWithEmails: arrayRemove(displayEmail)
      });
    } catch (err) {
      console.error('Error removing share:', err);
      alert('Kunde inte ta bort delningen');
    }
  };

  const handleUpdateRole = async (emailKey, newRole) => {
    try {
      await updateDoc(doc(db, 'objects', object.id), {
        [`shares.${emailKey}.role`]: newRole
      });
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const titleBlock = object.blocks?.find(b => b.type === 'title');

  return (
    <div 
      className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[1100] flex items-end sm:items-center justify-center sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-md sm:w-[90%] h-full sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col transition-transform duration-200 ease-out relative sm:shadow-2xl sm:shadow-black/50"
        style={{ transform: `translateX(${touchDelta}px)`, opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative gradient */}
        <div 
          className="absolute top-0 left-0 right-0 h-72 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, rgba(139,92,246,0.12), rgba(139,92,246,0.05) 50%, transparent)` }}
        />
        
        {/* Fixed header */}
        <div className="sticky top-0 z-10 px-4 py-4 sm:p-5 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-500/20">
              <Share2 size={20} className="text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">Dela objekt</h2>
              <span className="text-xs text-gray-400 truncate block">{titleBlock?.data?.text || 'Namnlöst objekt'}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation flex-shrink-0 ml-2"
            aria-label="Stäng"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 pb-8 sm:pb-10">
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
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
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
                  className="px-4 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                >
                  <option value="viewer" className="bg-gray-800 text-white">Läsare (kan bara se)</option>
                  <option value="editor" className="bg-gray-800 text-white">Redigerare (kan ändra)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={includeChildren}
                onChange={(e) => setIncludeChildren(e.target.checked)}
                className="w-5 h-5 rounded border-purple-500 text-purple-500 focus:ring-purple-500"
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
                  <div key={share.key} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{share.email}</p>
                      <p className="text-xs text-gray-500">
                        {share.status === 'pending' ? '⏳ Väntar på svar' : share.status === 'accepted' ? '✓ Accepterad' : '✗ Nekad'}
                        {share.includeChildren && ' • Inkl. barn'}
                      </p>
                    </div>
                    <select
                      value={share.role}
                      onChange={(e) => handleUpdateRole(share.key, e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '24px' }}
                    >
                      <option value="viewer" className="bg-gray-800 text-white">Läsare</option>
                      <option value="editor" className="bg-gray-800 text-white">Redigerare</option>
                    </select>
                    <button
                      onClick={() => handleRemoveShare(share.key, share.email)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                      title="Ta bort delning"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateObjectModal({ onClose, onSave, editObject, saving, availableParents, defaultParentId, userLocation, categories, preciseGPS }) {
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
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState(editObject?.blocks?.find(b => b.type === 'image')?.data?.url || '');
  const [imageCropMode, setImageCropMode] = useState(editObject?.blocks?.find(b => b.type === 'image')?.data?.cropMode || 'auto');
  const [imageFocalPoint, setImageFocalPoint] = useState(editObject?.blocks?.find(b => b.type === 'image')?.data?.focalPoint || null);
  const [showFocalPointPicker, setShowFocalPointPicker] = useState(false);
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
  const modalRef = useRef(null);
  
  // Swipe to close
  const [touchStart, setTouchStart] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  
  const SWIPE_THRESHOLD = 30;
  const CLOSE_THRESHOLD = 150;
  const RESISTANCE = 0.5;
  
  const handleTouchStart = (e) => {
    if (saving) return;
    setTouchStart(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setIsSwipeActive(false);
  };
  
  const handleTouchMove = (e) => {
    if (touchStart === null || saving) return;
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
    if (saving) return;
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

  const selectedParent = availableParents.find(p => p.id === parentId);
  const parentHasLocation = selectedParent?.blocks?.some(b => b.type === 'location');

  const gpsWatchRef = useRef(null);
  
  const handleGPSCapture = () => {
    if (!navigator.geolocation) {
      alert('GPS stöds inte av din enhet');
      return;
    }
    if (capturingGPS) return; // Prevent double-clicks
    setCapturingGPS(true);
    setGpsAccuracy(null);
    
    if (preciseGPS) {
      // Precise GPS mode - watch position and wait for good accuracy
      let bestPosition = null;
      let bestAccuracy = Infinity;
      
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          setGpsAccuracy(Math.round(accuracy));
          
          if (accuracy < bestAccuracy) {
            bestAccuracy = accuracy;
            bestPosition = position;
          }
          
          // Auto-accept if accuracy is good enough (under 10 meters)
          if (accuracy <= 10) {
            navigator.geolocation.clearWatch(gpsWatchRef.current);
            const newLat = position.coords.latitude;
            const newLng = position.coords.longitude;
            setLat(newLat);
            setLng(newLng);
            if (!address.trim()) {
              setAddress(`GPS: ${newLat.toFixed(5)}, ${newLng.toFixed(5)} (±${Math.round(accuracy)}m)`);
            }
            setCapturingGPS(false);
            setGpsAccuracy(null);
          }
        },
        (error) => {
          navigator.geolocation.clearWatch(gpsWatchRef.current);
          // If we have a position, use it even if not perfect
          if (bestPosition) {
            const newLat = bestPosition.coords.latitude;
            const newLng = bestPosition.coords.longitude;
            setLat(newLat);
            setLng(newLng);
            if (!address.trim()) {
              setAddress(`GPS: ${newLat.toFixed(5)}, ${newLng.toFixed(5)} (±${Math.round(bestAccuracy)}m)`);
            }
          } else {
            alert('Kunde inte hämta position: ' + error.message);
          }
          setCapturingGPS(false);
          setGpsAccuracy(null);
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      );
      
      // Auto-stop after 15 seconds and use best position
      setTimeout(() => {
        if (gpsWatchRef.current && capturingGPS) {
          navigator.geolocation.clearWatch(gpsWatchRef.current);
          if (bestPosition) {
            const newLat = bestPosition.coords.latitude;
            const newLng = bestPosition.coords.longitude;
            setLat(newLat);
            setLng(newLng);
            if (!address.trim()) {
              setAddress(`GPS: ${newLat.toFixed(5)}, ${newLng.toFixed(5)} (±${Math.round(bestAccuracy)}m)`);
            }
          }
          setCapturingGPS(false);
          setGpsAccuracy(null);
        }
      }, 15000);
    } else {
      // Simple GPS mode - just get current position quickly
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          setLat(newLat);
          setLng(newLng);
          if (!address.trim()) {
            setAddress(`GPS: ${newLat.toFixed(5)}, ${newLng.toFixed(5)}`);
          }
          setCapturingGPS(false);
        },
        (error) => {
          alert('Kunde inte hämta position: ' + error.message);
          setCapturingGPS(false);
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }
  };
  
  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

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
    if (imageUrl.trim()) {
      const imageData = { url: imageUrl.trim(), cropMode: imageCropMode };
      if (imageFocalPoint) imageData.focalPoint = imageFocalPoint;
      blocks.push({ type: 'image', data: imageData });
    }
    
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

    onSave(objectData, isEdit ? editObject.id : null);
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadingImage) return; // Prevent double uploads

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
    <>
      <div 
        className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center sm:p-8"
        onClick={(e) => !saving && e.target === e.currentTarget && onClose()}
      >
        <div 
          ref={modalRef}
          className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-2xl sm:w-[90%] h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col transition-transform duration-200 ease-out relative sm:shadow-2xl sm:shadow-black/50"
          style={{ transform: `translateX(${touchDelta}px)`, opacity: touchDelta > 0 ? 1 - (touchDelta / 300) : 1 }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle decorative gradient */}
          <div 
            className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02) 50%, transparent)' }}
          />
          
          {/* Fixed header */}
          <div className="sticky top-0 z-10 px-4 py-4 sm:p-5 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Plus size={20} className="text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{isEdit ? 'Redigera objekt' : 'Skapa nytt objekt'}</h2>
                <span className="text-xs text-gray-400">{isEdit ? 'Uppdatera detaljer' : 'Fyll i detaljer nedan'}</span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation disabled:opacity-50 flex-shrink-0 ml-2"
              disabled={saving}
              aria-label="Stäng"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-5">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Välj kategori</label>
                {selectedType && !categories.find(c => c.id === selectedType) && (
                  <div className="mb-3 text-sm text-yellow-400 bg-yellow-400/10 px-3 py-2 rounded border border-yellow-400/20">
                    ⚠️ Nuvarande kategori "{selectedType}" finns inte längre. Välj en ny kategori nedan.
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {categories.map(cat => {
                    const Icon = getIconComponent(cat.icon);
                    return (
                      <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedType(cat.id)}
                      disabled={saving}
                      className={`p-2.5 rounded-lg border-2 transition-all ${selectedType === cat.id ? 'border-blue-500 bg-blue-500/20' : 'border-white/10 bg-white/5 hover:border-white/20'} ${saving ? 'opacity-50' : ''}`}
                    >
                      <Icon size={20} className="mx-auto mb-1 text-blue-400" />
                      <div className="text-[10px] text-gray-300 truncate">{cat.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Titel *</label>
              <div className="relative">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="T.ex. Sommarstugan i Dalarna" disabled={saving} className="w-full px-4 py-3 pr-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50" />
                {title && (
                  <button
                    type="button"
                    onClick={() => setTitle('')}
                    disabled={saving}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                )}
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
            {!inheritLocation && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Plats</label>
                <div className="space-y-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="Skriv plats/beskrivning (t.ex. Kantarellstället vid stigen)" 
                      disabled={saving} 
                      className="w-full px-4 py-3 pr-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50" 
                    />
                    {address && (
                      <button
                        type="button"
                        onClick={() => setAddress('')}
                        disabled={saving}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleGPSCapture}
                      disabled={saving || capturingGPS}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <Navigation size={18} className={capturingGPS ? 'animate-pulse' : ''} />
                      <span className="text-sm font-medium">
                        {capturingGPS 
                          ? (gpsAccuracy ? `±${gpsAccuracy}m...` : 'Hämtar...') 
                          : (preciseGPS ? 'Precis GPS' : 'Använd min plats')}
                      </span>
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
                        src={getTransformedImageUrl(imageUrl, imageFocalPoint ? 'custom' : imageCropMode, 800, 600, imageFocalPoint)} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        style={getFocalPointStyles(imageFocalPoint)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          setImageCropMode('auto');
                          setImageFocalPoint(null);
                        }}
                        disabled={uploadingImage || saving}
                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-lg transition-all disabled:opacity-50"
                      >
                        <X size={16} />
                      </button>
                      {/* Button to open focal point picker */}
                      <button
                        type="button"
                        onClick={() => setShowFocalPointPicker(true)}
                        disabled={uploadingImage || saving}
                        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path>
                        </svg>
                        {imageFocalPoint ? 'Ändra' : 'Justera'}
                      </button>
                    </div>
                    {imageFocalPoint && (
                      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Justerad{imageFocalPoint.zoom > 1 ? ` (${Math.round((imageFocalPoint.zoom - 1) * 100)}% zoom)` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => setImageFocalPoint(null)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Återställ till auto
                        </button>
                      </div>
                    )}
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
                    <div className="relative mb-2">
                      <input
                        type="text"
                        value={block.title}
                        onChange={(e) => setCustomBlocks(customBlocks.map(b => b.id === block.id ? { ...b, title: e.target.value } : b))}
                        placeholder={block.type === 'text' ? 'T.ex. Mat plan' : block.type === 'checklist' ? 'T.ex. Före semester' : 'T.ex. Packlista'}
                        disabled={saving}
                        className="w-full px-4 py-2 pr-8 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 text-sm"
                      />
                      {block.title && (
                        <button
                          type="button"
                          onClick={() => setCustomBlocks(customBlocks.map(b => b.id === block.id ? { ...b, title: '' } : b))}
                          disabled={saving}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {block.type === 'text' && (
                      <div className="flex items-center gap-1 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            const textarea = document.getElementById(`textarea-${block.id}`);
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = block.content;
                            const selected = text.substring(start, end);
                            const newContent = text.substring(0, start) + `**${selected}**` + text.substring(end);
                            setCustomBlocks(customBlocks.map(b => b.id === block.id ? { ...b, content: newContent } : b));
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 2, end + 2);
                            }, 0);
                          }}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                          title="Fetstil **text**"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const textarea = document.getElementById(`textarea-${block.id}`);
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = block.content;
                            const selected = text.substring(start, end);
                            const newContent = text.substring(0, start) + `*${selected}*` + text.substring(end);
                            setCustomBlocks(customBlocks.map(b => b.id === block.id ? { ...b, content: newContent } : b));
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 1, end + 1);
                            }, 0);
                          }}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs italic"
                          title="Kursiv *text*"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const textarea = document.getElementById(`textarea-${block.id}`);
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const text = block.content;
                            // Find start of current line
                            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                            const newContent = text.substring(0, lineStart) + '- ' + text.substring(lineStart);
                            setCustomBlocks(customBlocks.map(b => b.id === block.id ? { ...b, content: newContent } : b));
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 2, start + 2);
                            }, 0);
                          }}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs"
                          title="Punktlista"
                        >
                          • Lista
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const textarea = document.getElementById(`textarea-${block.id}`);
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const text = block.content;
                            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                            const newContent = text.substring(0, lineStart) + '# ' + text.substring(lineStart);
                            setCustomBlocks(customBlocks.map(b => b.id === block.id ? { ...b, content: newContent } : b));
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 2, start + 2);
                            }, 0);
                          }}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                          title="Rubrik # text"
                        >
                          H1
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const textarea = document.getElementById(`textarea-${block.id}`);
                            if (!textarea) return;
                            const start = textarea.selectionStart;
                            const text = block.content;
                            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                            const newContent = text.substring(0, lineStart) + '## ' + text.substring(lineStart);
                            setCustomBlocks(customBlocks.map(b => b.id === block.id ? { ...b, content: newContent } : b));
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + 3, start + 3);
                            }, 0);
                          }}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs font-semibold"
                          title="Underrubrik ## text"
                        >
                          H2
                        </button>
                        <span className="text-[10px] text-gray-600 ml-1"># rubrik</span>
                      </div>
                    )}
                    <textarea 
                      id={`textarea-${block.id}`}
                      value={block.content} 
                      onChange={(e) => setCustomBlocks(customBlocks.map(b => b.id === block.id ? { ...b, content: e.target.value } : b))}
                      placeholder={block.type === 'text' ? 'Stöder # rubrik, **fet**, *kursiv*, - lista' : 'En per rad'}
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
          </div>
          
          {/* Fixed footer with action buttons */}
          <div className="sticky bottom-0 p-4 sm:p-5 border-t border-white/5 bg-gradient-to-t from-gray-950 via-gray-900/98 to-gray-900/95 backdrop-blur-xl">
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50">Avbryt</button>
              <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader size={18} className="animate-spin" /><span>Sparar...</span></> : <span>{isEdit ? 'Uppdatera' : 'Skapa objekt'}</span>}
              </button>
            </div>
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
      {showFocalPointPicker && imageUrl && (
        <FocalPointPicker
          imageUrl={imageUrl}
          currentFocalPoint={imageFocalPoint}
          onSelect={(point) => {
            setImageFocalPoint(point);
            setShowFocalPointPicker(false);
          }}
          onClose={() => setShowFocalPointPicker(false)}
        />
      )}
    </>
  );
}

// Focal Point Picker Component with zoom
function FocalPointPicker({ imageUrl, currentFocalPoint, onSelect, onClose }) {
  const [focalPoint, setFocalPoint] = useState(currentFocalPoint || { x: 50, y: 50, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  
  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    updateFocalPoint(e);
  };
  
  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    updateFocalPoint(e);
  };
  
  const handlePointerUp = () => {
    setIsDragging(false);
  };
  
  const updateFocalPoint = (e) => {
    if (!containerRef.current || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setFocalPoint(prev => ({ ...prev, x, y }));
  };
  
  const handleZoomChange = (newZoom) => {
    setFocalPoint(prev => ({ ...prev, zoom: newZoom }));
  };
  
  // Get original image URL without transformations for the picker
  const originalImageUrl = imageUrl.includes('/upload/') 
    ? imageUrl.replace(/\/upload\/[^/]+\//, '/upload/q_auto,w_1200/') 
    : imageUrl;
  
  return (
    <div className="fixed inset-0 bg-black/95 z-[2000] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gray-900/80">
        <div>
          <h3 className="text-lg font-bold text-white">Justera bilden</h3>
          <p className="text-xs text-gray-400">Tryck på bilden för att välja fokuspunkt, använd reglaget för zoom</p>
        </div>
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Image picker area */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden p-4 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="relative">
          <img 
            ref={imageRef}
            src={originalImageUrl} 
            alt="Välj fokuspunkt" 
            className="max-w-full max-h-[50vh] rounded-xl shadow-2xl pointer-events-none select-none"
            draggable={false}
          />
          {/* Dimmed overlay except around focal point */}
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            {/* Full dim overlay */}
            <div className="absolute inset-0 bg-black/50"></div>
            {/* Clear circle around focal point */}
            <div 
              className="absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ 
                left: `${focalPoint.x}%`, 
                top: `${focalPoint.y}%`,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                background: 'transparent'
              }}
            ></div>
          </div>
          {/* Focal point crosshair */}
          <div 
            className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
            style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white shadow-[0_0_20px_rgba(0,0,0,0.5)]"></div>
            {/* Inner dot */}
            <div className="absolute inset-[26px] rounded-full bg-white shadow-lg"></div>
            {/* Crosshair lines extending outside circle */}
            <div className="absolute left-1/2 -top-4 h-4 w-0.5 bg-white/70 -translate-x-1/2"></div>
            <div className="absolute left-1/2 -bottom-4 h-4 w-0.5 bg-white/70 -translate-x-1/2"></div>
            <div className="absolute top-1/2 -left-4 w-4 h-0.5 bg-white/70 -translate-y-1/2"></div>
            <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-white/70 -translate-y-1/2"></div>
          </div>
        </div>
      </div>
      
      {/* Bottom controls */}
      <div className="p-4 border-t border-white/10 bg-gray-900/90 space-y-4">
        {/* Zoom slider */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <span className="text-xs w-8">Ut</span>
          </div>
          <input
            type="range"
            min="1"
            max="2"
            step="0.05"
            value={focalPoint.zoom || 1}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs w-8 text-right">In</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
        </div>
        
        {/* Preview and actions */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <p className="text-xs text-gray-500 mb-1.5">Resultat</p>
            <div className="w-28 h-20 rounded-lg overflow-hidden border border-white/20 bg-gray-800">
              <img 
                src={originalImageUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
                style={{ 
                  objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                  transform: `scale(${focalPoint.zoom || 1})`
                }}
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <button
              onClick={() => onSelect(focalPoint)}
              className="w-full px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Använd
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-sm"
            >
              Avbryt
            </button>
          </div>
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
  const [activeCategory, setActiveCategory] = useState(() => {
    const saved = localStorage.getItem('activeCategory');
    return saved || 'all';
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingObject, setEditingObject] = useState(null);
  const [showAllObjects, setShowAllObjects] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [userLocation, setUserLocation] = useState(null);
  const [showShareModal, setShowShareModal] = useState(null); // Object to share
  const [sortByDistance, setSortByDistance] = useState(() => {
    const saved = localStorage.getItem('sortByDistance');
    return saved === 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
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
  const [preciseGPS, setPreciseGPS] = useState(() => {
    const saved = localStorage.getItem('preciseGPS');
    return saved === 'true'; // Default false (snabb GPS)
  });
  const [mapCenter, setMapCenter] = useState(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const seedingRef = useRef(false);
  const wakeLockRef = useRef(null);

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

  // Save activeCategory preference
  useEffect(() => {
    localStorage.setItem('activeCategory', activeCategory);
  }, [activeCategory]);

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

          // Re-acquire wake lock when it's released
          wakeLockRef.current.addEventListener('release', () => {
            // Automatically re-request if still active
            if (keepScreenOn && isActive) {

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

  // Save preciseGPS preference
  useEffect(() => {
    localStorage.setItem('preciseGPS', preciseGPS.toString());
  }, [preciseGPS]);

  // Auth listener + check admin status
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check if user is admin
        try {

          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const adminFlag = userDoc.data()?.isAdmin === true;
            const userFavorites = userDoc.data()?.favorites || [];

            setIsAdmin(adminFlag);
            setFavorites(userFavorites);
          } else {

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

  // Capture user's location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // User denied or error - just continue without location
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setObjects([]);
      setLoading(false);
      return;
    }

    const userEmail = user.email?.toLowerCase();
    const objectsRef = collection(db, 'objects');
    
    // Query 1: Objects where user is owner
    const ownedQuery = query(objectsRef, where('ownerId', '==', user.uid));
    
    // Query 2: Objects shared with this user's email
    const sharedQuery = userEmail 
      ? query(objectsRef, where('sharedWithEmails', 'array-contains', userEmail))
      : null;
    
    let ownedObjects = [];
    let sharedObjects = [];
    let ownedLoaded = false;
    let sharedLoaded = !sharedQuery; // If no email, consider it loaded
    
    const combineAndSetObjects = () => {
      if (!ownedLoaded || !sharedLoaded) return;
      
      // Combine and dedupe (owned objects take precedence)
      const ownedIds = new Set(ownedObjects.map(o => o.id));
      const combined = [
        ...ownedObjects,
        ...sharedObjects.filter(o => !ownedIds.has(o.id)).map(o => ({ ...o, isSharedWithMe: true }))
      ];
      
      setObjects(combined);
      setLoading(false);
      
      // Update selectedObject if it exists and has been modified
      setSelectedObject(prev => {
        if (!prev?.id) return prev;
        const updated = combined.find(obj => obj.id === prev.id);
        return updated || prev;
      });
    };
    
    // Subscribe to owned objects
    const unsubOwned = onSnapshot(ownedQuery, (snap) => {
      ownedObjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      ownedLoaded = true;
      combineAndSetObjects();
    }, (error) => {
      console.error('Error loading owned objects:', error);
      ownedLoaded = true;
      combineAndSetObjects();
    });
    
    // Subscribe to shared objects (if user has email)
    let unsubShared = () => {};
    if (sharedQuery) {
      unsubShared = onSnapshot(sharedQuery, (snap) => {
        sharedObjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        sharedLoaded = true;
        combineAndSetObjects();
      }, (error) => {
        console.error('Error loading shared objects:', error);
        sharedLoaded = true;
        combineAndSetObjects();
      });
    }
    
    return () => {
      unsubOwned();
      unsubShared();
    };
  }, [user]);

  // Listen to categories
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.order - b.order);

      setCategories(cats);
      setCategoriesLoaded(true);
    });
    return () => unsub();
  }, []);

  // Seed initial categories if needed
  useEffect(() => {
    const seedCategories = async () => {
      if (!isAdmin || !user || seedingRef.current) {

        return;
      }

      seedingRef.current = true;
      
      try {
        // Check if categories exist
        const snap = await getDoc(doc(db, 'categories', 'property'));
        if (snap.exists()) {

          return;
        }


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
    const hasModalOpen = !!selectedObject || !!showCreateModal || !!showMenu || !!showCategoryAdmin || !!showObjectsAdmin || !!showCaptures;
    const previousOverflow = document.body.style.overflow;
    if (hasModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedObject, showCreateModal, showMenu, showCategoryAdmin, showObjectsAdmin, showCaptures]);

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

  // Filter by category (combine with favorites if both selected)
  let filteredObjects = objects;
  
  // Get pending invitations (objects where user's share status is pending)
  const userEmailLower = user?.email?.toLowerCase();
  const userEmailKey = userEmailLower ? emailToKey(userEmailLower) : null;
  const pendingInvitations = userEmailKey 
    ? objects.filter(obj => {
        if (!obj.shares) return false;
        // Check using the escaped email key
        const shareEntry = obj.shares[userEmailKey];
        if (shareEntry?.status === 'pending') {

          return true;
        }
        // Also check if we're in sharedWithEmails but not the owner
        if (obj.isSharedWithMe && obj.ownerId !== user.uid) {

        }
        return false;
      })
    : [];
  

  
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
      const children = objects.filter(o => o.parentId === obj.id);
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

    // Optimistic update
    setObjects(prev => prev.map(obj => obj.id === objectId ? applyBlockUpdate(obj) : obj));
    setSelectedObject(prev => (prev && prev.id === objectId) ? applyBlockUpdate(prev) : prev);

    try {
      const obj = objects.find(o => o.id === objectId);
      if (!obj) return;
      const updatedBlocks = obj.blocks.map((b, i) => i === blockIndex ? { ...b, data: newBlockData } : b);
      await updateDoc(doc(db, 'objects', objectId), { blocks: updatedBlocks, updatedAt: Timestamp.now() });
    } catch (err) {
      // Silently fail - optimistic update already applied
    }
  };

  const handleSaveObject = async (objectData, editId) => {
    if (!user) {
      alert('Du måste vara inloggad!');
      return;
    }
    setSaving(true);
    try {
      let savedObjectId = editId;
      
      if (editId) {
        // Update existing
        await updateDoc(doc(db, 'objects', editId), { ...objectData, updatedAt: Timestamp.now() });
      } else {
        // Create new - use Promise.race with timeout
        const addOperation = addDoc(collection(db, 'objects'), { 
          ...objectData, 
          ownerId: user.uid, 
          ownerName: user.displayName, 
          ownerEmail: user.email, 
          createdAt: Timestamp.now(), 
          updatedAt: Timestamp.now() 
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        
        const docRef = await Promise.race([addOperation, timeoutPromise]);
        savedObjectId = docRef.id;
      }
      
      setShowCreateModal(false);
      setEditingObject(null);
      setDefaultParentId(null);
      
      // Show the saved object after a brief delay (let Firestore sync)
      if (savedObjectId) {
        setTimeout(() => {
          const savedObj = objects.find(o => o.id === savedObjectId);
          if (savedObj) {
            setSelectedObject(savedObj);
          }
        }, 300);
      }
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
      alert('Kunde inte ta bort!');
    }
  };

  const handleLeaveShare = async (obj) => {
    if (!user) return;
    
    if (!confirm('Är du säker på att du vill lämna denna delning? Du kommer inte längre ha tillgång till objektet.')) {
      return;
    }
    
    try {
      const userEmail = user.email.toLowerCase();
      const emailKey = emailToKey(userEmail);
      
      await updateDoc(doc(db, 'objects', obj.id), {
        [`shares.${emailKey}`]: deleteField(),
        sharedWithEmails: arrayRemove(userEmail),
        acceptedShareEmails: arrayRemove(userEmail)
      });
      
      setSelectedObject(null);
    } catch (err) {
      console.error('Error leaving share:', err);
      alert('Kunde inte lämna delningen!');
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

  if (loading || !categoriesLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">{!categoriesLoaded ? 'Laddar kategorier...' : 'Laddar dina platser...'}</p>
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
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              title="Meny"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-2xl font-bold text-white">OurSpots</h1>
            {pendingInvitations.length > 0 && (
              <button
                onClick={() => setShowInvitations(!showInvitations)}
                className="relative w-10 h-10 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400 hover:text-blue-300 transition-all"
                title="Inbjudningar"
              >
                <Mail size={20} />
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingInvitations.length}
                </span>
              </button>
            )}
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
      
      {/* Invitations dropdown */}
      {showInvitations && pendingInvitations.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowInvitations(false)} />
          <div className="absolute left-4 right-4 sm:left-auto sm:right-auto sm:w-80 mt-2 ml-0 sm:ml-14 p-3 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-in slide-in-from-top-2">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Mail size={16} className="text-blue-400" />
              Inbjudningar ({pendingInvitations.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingInvitations.map(obj => {
                const titleBlock = obj.blocks?.find(b => b.type === 'title');
                const shareInfo = obj.shares[userEmailKey];
                return (
                  <div key={obj.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{titleBlock?.data?.text || 'Namnlöst'}</p>
                      <p className="text-xs text-gray-400">
                        {shareInfo?.role === 'editor' ? '✏️ Redigerare' : '👁️ Läsare'}
                        {shareInfo?.includeChildren && ' • Inkl. barn'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          try {
                            const emailKey = emailToKey(user.email.toLowerCase());
                            const userEmail = user.email.toLowerCase();
                            await updateDoc(doc(db, 'objects', obj.id), {
                              [`shares.${emailKey}.status`]: 'accepted',
                              [`shares.${emailKey}.respondedAt`]: Timestamp.now(),
                              acceptedShareEmails: arrayUnion(userEmail)
                            });
                            if (pendingInvitations.length === 1) setShowInvitations(false);
                          } catch (err) {
                            alert('Kunde inte acceptera');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-green-500/20 text-green-300 text-xs font-medium hover:bg-green-500/30 transition-colors"
                      >
                        ✓
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const emailKey = emailToKey(user.email.toLowerCase());
                            const userEmail = user.email.toLowerCase();
                            await updateDoc(doc(db, 'objects', obj.id), {
                              [`shares.${emailKey}`]: deleteField(),
                              sharedWithEmails: arrayRemove(userEmail),
                              acceptedShareEmails: arrayRemove(userEmail)
                            });
                            if (pendingInvitations.length === 1) setShowInvitations(false);
                          } catch (err) {
                            alert('Kunde inte neka');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
      
      <div className="bg-gray-900/30 backdrop-blur-md border-b border-white/10 sticky z-30" style={{ top: headerHeight }}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-center">
            {/* Scrollable categories */}
            <div className="flex gap-2 overflow-x-auto flex-1 min-w-0 pb-1 -mb-1">
              {/* Always show "Alla" category */}
              <button
                onClick={() => setActiveCategory('all')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === 'all' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
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
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === cat.id ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                  >
                    <IconComponent size={16} />
                    <span className="text-sm font-medium hidden sm:inline">{cat.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Filter button - fixed position */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all text-sm font-medium flex-shrink-0 ${showFilters ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              title={showFilters ? 'Dölj filter' : 'Visa filter'}
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
          
          {showFilters && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Search - at top with clear button */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 text-white text-base placeholder:text-gray-400 rounded-xl pl-10 pr-10 py-2.5 border border-white/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all"
                  placeholder="Sök på namn eller innehåll"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-gray-300 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              
              {/* Favorites + Sort by distance on same row */}
              <div className="flex gap-2">
                {user && (
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${showFavoritesOnly ? 'bg-yellow-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'}`}
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
                {userLocation && (
                  <button 
                    onClick={() => setSortByDistance(!sortByDistance)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${sortByDistance ? 'bg-purple-500/80 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'}`}
                  >
                    <Navigation size={16} />
                    <span>Närmast</span>
                  </button>
                )}
              </div>
              
              {/* Distance slider */}
              {userLocation && (
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Max avstånd</span>
                    <span className="text-gray-200">
                      {maxDistanceKm ? `${maxDistanceKm} km` : 'Alla'}
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
                      className="flex-1 accent-blue-500"
                    />
                    <button
                      onClick={() => setMaxDistanceKm(null)}
                      disabled={!maxDistanceKm}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10 disabled:opacity-40"
                    >
                      Alla
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
                const childCount = objects.filter(o => o.parentId === obj.id).length;
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
                  {showFavoritesOnly ? 'Inga favoriter ännu' : 'Inga objekt hittades'}
                </p>
                <p className="text-gray-600 text-sm mt-2 max-w-xs mx-auto">
                  {!user ? 'Logga in för att skapa objekt!' : 
                   showFavoritesOnly ? 'Markera objekt med stjärnan för att lägga till favoriter' :
                   'Tryck på + knappen för att skapa ditt första objekt'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <MapView objects={filteredObjects} onSelectObject={setSelectedObject} currentUser={user} userLocation={userLocation} categories={categories} mapCenter={mapCenter} showFilters={showFilters} />
        )}
      </main>

      {user && (
        <>
          {/* Hide + button and map toggle when any modal is open */}
          {!selectedObject && !showCreateModal && !showCategoryAdmin && !showObjectsAdmin && !showShareModal && (
            <>
              <button 
                onClick={() => { setEditingObject(null); setShowCreateModal(true); }} 
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 z-[1200]"
                title="Skapa nytt objekt"
              >
                <Plus size={26} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => {
                  const newMode = viewMode === 'list' ? 'map' : 'list';
                  setViewMode(newMode);
                  if (newMode === 'map') {
                    window.scrollTo(0, 0);
                  } else {
                    // Clear mapCenter when leaving map view so next open focuses on user location
                    setMapCenter(null);
                  }
                }}
                className="fixed bottom-24 right-6 w-14 h-14 bg-gray-800/90 hover:bg-gray-700 backdrop-blur-sm rounded-2xl shadow-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 z-[1200] border border-white/10"
                title={viewMode === 'list' ? 'Visa karta' : 'Visa lista'}
              >
                {viewMode === 'list' ? <MapIcon size={22} /> : <List size={22} />}
              </button>
            </>
          )}
          {/* Quick capture mushroom button - always visible, moves to bottom when other buttons hidden */}
          {showQuickCapture && (
            <button
              onClick={handleQuickCapture}
              className={`fixed right-6 w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 z-[1200] transition-all duration-300 ${
                (selectedObject || showCreateModal || showCategoryAdmin || showObjectsAdmin || showShareModal) ? 'bottom-6' : 'bottom-[10.5rem]'
              }`}
              title="Snabbpinna GPS-position 🍄"
            >
              <Target size={22} />
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
          currentUser={user} 
          allObjects={objects} 
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
          onLeaveShare={handleLeaveShare}
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
          preciseGPS={preciseGPS}
        />
      )}

      {showShareModal && (
        <ShareModal
          object={showShareModal}
          onClose={() => setShowShareModal(null)}
          currentUserEmail={user?.email?.toLowerCase()}
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
        <div 
          className="fixed inset-0 bg-black/80 sm:bg-black/70 backdrop-blur-sm z-[2000] flex items-end sm:items-center justify-center sm:justify-end"
          onClick={(e) => e.target === e.currentTarget && setShowCaptures(false)}
        >
          <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-l-xl sm:rounded-r-none border-t sm:border-l sm:border-t sm:border-b border-white/10 sm:border-white/[0.08] w-full sm:w-96 h-full sm:h-full overflow-hidden flex flex-col relative sm:shadow-2xl sm:shadow-black/50 animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            {/* Subtle decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-orange-600/8 via-orange-900/5 to-transparent pointer-events-none" />
            
            {/* Fixed header */}
            <div className="sticky top-0 z-10 px-4 py-4 sm:p-6 border-b border-white/5 bg-gradient-to-r from-gray-900/98 via-gray-900/95 to-gray-900/98 backdrop-blur-xl flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                  <Target size={20} className="text-orange-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">GPS-pinningar</h2>
              </div>
              <button
                onClick={() => setShowCaptures(false)}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation"
                aria-label="Stäng"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 pb-8 sm:pb-10">
              <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">
                <div className="flex gap-3">
                  <Lightbulb size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="mb-1">Använd orange svampknappen för att snabbt spara GPS-positioner när du är i skogen!</p>
                    <p className="text-xs text-gray-500">Perfekt för kantarellställen utan uppkoppling. Skapa objekt senare.</p>
                  </div>
                </div>
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
                            <div className="flex items-center gap-2 text-white font-medium mb-1">
                              <Target size={16} className="text-orange-400" />
                              <span>Pinning #{captures.length - index}</span>
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
        </div>
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
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation"
                  aria-label="Stäng"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
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
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">Precis GPS</div>
                        <div className="text-xs text-gray-400 mt-0.5">Väntar på bättre position (bra utomhus)</div>
                      </div>
                      <button
                        onClick={() => setPreciseGPS(!preciseGPS)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          preciseGPS ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preciseGPS ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {preciseGPS && (
                      <div className="mt-2 text-xs text-green-400">
                        ✓ Väntar tills GPS är ±10m eller max 15 sek
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
