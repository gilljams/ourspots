import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { MapPin, Home, Coffee, Mountain, Star, Calendar, X, Plus, Image, Edit2, Trash2, Loader, LogOut, LogIn, Check, Circle, Upload, Folder, Navigation, Map as MapIcon, List, ChevronDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, Tooltip, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db, auth, googleProvider } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
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

const CATEGORY_COLORS = {
  '🏡': '#6B7280', // gray
  '🏠': '#6B7280', // gray
  '☕': '#92400E', // brown
  '🏞️': '#065F46', // green
  '⭐': '#F59E0B', // yellow/amber
  '✈️': '#3B82F6', // blue
};

const CLOUDINARY_CLOUD_NAME = 'dkpwqradh';
const CLOUDINARY_UPLOAD_PRESET = 'ourspots_unsigned';

const PREDEFINED_ICONS = {
  '🏡': { icon: Home, label: 'Fastighet' },
  '🏠': { icon: Home, label: 'Hus' },
  '☕': { icon: Coffee, label: 'Kafé' },
  '🏞️': { icon: Mountain, label: 'Natur' },
  '⭐': { icon: Star, label: 'Favorit' },
  '✈️': { icon: Calendar, label: 'Resa' }
};

const TitleBlock = ({ data }) => (
  <h2 className="text-2xl font-bold text-white mb-2">{data.text}</h2>
);

const LocationBlock = ({ data, inherited }) => (
  <div className="py-2 px-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
    <MapPin size={16} className="text-blue-400 flex-shrink-0" />
    <span className="text-xs text-gray-200">{data.address}</span>
    {inherited && <span className="text-xs text-gray-500 ml-auto">(från parent)</span>}
  </div>
);

const ImageBlock = ({ data }) => (
  <div className="w-full h-48 rounded-xl overflow-hidden mb-4 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)]">
    <img src={data.url} alt="" className="w-full h-full object-cover" />
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

  return (
    <div className="mb-4 rounded-2xl bg-white/10 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)] p-4">
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

  const totalItems = data.items.length;
  const doneItems = data.items.filter(item => item.done).length;
  const progress = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;

  return (
    <div className="mb-4 rounded-2xl bg-white/10 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">{doneItems}/{totalItems} klara</span>
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

function ObjectCard({ object, onClick, currentUser, childCount, distance }) {
  const IconComponent = PREDEFINED_ICONS[object.type]?.icon || Home;
  const titleBlock = object.blocks.find(b => b.type === 'title');
  const imageBlock = object.blocks.find(b => b.type === 'image');
  const locationBlock = object.blocks.find(b => b.type === 'location');
  const isOwner = currentUser && object.ownerId === currentUser.uid;
  const todoBlock = object.blocks.find(b => b.type === 'todo');
  let todoProgress = null;
  if (todoBlock) {
    const total = todoBlock.data.items.length;
    const done = todoBlock.data.items.filter(item => item.done).length;
    todoProgress = { done, total };
  }

  return (
    <div onClick={onClick} className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-blue-400/50 transition-all cursor-pointer transform hover:scale-[1.02] relative">
      {isOwner && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-blue-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">Ditt</div>
        </div>
      )}
      {childCount > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-white/10 backdrop-blur-sm text-gray-200 text-xs px-2 py-1 rounded-full border border-white/15 flex items-center gap-1">
            <Folder size={12} className="text-gray-300" />
            {childCount}
          </div>
        </div>
      )}
      {imageBlock && (
        <div className="w-full h-40 overflow-hidden">
          <img src={imageBlock.data.url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <IconComponent size={18} className="text-blue-400" />
          </div>
          {titleBlock && <h3 className="text-lg font-semibold text-white">{titleBlock.data.text}</h3>}
        </div>
        {locationBlock && (
          <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
            <MapPin size={14} />
            <span>{locationBlock.data.address}</span>
          </div>
        )}
        {distance !== undefined && (
          <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
            <MapPin size={14} />
            <span className="text-blue-400">{distance.toFixed(1)} km bort</span>
          </div>
        )}
        {todoProgress && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Circle size={12} className="text-green-400" />
            <span>{todoProgress.done}/{todoProgress.total} klara</span>
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

function ObjectDetail({ object, onClose, onEdit, onDelete, onBlockUpdate, currentUser, allObjects, onNavigate }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState(new Set([0])); // First block expanded by default
  const IconComponent = PREDEFINED_ICONS[object.type]?.icon || Home;
  const isOwner = currentUser && object.ownerId === currentUser.uid;
  
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
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[1000] overflow-hidden">
        <div className="min-h-screen p-4 flex items-start justify-center pt-20">
            <div className="bg-gray-950/95 backdrop-blur-xl rounded-3xl border border-white/15 max-w-2xl w-full p-6 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8)] max-h-[80vh] overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                {parentObject && (
                  <button
                    onClick={() => onNavigate(parentObject)}
                    className="text-gray-400 hover:text-white transition-all text-sm flex items-center gap-1"
                  >
                    ← {parentObject.blocks.find(b => b.type === 'title')?.data?.text || 'Parent'}
                  </button>
                )}
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <IconComponent size={24} className="text-blue-400" />
                </div>
                <span className="text-gray-400 text-sm">{PREDEFINED_ICONS[object.type]?.label}</span>
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
                            <img src={childImage.data.url} alt="" className="w-full h-full object-cover" />
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
            {childObjects.length === 0 && isOwner && (
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-3">
                <p className="text-gray-400 text-sm flex-1">Lägg till underobjekt:</p>
                <button
                  onClick={() => onEdit({ parentId: object.id })}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 hover:bg-blue-600 rounded-md sm:rounded-lg shadow-lg flex items-center justify-center text-white transition-all hover:scale-105"
                  title="Lägg till underobjekt"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
              {isOwner ? (
                <div className="flex gap-3">
                  <button onClick={() => onEdit(object)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all">
                    <Edit2 size={18} />
                    <span className="font-medium">Redigera</span>
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all">
                    <Trash2 size={18} />
                    <span className="font-medium">Ta bort</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-gray-500 text-sm">Du kan bara redigera objekt du har skapat</div>
              )}
              <div className="text-xs text-gray-500 space-y-1">
                <div>Objekt-ID: {object.id}</div>
                <div>Layer: {object.layerId}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showDeleteConfirm && <DeleteConfirmModal object={object} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />}
    </>
  );
}

function MapView({ objects, onSelectObject, currentUser }) {
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  const objectsWithLocation = objects.filter(obj => {
    const locationBlock = obj.blocks.find(b => b.type === 'location');
    return locationBlock && locationBlock.data.lat && locationBlock.data.lng;
  });

  const center = objectsWithLocation.length > 0
    ? [
        objectsWithLocation.reduce((sum, obj) => sum + obj.blocks.find(b => b.type === 'location').data.lat, 0) / objectsWithLocation.length,
        objectsWithLocation.reduce((sum, obj) => sum + obj.blocks.find(b => b.type === 'location').data.lng, 0) / objectsWithLocation.length
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
        className="absolute top-4 right-4 z-[500] p-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all flex items-center justify-center"
        title="Gå till min position"
      >
        <Navigation size={20} />
      </button>
    );
  }

  function MarkerWithPopup({ object }) {
    const locationBlock = object.blocks.find(b => b.type === 'location');
    const titleBlock = object.blocks.find(b => b.type === 'title');
    const position = [locationBlock.data.lat, locationBlock.data.lng];
    const markerColor = CATEGORY_COLORS[object.type] || '#3B82F6';
    const coloredIcon = createColoredIcon(markerColor);

    if (isTouchDevice) {
      return (
        <Marker position={position} icon={coloredIcon}>
          <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
            <div className="text-xs">
              <div className="font-semibold">{titleBlock?.data?.text || 'Namnlöst'}</div>
              <div className="text-gray-500">{PREDEFINED_ICONS[object.type]?.label}</div>
            </div>
          </Tooltip>
          <Popup>
            <div className="min-w-[180px]">
              <div className="text-sm font-semibold mb-1">{titleBlock?.data?.text || 'Namnlöst'}</div>
              <div className="text-xs text-gray-600 mb-2">{PREDEFINED_ICONS[object.type]?.label}</div>
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
            <div className="text-gray-500">{PREDEFINED_ICONS[object.type]?.label}</div>
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
    <div className="h-[calc(100vh-140px)] w-full relative z-0">
      <MapContainer center={center} zoom={objectsWithLocation.length > 0 ? 7 : 6} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          iconCreateFunction={createClusterIcon}
        >
          {objectsWithLocation.map(obj => (
            <MarkerWithPopup key={obj.id} object={obj} />
          ))}
        </MarkerClusterGroup>
        <CenterOnLocationButton />
      </MapContainer>
    </div>
  );
}

function MapPicker({ onSelect, onClose, initialPosition }) {
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

function CreateObjectModal({ onClose, onSave, editObject, saving, availableParents, defaultParentId }) {
  const isEdit = !!editObject;
  // Default type: use parent's type if defaultParentId is provided (for add-child flow)
  const defaultTypeFromParent = defaultParentId ? (availableParents.find(p => p.id === defaultParentId)?.type || '🏡') : '🏡';
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

    const blocks = [{ type: 'title', data: { text: title } }];
    if ((lat && lng) && !inheritLocation) {
      blocks.push({ type: 'location', data: { lat, lng, address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}` } });
    }
    if (imageUrl.trim()) blocks.push({ type: 'image', data: { url: imageUrl } });
    
    // Add custom blocks (text, checklist, todo) from array
    customBlocks.forEach(block => {
      if (block.content.trim()) {
        if (block.type === 'text') {
          blocks.push({ type: 'text', data: { title: block.title || 'Anteckning', content: block.content } });
        } else if (block.type === 'checklist') {
          const items = block.content.split('\n').filter(l => l.trim()).map(text => ({ text: text.trim(), checked: false }));
          if (items.length > 0) blocks.push({ type: 'checklist', data: { title: block.title || 'Checklista', items } });
        } else if (block.type === 'todo') {
          const items = block.content.split('\n').filter(l => l.trim()).map(text => ({ text: text.trim(), done: false }));
          if (items.length > 0) blocks.push({ type: 'todo', data: { title: block.title || 'Att göra', items } });
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

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
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
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(PREDEFINED_ICONS).map(([emoji, { icon: Icon, label }]) => (
                  <button key={emoji} type="button" onClick={() => setSelectedType(emoji)} disabled={saving} className={`p-4 rounded-xl border-2 transition-all ${selectedType === emoji ? 'border-blue-500 bg-blue-500/20' : 'border-white/10 bg-white/5 hover:border-white/20'} ${saving ? 'opacity-50' : ''}`}>
                    <Icon size={24} className="mx-auto mb-2 text-blue-400" />
                    <div className="text-xs text-gray-300">{label}</div>
                  </button>
                ))}
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
                {availableParents.map(obj => {
                  const titleBlock = obj.blocks.find(b => b.type === 'title');
                  return (
                    <option key={obj.id} value={obj.id} className="bg-gray-800 text-white">
                      {obj.type} {titleBlock?.data?.text || 'Namnlöst'}
                    </option>
                  );
                })}
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
                    <div className="text-xs text-gray-500 bg-white/5 p-2 rounded-lg">
                      📍 Koordinater: {lat.toFixed(5)}, {lng.toFixed(5)}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bild</label>
              <div className="space-y-3">
                {imageUrl && (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      disabled={uploadingImage || saving}
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-lg transition-all disabled:opacity-50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2">
                    <Upload size={18} />
                    <span className="text-sm font-medium">{uploadingImage ? 'Laddar...' : 'Ladda upp bild'}</span>
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
              {customBlocks.map((block) => (
                <div key={block.id}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      {block.type === 'text' && <>📝 Anteckning</>}
                      {block.type === 'checklist' && <><Check size={14} className="text-blue-400" /> Checklista</>}
                      {block.type === 'todo' && <><Circle size={14} className="text-green-400" /> Att göra</>}
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomBlocks(customBlocks.filter(b => b.id !== block.id))}
                      disabled={saving}
                      className="text-red-400 hover:text-red-300 text-sm transition-all disabled:opacity-50"
                    >
                      ✕ Ta bort
                    </button>
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
              ))}
            </div>

            {/* Add block buttons */}
            <div className="flex gap-1 flex-nowrap overflow-x-auto">
              <button
                type="button"
                onClick={() => setCustomBlocks([...customBlocks, { id: Math.random().toString(36).substr(2, 9), type: 'text', title: '', content: '' }])}
                disabled={saving}
                className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-xs transition-all disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                + Anteckning
              </button>
              <button
                type="button"
                onClick={() => setCustomBlocks([...customBlocks, { id: Math.random().toString(36).substr(2, 9), type: 'checklist', title: '', content: '' }])}
                disabled={saving}
                className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-xs transition-all disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                + Checklista
              </button>
              <button
                type="button"
                onClick={() => setCustomBlocks([...customBlocks, { id: Math.random().toString(36).substr(2, 9), type: 'todo', title: '', content: '' }])}
                disabled={saving}
                className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-xs transition-all disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                + Att göra
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-6 border-t border-white/10">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50">Avbryt</button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader size={18} className="animate-spin" /><span>Sparar...</span></> : <span>{isEdit ? 'Spara ändringar' : 'Skapa objekt'}</span>}
            </button>
          </div>
        </div>
      </div>
      {showMapPicker && (
        <MapPicker
          onSelect={handleMapSelect}
          onClose={() => setShowMapPicker(false)}
          initialPosition={lat && lng ? [lat, lng] : null}
        />
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingObject, setEditingObject] = useState(null);
  const [showAllObjects, setShowAllObjects] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [userLocation, setUserLocation] = useState(null);
  const [sortByDistance, setSortByDistance] = useState(false);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(64);

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

  const categories = [
    { id: 'all', label: 'Alla', icon: Star },
    { id: '🏡', label: 'Fastigheter', icon: Home },
    { id: '☕', label: 'Kaféer', icon: Coffee },
    { id: '🏞️', label: 'Natur', icon: Mountain }
  ];

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
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
    const unsub = onSnapshot(collection(db, 'objects'), (snap) => {
      setObjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedObject) return;
    const fresh = objects.find(o => o.id === selectedObject.id);
    if (fresh) {
      setSelectedObject(fresh);
    } else {
      setSelectedObject(null);
    }
  }, [objects, selectedObject ? selectedObject.id : null]);

  // Lock background scroll when any modal is open
  useEffect(() => {
    const hasModalOpen = !!selectedObject || !!showCreateModal;
    const previousOverflow = document.body.style.overflow;
    if (hasModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedObject, showCreateModal]);

  const filteredObjects = activeCategory === 'all' ? objects : objects.filter(o => o.type === activeCategory);
  let displayObjects = showAllObjects ? filteredObjects : filteredObjects.filter(o => !o.parentId);
  
  // Apply distance sorting if enabled
  if (sortByDistance && userLocation) {
    displayObjects = [...displayObjects].sort((a, b) => {
      const locBlockA = a.blocks?.find(b => b.type === 'location');
      const locBlockB = b.blocks?.find(b => b.type === 'location');
      const distA = (locBlockA?.data?.lat && locBlockA?.data?.lng) ? getDistance(userLocation.lat, userLocation.lng, locBlockA.data.lat, locBlockA.data.lng) : Infinity;
      const distB = (locBlockB?.data?.lat && locBlockB?.data?.lng) ? getDistance(userLocation.lat, userLocation.lng, locBlockB.data.lat, locBlockB.data.lng) : Infinity;
      return distA - distB;
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
      if (editId) {
        await updateDoc(doc(db, 'objects', editId), { ...objectData, updatedAt: Timestamp.now() });
      } else {
        await addDoc(collection(db, 'objects'), { 
          ...objectData, 
          ownerId: user.uid, 
          ownerName: user.displayName, 
          ownerEmail: user.email, 
          createdAt: Timestamp.now(), 
          updatedAt: Timestamp.now() 
        });
      }
      setShowCreateModal(false);
      setEditingObject(null);
      setSelectedObject(null);
    } catch (err) {
      alert('Kunde inte spara!');
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

  if (loading) {
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
          <div>
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
              {categories.map(cat => {
                const IconComponent = cat.icon;
                return (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-blue-500 text-white' : 'bg-white/20 text-gray-200 hover:bg-white/30'}`}>
                    <IconComponent size={16} />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>
            {userLocation && (
              <button 
                onClick={() => setSortByDistance(!sortByDistance)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all text-sm font-medium ${sortByDistance ? 'bg-purple-500/80 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                title={sortByDistance ? 'Sorterat efter avstånd' : 'Sortera efter avstånd'}
              >
                <Navigation size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        {viewMode === 'list' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayObjects.map(obj => {
                const childCount = objects.filter(o => o.parentId === obj.id).length;
                let distance = undefined;
                if (userLocation) {
                  const locBlock = obj.blocks?.find(b => b.type === 'location');
                  if (locBlock?.data?.lat && locBlock?.data?.lng) {
                    distance = getDistance(userLocation.lat, userLocation.lng, locBlock.data.lat, locBlock.data.lng);
                  }
                }
                return (
                  <ObjectCard key={obj.id} object={obj} onClick={() => setSelectedObject(obj)} currentUser={user} childCount={childCount} distance={distance} />
                );
              })}
            </div>
            {displayObjects.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <p>Inga objekt hittades i denna kategori</p>
                {user && <p className="text-sm mt-2">Klicka på + knappen för att skapa ditt första objekt!</p>}
                {!user && <p className="text-sm mt-2">Logga in för att skapa objekt!</p>}
              </div>
            )}
          </>
        ) : (
          <MapView objects={displayObjects} onSelectObject={setSelectedObject} currentUser={user} />
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
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            className="fixed bottom-24 right-6 w-14 h-14 bg-gray-800 hover:bg-gray-700 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 z-[1200] border border-white/10"
            title={viewMode === 'list' ? 'Visa karta' : 'Visa lista'}
          >
            {viewMode === 'list' ? <MapIcon size={24} /> : <List size={24} />}
          </button>
        </>
      )}

      {selectedObject && (
        <ObjectDetail object={selectedObject} onClose={() => setSelectedObject(null)} onEdit={handleEdit} onDelete={handleDeleteObject} onBlockUpdate={handleBlockUpdate} currentUser={user} allObjects={objects} onNavigate={(obj) => setSelectedObject(obj)} />
      )}

      {showCreateModal && (
        <CreateObjectModal onClose={() => { setShowCreateModal(false); setEditingObject(null); setDefaultParentId(null); }} onSave={handleSaveObject} editObject={editingObject} saving={saving} availableParents={objects.filter(o => o.id !== editingObject?.id)} defaultParentId={defaultParentId} />
      )}
    </div>
  );
}

export default App;