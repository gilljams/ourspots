import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { 
  X, Plus, Image, Edit2, Trash2, 
  Loader, LogOut, LogIn, Check, Circle, Upload, 
  Map as MapIcon, List, ChevronDown, ArrowUp, ArrowDown, Search, Settings,
  Target, Lightbulb, SlidersHorizontal, Menu, Filter, Share2, UserPlus, UserMinus, Users, Mail,
  FileText, CheckSquare, ClipboardList, MapPin, Home, RotateCcw, Star, Navigation
} from 'lucide-react';

// Utils
import { 
  CLOUDINARY_CLOUD_NAME, 
  CLOUDINARY_UPLOAD_PRESET, 
  getTransformedImageUrl, 
  getFocalPointStyles, 
  resizeImage, 
  extractGPSFromImage 
} from './utils/imageUtils';
import { getDistance, getObjectDistance as getObjectDistanceUtil, formatDistance } from './utils/geoUtils';
import { createColoredIcon, createUserIcon, createAreaIcon } from './utils/mapIcons';
import { iconMap, getIconComponent, PREDEFINED_ICONS, emailToKey, keyToEmail } from './utils/iconHelpers';

// Components
import { 
  TitleBlock, LocationBlock, ImageBlock, TextBlock, 
  ChecklistBlock, TodoBlock, blockComponents, renderMarkdown 
} from './components/blocks';
import ObjectCard from './components/ObjectCard';
import MapPicker from './components/MapPicker';
import ShareModal from './components/ShareModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import FocalPointPicker from './components/FocalPointPicker';
import ObjectDetail from './components/ObjectDetail';
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

function ObjectsAdminModal({ objects: passedObjects, categories, onClose, onViewObject }) {
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
                          onViewObject(obj);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                      >
                        Visa
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

// Simple block editor with local state to avoid parent re-renders on each keystroke
function BlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title);
  const [content, setContent] = useState(block.content);
  
  const syncTitle = () => onUpdate(block.id, { title });
  const syncContent = () => onUpdate(block.id, { content });
  
  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
          {block.type === 'text' && <><FileText size={16} className="text-blue-400" /> Anteckning</>}
          {block.type === 'checklist' && <><CheckSquare size={16} className="text-green-400" /> Checklista</>}
          {block.type === 'todo' && <><ClipboardList size={16} className="text-amber-400" /> Att göra</>}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={() => onMove(block.id, -1)} disabled={index === 0} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ArrowUp size={14} />
          </button>
          <button type="button" onClick={() => onMove(block.id, 1)} disabled={index === total - 1} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ArrowDown size={14} />
          </button>
          <button type="button" onClick={() => onRemove(block.id)} className="w-7 h-7 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
      </div>
      <input
        type="text"
        defaultValue={block.title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={syncTitle}
        placeholder="Rubrik (valfritt)"
        disabled={saving}
        className="w-full px-3 py-2 mb-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
      <textarea
        defaultValue={block.content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={syncContent}
        placeholder={block.type === 'text' ? 'Skriv text här...' : 'En per rad'}
        rows={3}
        disabled={saving}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
      />
    </div>
  );
}

function CreateObjectModal({ onClose, onSave, editObject, saving, availableParents, defaultParentId, userLocation, categories, preciseGPS }) {
  // ========== STATE ==========
  const isEdit = !!editObject;
  const defaultType = defaultParentId 
    ? (availableParents.find(p => p.id === defaultParentId)?.type || categories[0]?.id || 'property') 
    : (categories[0]?.id || 'property');

  // Form state
  const [selectedType, setSelectedType] = useState(editObject?.type || defaultType);
  const [parentId, setParentId] = useState(editObject?.parentId || defaultParentId || '');
  const [inheritLocation, setInheritLocation] = useState(false);
  const [title, setTitle] = useState(editObject?.blocks?.find(b => b.type === 'title')?.data?.text || '');
  const [address, setAddress] = useState(editObject?.blocks?.find(b => b.type === 'location')?.data?.address || '');
  const [lat, setLat] = useState(editObject?.blocks?.find(b => b.type === 'location')?.data?.lat ?? null);
  const [lng, setLng] = useState(editObject?.blocks?.find(b => b.type === 'location')?.data?.lng ?? null);
  const [imageUrl, setImageUrl] = useState(editObject?.blocks?.find(b => b.type === 'image')?.data?.url || '');
  const [imageCropMode, setImageCropMode] = useState(editObject?.blocks?.find(b => b.type === 'image')?.data?.cropMode || 'auto');
  const [imageFocalPoint, setImageFocalPoint] = useState(editObject?.blocks?.find(b => b.type === 'image')?.data?.focalPoint || null);
  const [customBlocks, setCustomBlocks] = useState(() => {
    if (!editObject) return [];
    return editObject.blocks
      .filter(b => ['text', 'checklist', 'todo'].includes(b.type))
      .map(b => ({
        id: Math.random().toString(36).substr(2, 9),
        type: b.type,
        title: b.data.title || '',
        content: b.type === 'text' ? b.data.content : b.data.items.map(i => i.text).join('\n')
      }));
  });

  // UI state
  const [capturingGPS, setCapturingGPS] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showFocalPointPicker, setShowFocalPointPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const gpsWatchRef = useRef(null);
  
  // Track if form has been modified (simpler than deep comparison)
  const [formTouched, setFormTouched] = useState(false);

  // ========== COMPUTED ==========
  const selectedParent = availableParents.find(p => p.id === parentId);
  const parentHasLocation = selectedParent?.blocks?.some(b => b.type === 'location');
  
  // For edit mode, form is changed if it's been touched
  // For create mode, always allow submit
  const hasChanges = !isEdit || formTouched;

  // ========== CLEANUP ==========
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

  // ========== HANDLERS ==========
  const handleCategorySelect = (catId) => {
    setSelectedType(catId);
    setFormTouched(true);
  };

  const handleGPSCapture = () => {
    if (!navigator.geolocation) {
      alert('GPS stöds inte av din enhet');
      return;
    }
    if (capturingGPS) return;
    setCapturingGPS(true);
    setGpsAccuracy(null);

    if (preciseGPS) {
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
          if (accuracy <= 10) {
            navigator.geolocation.clearWatch(gpsWatchRef.current);
            setLat(position.coords.latitude);
            setLng(position.coords.longitude);
            setCapturingGPS(false);
            setGpsAccuracy(null);
            setFormTouched(true);
          }
        },
        (error) => {
          navigator.geolocation.clearWatch(gpsWatchRef.current);
          if (bestPosition) {
            setLat(bestPosition.coords.latitude);
            setLng(bestPosition.coords.longitude);
            setFormTouched(true);
          } else {
            alert('Kunde inte hämta position: ' + error.message);
          }
          setCapturingGPS(false);
          setGpsAccuracy(null);
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      );

      setTimeout(() => {
        if (gpsWatchRef.current && capturingGPS) {
          navigator.geolocation.clearWatch(gpsWatchRef.current);
          if (bestPosition) {
            setLat(bestPosition.coords.latitude);
            setLng(bestPosition.coords.longitude);
            setFormTouched(true);
          }
          setCapturingGPS(false);
          setGpsAccuracy(null);
        }
      }, 15000);
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          setCapturingGPS(false);
          setFormTouched(true);
        },
        (error) => {
          alert('Kunde inte hämta position: ' + error.message);
          setCapturingGPS(false);
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }
  };

  const handleMapSelect = (latitude, longitude) => {
    setLat(latitude);
    setLng(longitude);
    setShowMapPicker(false);
    setFormTouched(true);
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || uploadingImage) return;

    setUploadingImage(true);
    try {
      try {
        const gpsData = await extractGPSFromImage(file);
        if (gpsData && lat === null && lng === null) {
          setLat(gpsData.lat);
          setLng(gpsData.lng);
          setFormTouched(true);
        }
      } catch (e) { /* ignore */ }

      let fileToUpload = file;
      try {
        const resizedBlob = await resizeImage(file, 2000, 0.85);
        if (resizedBlob) fileToUpload = resizedBlob;
      } catch (e) { /* ignore */ }

      const formData = new FormData();
      formData.append('file', fileToUpload, file.name);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      setImageUrl(data.secure_url);
      setFormTouched(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      alert('Kunde inte ladda upp bild. Försök igen!');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('Titel måste fyllas i!');
      return;
    }

    const blocks = [{ type: 'title', data: { text: title.trim() } }];
    
    if (!inheritLocation && ((lat !== null && lng !== null) || address.trim())) {
      blocks.push({ 
        type: 'location', 
        data: { 
          lat: lat !== null ? Number(lat) : null,
          lng: lng !== null ? Number(lng) : null,
          address: address.trim() || (lat !== null && lng !== null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '')
        }
      });
    }

    if (imageUrl.trim()) {
      const imageData = { url: imageUrl.trim(), cropMode: imageCropMode };
      if (imageFocalPoint) imageData.focalPoint = imageFocalPoint;
      blocks.push({ type: 'image', data: imageData });
    }

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

    onSave({ type: selectedType, layerId: 'default', blocks, parentId: parentId || null }, isEdit ? editObject.id : null);
  };

  const addCustomBlock = (type) => {
    setCustomBlocks(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type, title: '', content: '' }]);
    setFormTouched(true);
  };

  const updateCustomBlock = (id, updates) => {
    setCustomBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    setFormTouched(true);
  };

  const removeCustomBlock = (id) => {
    setCustomBlocks(prev => prev.filter(b => b.id !== id));
    setFormTouched(true);
  };

  const moveCustomBlock = (id, delta) => {
    setCustomBlocks(prev => {
      const items = [...prev];
      const from = items.findIndex(b => b.id === id);
      const to = from + delta;
      if (from === -1 || to < 0 || to >= items.length) return prev;
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return items;
    });
    setFormTouched(true);
  };

  // ========== RENDER ==========
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 z-[1000] flex items-end sm:items-center justify-center sm:p-8"
        onClick={(e) => { if (!saving && e.target === e.currentTarget) onClose(); }}
      >
        {/* Modal */}
        <div className="bg-gray-900 sm:rounded-xl border-t sm:border border-white/10 w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-4 border-b border-white/10 flex items-center justify-between bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Plus size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{isEdit ? 'Redigera objekt' : 'Skapa nytt objekt'}</h2>
                <p className="text-xs text-gray-400">{isEdit ? 'Uppdatera detaljer' : 'Fyll i detaljer nedan'}</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              disabled={saving}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Category selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Välj kategori</label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(cat => {
                  const Icon = getIconComponent(cat.icon);
                  const isSelected = selectedType === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      disabled={saving}
                      className={`p-2.5 rounded-lg border-2 transition-colors ${isSelected ? 'border-blue-500 bg-blue-500/20' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                    >
                      <Icon size={20} className="mx-auto mb-1 text-blue-400" />
                      <div className="text-[10px] text-gray-300 truncate">{cat.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Titel *</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => { setTitle(e.target.value); setFormTouched(true); }} 
                placeholder="T.ex. Sommarstugan i Dalarna" 
                disabled={saving} 
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Parent selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Lägg under objekt (valfritt)</label>
              <select 
                value={parentId} 
                onChange={(e) => { setParentId(e.target.value); setFormTouched(true); }} 
                disabled={saving}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">- Inget parent-objekt -</option>
                {categories.map(category => {
                  const objectsInCategory = availableParents.filter(obj => obj.type === category.id);
                  if (objectsInCategory.length === 0) return null;
                  return (
                    <optgroup key={category.id} label={category.label}>
                      {objectsInCategory.map(obj => {
                        const objTitle = obj.blocks.find(b => b.type === 'title')?.data?.text || 'Namnlöst';
                        return <option key={obj.id} value={obj.id}>{objTitle}</option>;
                      })}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Inherit location checkbox */}
            {parentId && parentHasLocation && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <input 
                  type="checkbox" 
                  id="inheritLoc" 
                  checked={inheritLocation} 
                  onChange={(e) => { setInheritLocation(e.target.checked); setFormTouched(true); }}
                  disabled={saving}
                  className="w-4 h-4"
                />
                <label htmlFor="inheritLoc" className="text-sm text-gray-200">
                  Använd samma plats som {selectedParent?.blocks?.find(b => b.type === 'title')?.data?.text}
                </label>
              </div>
            )}

            {/* Location */}
            {!inheritLocation && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Plats</label>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={address} 
                    onChange={(e) => { setAddress(e.target.value); setFormTouched(true); }} 
                    placeholder="Skriv plats/beskrivning" 
                    disabled={saving} 
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleGPSCapture}
                      disabled={saving || capturingGPS}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 flex items-center justify-center gap-2"
                    >
                      <Navigation size={18} className={capturingGPS ? 'animate-pulse' : ''} />
                      <span className="text-sm">
                        {capturingGPS ? (gpsAccuracy ? `±${gpsAccuracy}m...` : 'Hämtar...') : 'Använd min plats'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(true)}
                      disabled={saving}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 flex items-center justify-center gap-2"
                    >
                      <MapIcon size={18} />
                      <span className="text-sm">Markera på karta</span>
                    </button>
                  </div>
                  {lat !== null && lng !== null && (
                    <div className="flex items-center justify-between text-xs text-gray-500 bg-white/5 p-2 rounded-lg">
                      <span>📍 {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                      <button
                        type="button"
                        onClick={() => { setLat(null); setLng(null); setFormTouched(true); }}
                        className="text-red-400 hover:text-red-300"
                      >
                        Rensa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Image */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bild</label>
              <div className="space-y-3">
                {imageUrl && (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImageUrl(''); setImageFocalPoint(null); setFormTouched(true); }}
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFocalPointPicker(true)}
                      className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs"
                    >
                      {imageFocalPoint ? 'Ändra fokus' : 'Justera'}
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 cursor-pointer flex items-center justify-center gap-2">
                    <Upload size={18} />
                    <span className="text-sm">{uploadingImage ? 'Laddar...' : 'Ladda upp'}</span>
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
                      const url = prompt('Klistra in bild-URL:');
                      if (url?.trim()) { setImageUrl(url.trim()); setFormTouched(true); }
                    }}
                    disabled={uploadingImage || saving}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm"
                  >
                    URL
                  </button>
                </div>
              </div>
            </div>

            {/* Custom blocks */}
            {customBlocks.map((block, index) => (
              <BlockEditor
                key={block.id}
                block={block}
                onUpdate={updateCustomBlock}
                onRemove={removeCustomBlock}
                onMove={moveCustomBlock}
                index={index}
                total={customBlocks.length}
                saving={saving}
              />
            ))}

            {/* Add block buttons */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs text-gray-500 uppercase mb-3">Lägg till block</div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => addCustomBlock('text')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                  <FileText size={16} className="text-blue-400" /> Anteckning
                </button>
                <button type="button" onClick={() => addCustomBlock('checklist')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                  <CheckSquare size={16} className="text-green-400" /> Checklista
                </button>
                <button type="button" onClick={() => addCustomBlock('todo')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                  <ClipboardList size={16} className="text-amber-400" /> Att göra
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 border-t border-white/10 bg-gray-900">
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={saving} 
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
              >
                Avbryt
              </button>
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={saving || (isEdit && !hasChanges)} 
                className={`flex-1 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                  isEdit && !hasChanges 
                    ? 'bg-gray-600 text-gray-400' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {saving ? (
                  <><Loader size={18} className="animate-spin" /> Sparar...</>
                ) : (
                  isEdit ? (hasChanges ? 'Uppdatera' : 'Inga ändringar') : 'Skapa objekt'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapPicker
          onSelect={handleMapSelect}
          onClose={() => setShowMapPicker(false)}
          initialPosition={lat && lng ? [lat, lng] : null}
          userLocation={userLocation}
        />
      )}

      {/* Focal Point Picker Modal */}
      {showFocalPointPicker && imageUrl && (
        <FocalPointPicker
          imageUrl={imageUrl}
          currentFocalPoint={imageFocalPoint}
          onSelect={(point) => { setImageFocalPoint(point); setShowFocalPointPicker(false); setFormTouched(true); }}
          onClose={() => setShowFocalPointPicker(false)}
        />
      )}
    </>
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

  // Wrapper to use imported distance function with userLocation state
  const getObjectDistance = (obj) => getObjectDistanceUtil(obj, userLocation);

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
    if (!user) {
      alert('Du måste vara inloggad för att redigera!');
      return;
    }
    
    // Check if user can edit: owner, admin, or editor role
    const isOwner = obj.ownerId === user.uid;
    const userEmailKey = user.email ? emailToKey(user.email.toLowerCase()) : null;
    const shareRole = userEmailKey ? obj.shares?.[userEmailKey]?.role : null;
    const canEditObj = isOwner || isAdmin || shareRole === 'editor';
    
    if (obj.id && !canEditObj) {
      alert('Du har inte behörighet att redigera detta objekt!');
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
          onViewObject={(obj) => {
            // Add object to list temporarily if not already there (for admin viewing other users' objects)
            if (!objects.find(o => o.id === obj.id)) {
              setObjects(prev => [...prev, { ...obj, _adminView: true }]);
            }
            setSelectedObject(obj);
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
