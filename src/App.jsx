import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { 
  X, Plus,
  Loader, Filter, Search,
  Map as MapIcon, List, ArrowLeft, Target,
  MapPin, Eye, Sparkles, Globe, LogIn
} from 'lucide-react';

import { getObjectDistance as getObjectDistanceUtil } from './utils/geoUtils';

import { emailToKey } from './utils/iconHelpers';
import { STORAGE_KEYS } from './utils/storageKeys';
import { usePersistedState } from './utils/usePersistedState';
import { useAuth } from './utils/useAuth';
import { useObjects } from './utils/useObjects';
import { useFavorites } from './utils/useFavorites';
import { useSharing } from './utils/useSharing';
import { useDisplayObjects } from './utils/useDisplayObjects';
import { useSaveObject } from './utils/useSaveObject';
import { useCollectionActions } from './utils/useCollectionActions';
import { useToast } from './utils/useToast';
import { useContactActions } from './utils/useContactActions';
import { useDebounce } from './utils/useDebounce';

// Components
import ObjectCard from './components/ObjectCard';
import MapView from './components/MapView';
import AppHeader from './components/AppHeader';
import CapturesModal from './components/CapturesModal';
import AppMenu from './components/AppMenu';
import QuickCaptureObjectPicker from './components/QuickCaptureObjectPicker';

// Lazy load modals and heavy components for better initial load performance
const ShareModal = lazy(() => import('./components/ShareModal'));
const ContactsModal = lazy(() => import('./components/ContactsModal'));
const DeleteConfirmModal = lazy(() => import('./components/DeleteConfirmModal'));
const FocalPointPicker = lazy(() => import('./components/FocalPointPicker'));
const ObjectDetail = lazy(() => import('./components/ObjectDetail'));
const BlockEditor = lazy(() => import('./components/BlockEditor'));
const CreateObjectModal = lazy(() => import('./components/CreateObjectModal'));
const ObjectsAdminModal = lazy(() => import('./components/ObjectsAdminModal'));
const CategoryAdminModal = lazy(() => import('./components/CategoryAdminModal'));
const UsersAdminModal = lazy(() => import('./components/UsersAdminModal'));

// Loading fallback for lazy components
const ModalLoadingFallback = () => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center">
    <div className="bg-gray-900 rounded-xl p-6 flex items-center gap-3 border border-white/10">
      <Loader className="w-5 h-5 animate-spin text-blue-400" />
      <span className="text-white">Laddar...</span>
    </div>
  </div>
);
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from './firebase';
import { collection, updateDoc, deleteDoc, doc, Timestamp, getDoc, getDocs, setDoc } from 'firebase/firestore';

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function App() {
  // Global toast via context
  const toast = useToast();

  // --- Extracted hooks ---
  const {
    user, isAdmin, userApproved, appSettings,
    displayName, setDisplayName, sharedContacts, setSharedContacts,
    favoriteContacts, setFavoriteContacts, initialFavorites,
    handleLogin, handleLogout, handleSwitchAccount
  } = useAuth();

  const [showDemoObjects, setShowDemoObjects] = usePersistedState(STORAGE_KEYS.SHOW_DEMO_OBJECTS, false);

  const {
    objects, setObjects, loading,
    selectedObject, setSelectedObject
  } = useObjects(user, showDemoObjects);

  const {
    favorites, setFavorites, handleToggleFavorite, validFavoritesCount
  } = useFavorites(user, initialFavorites, objects);

  const {
    pendingInvitations, userEmailKey, userEmailLower,
    handleAcceptInvitation, handleRejectInvitation, handleLeaveShare
  } = useSharing(user, objects, displayName, setSelectedObject);

  const { saving, saveObject } = useSaveObject({
    user, isAdmin, userApproved, appSettings,
    objects, showDemoObjects, setSelectedObject
  });

  const {
    addToCollection, removeFromCollection, updateLinkedNote,
    addLinkedUrl, updateLinkedUrl, removeLinkedUrl, reorderLinked
  } = useCollectionActions(objects);

  const { addContact, toggleFavoriteContact } = useContactActions(
    user, sharedContacts, setSharedContacts, favoriteContacts, setFavoriteContacts
  );

  // --- Local UI state ---
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]); // Stack of previously viewed objects
  const [openPlannerOnReturn, setOpenPlannerOnReturn] = useState(false); // Flag to open planner when returning
  const [activeCategory, setActiveCategory] = usePersistedState(STORAGE_KEYS.ACTIVE_CATEGORY, 'all', { type: 'string' });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false); // Don't persist - avoids flash of empty list on reload
  const [showOnlyOwned, setShowOnlyOwned] = usePersistedState(STORAGE_KEYS.SHOW_ONLY_OWNED, false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingObject, setEditingObject] = useState(null);
  const [duplicatingObject, setDuplicatingObject] = useState(null);
  const [showAllObjects, setShowAllObjects] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [userLocation, setUserLocation] = useState(null);
  const [liveUserLocation, setLiveUserLocation] = useState(null);
  const [isGlobalTracking, setIsGlobalTracking] = useState(false);
  const [showShareModal, setShowShareModal] = useState(null); // Object to share
  const [sortByDistance, setSortByDistance] = usePersistedState(STORAGE_KEYS.SORT_BY_DISTANCE, false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const [maxDistanceKm, setMaxDistanceKm] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'collections' | 'objects'
  const [compactCards, setCompactCards] = usePersistedState(STORAGE_KEYS.COMPACT_CARDS, false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCategoryAdmin, setShowCategoryAdmin] = useState(false);
  const [showObjectsAdmin, setShowObjectsAdmin] = useState(false);
  const [showUsersAdmin, setShowUsersAdmin] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [captures, setCaptures] = usePersistedState(STORAGE_KEYS.CAPTURES, [], { type: 'json' });
  const [showCaptures, setShowCaptures] = useState(false);
  const [keepScreenOn, setKeepScreenOn] = usePersistedState(STORAGE_KEYS.KEEP_SCREEN_ON, false);
  const [showQuickCapture, setShowQuickCapture] = usePersistedState(STORAGE_KEYS.SHOW_QUICK_CAPTURE, false);
  const [quickCaptureObjectId, setQuickCaptureObjectId] = usePersistedState(STORAGE_KEYS.QUICK_CAPTURE_OBJECT_ID, '', { type: 'string' });
  const [showQuickCaptureObjectPicker, setShowQuickCaptureObjectPicker] = useState(false);
  const [quickCaptureSearchQuery, setQuickCaptureSearchQuery] = useState('');
  const [preciseGPS, setPreciseGPS] = usePersistedState(STORAGE_KEYS.PRECISE_GPS, false);
  // Menu section collapse states with localStorage
  const [menuAdminExpanded, setMenuAdminExpanded] = usePersistedState(STORAGE_KEYS.MENU_ADMIN_EXPANDED, false);
  const [menuSettingsExpanded, setMenuSettingsExpanded] = usePersistedState(STORAGE_KEYS.MENU_SETTINGS_EXPANDED, false);
  const [menuQuickCaptureExpanded, setMenuQuickCaptureExpanded] = usePersistedState(STORAGE_KEYS.MENU_QUICK_CAPTURE_EXPANDED, true, { defaultTrue: true });
  const [menuToolsExpanded, setMenuToolsExpanded] = usePersistedState(STORAGE_KEYS.MENU_TOOLS_EXPANDED, true, { defaultTrue: true });
  const [menuHelpExpanded, setMenuHelpExpanded] = usePersistedState(STORAGE_KEYS.MENU_HELP_EXPANDED, false);
  const [mapCenter, setMapCenter] = useState(null);
  const [returnToObjectId, setReturnToObjectId] = useState(null); // For "back to object" from map
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const seedingRef = useRef(false);
  const wakeLockRef = useRef(null);
  const globalTrackingWatchRef = useRef(null);


  // Wrapper to use imported distance function with userLocation state
  const getObjectDistance = useCallback(
    (obj) => getObjectDistanceUtil(obj, userLocation),
    [userLocation]
  );

  // Global GPS tracking functions for MapView
  const startGlobalTracking = () => {
    if (!('geolocation' in navigator)) return;
    
    setIsGlobalTracking(true);
    globalTrackingWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLiveUserLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.warn('Global tracking error:', error);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );
  };

  const stopGlobalTracking = () => {
    if (globalTrackingWatchRef.current !== null) {
      navigator.geolocation.clearWatch(globalTrackingWatchRef.current);
      globalTrackingWatchRef.current = null;
    }
    setIsGlobalTracking(false);
  };

  // Scroll to top when category changes to avoid white screen
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeCategory]);

  // Swipe between categories on mobile
  const touchStartRef = useRef(null);
  const categoryIds = useMemo(() => ['all', ...categories.map(c => c.id)], [categories]);

  const handleCategorySwipe = useCallback((direction) => {
    const currentIndex = categoryIds.indexOf(activeCategory);
    if (currentIndex === -1) return;
    if (direction === 'left' && currentIndex < categoryIds.length - 1) {
      setActiveCategory(categoryIds[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      setActiveCategory(categoryIds[currentIndex - 1]);
    }
  }, [categoryIds, activeCategory, setActiveCategory]);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullThreshold = 80;

  const onMainTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), scrollTop: window.scrollY };
  }, []);

  const onMainTouchMove = useCallback((e) => {
    if (!touchStartRef.current || isRefreshing) return;
    // Only pull-to-refresh when scrolled to top
    if (touchStartRef.current.scrollTop > 5) return;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    const dx = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    if (dy > 10 && dy > dx && window.scrollY <= 0) {
      const pull = Math.min(dy * 0.4, 120); // Damped pull
      setPullDistance(pull);
    }
  }, [isRefreshing]);

  const onMainTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Pull-to-refresh trigger
    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(0);
      if (navigator.vibrate) navigator.vibrate(10);
      // Data is real-time via Firestore, so just show a brief "refreshed" animation
      setTimeout(() => setIsRefreshing(false), 800);
      touchStartRef.current = null;
      return;
    }
    setPullDistance(0);

    touchStartRef.current = null;
    // Must be a quick, mostly-horizontal swipe
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 400) {
      handleCategorySwipe(dx < 0 ? 'left' : 'right');
    }
  }, [handleCategorySwipe, pullDistance]);

  // Wake Lock för att hålla skärmen påslagen
  useEffect(() => {
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

  // Handle bfcache (back-forward cache) - force page reload to avoid stale state
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        // Page was restored from bfcache – reload to get fresh state
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Clean up global GPS tracking on unmount
  useEffect(() => {
    return () => {
      if (globalTrackingWatchRef.current !== null) {
        navigator.geolocation.clearWatch(globalTrackingWatchRef.current);
      }
    };
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
  }, [showDemoObjects]); // Recalculate when demo bar appears/disappears

  // Warn before refresh/close when offline (prevents losing app access in the forest)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!navigator.onLine) {
        e.preventDefault();
        return 'Du är offline - om du lämnar sidan förlorar du tillgång till appen.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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

  // Fetch categories once at startup (they rarely change)
  useEffect(() => {
    let isCancelled = false;
    
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        if (!isCancelled) {
          const cats = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.order - b.order);
          setCategories(cats);
          setCategoriesLoaded(true);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        if (!isCancelled) {
          setCategoriesLoaded(true);
        }
      }
    };
    
    fetchCategories();
    
    return () => {
      isCancelled = true;
    };
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

  // Lock background scroll when any modal is open
  useEffect(() => {
    const hasModalOpen = !!selectedObject || !!showCreateModal || !!showMenu || !!showCategoryAdmin || !!showObjectsAdmin || !!showUsersAdmin || !!showCaptures;
    const previousOverflow = document.body.style.overflow;
    if (hasModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedObject, showCreateModal, showMenu, showCategoryAdmin, showObjectsAdmin, showUsersAdmin, showCaptures]);

  // Get pending tiebreaker challenges
  const pendingTiebreakerChallenges = useMemo(() => {
    if (!user) return [];
    return objects.flatMap(obj => {
      if (!obj.blocks) return [];
      return obj.blocks
        .map((block, blockIndex) => ({ block, blockIndex, obj }))
        .filter(({ block }) => block.type === 'tiebreaker' && block.data?.challenges && !block.data?.activeMatch)
        .flatMap(({ block, blockIndex, obj }) => {
          const challenges = block.data.challenges || {};
          const now = Date.now();
          return Object.entries(challenges)
            .filter(([_, challenge]) => {
              if (challenge.status !== 'pending') return false;
              const createdAt = challenge.createdAt?.toMillis?.() || challenge.createdAt || 0;
              if (createdAt && (now - createdAt) > 5 * 60 * 1000) return false;
              const toUid = challenge.to?.uid;
              const toEmail = challenge.to?.email?.toLowerCase();
              return toUid === user.uid || 
                     toUid === userEmailKey ||
                     (toEmail && toEmail === userEmailLower);
            })
            .map(([challengeId, challenge]) => ({
              challengeId,
              challenge,
              objectId: obj.id,
              objectName: obj.name,
              blockIndex,
              fromName: challenge.from?.name || 'Någon'
            }));
        });
    });
  }, [objects, user, userEmailKey, userEmailLower]);

  const { displayObjects, childCountMap, searchTerm } = useDisplayObjects({
    objects, categories, favorites, user,
    activeCategory, showFavoritesOnly, showOnlyOwned,
    viewFilter, searchQuery: debouncedSearchQuery, showAllObjects,
    maxDistanceKm, userLocation, sortByDistance,
    getObjectDistance
  });

  // Stable callback for navigating to map from ObjectCard
  const handleNavigateToMap = useCallback((coords) => {
    setViewMode('map');
    setMapCenter(coords);
    window.scrollTo(0, 0);
  }, []);

  // Stable callback for selecting an object from ObjectCard
  const handleSelectObject = useCallback((obj) => {
    setSelectedObject(obj);
  }, []);

  // Check if running as installed PWA (standalone mode)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;

  // Quick capture functions
  const handleQuickCapture = async () => {
    if (!userLocation) {
      toast.error('Ingen GPS-position! Vänta tills GPS har hittats.');
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
          toast.success(`Position tillagd till "${objectName}"!`);
          return;
        } catch (err) {
          console.error('Error adding location:', err);
          toast.error('Kunde inte lägga till position');
          return;
        }
      } else {
        toast.error('Valt objekt finns inte längre. Välj ett nytt i inställningar.');
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
    
    // Visual feedback
    toast.success(`Position sparad! (${newCaptures.length} st)`);
  };

  const handleDeleteCapture = (captureId) => {
    const newCaptures = captures.filter(c => c.id !== captureId);
    setCaptures(newCaptures);
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

  const handleBlockUpdate = useCallback(async (objectId, blockIndex, newBlockData) => {
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
  }, [objects]);

  const handleSaveObject = async (objectData, editId) => {
    const savedObjectId = await saveObject(objectData, editId);
    if (savedObjectId !== undefined && savedObjectId !== null) {
      setShowCreateModal(false);
      setEditingObject(null);
      setDefaultParentId(null);
    }
  };

  const handleDeleteObject = useCallback(async (id) => {
    try {
      // Find all descendants using ancestorIds
      const descendants = objects.filter(o => o.ancestorIds?.includes(id));
      
      // Delete all descendants first, then the object itself
      const allToDelete = [...descendants.map(d => d.id), id];
      
      // Find all collections that link to any of the deleted objects
      const collectionsToUpdate = objects.filter(o => 
        o.isCollection && 
        o.linkedObjectIds?.some(linkedId => allToDelete.includes(linkedId))
      );
      
      // Update collections to remove deleted object IDs
      await Promise.all([
        // Delete the objects
        ...allToDelete.map(objId => deleteDoc(doc(db, 'objects', objId))),
        // Clean up linkedObjectIds in collections
        ...collectionsToUpdate.map(collection => 
          updateDoc(doc(db, 'objects', collection.id), {
            linkedObjectIds: (collection.linkedObjectIds || []).filter(linkedId => !allToDelete.includes(linkedId)),
            updatedAt: Timestamp.now()
          })
        )
      ]);
    } catch (err) {
      console.error('Error deleting objects:', err);
      toast.error('Kunde inte ta bort!');
    }
  }, [objects, toast]);

  const handleEdit = useCallback((obj) => {
    if (!user) {
      toast.error('Du måste vara inloggad för att redigera!');
      return;
    }
    
    // Check if user can edit: owner, admin, or editor role
    const isOwner = obj.ownerId === user.uid;
    const userEmailKey = user.email ? emailToKey(user.email.toLowerCase()) : null;
    const shareRole = userEmailKey ? obj.shares?.[userEmailKey]?.role : null;
    const canEditObj = isOwner || isAdmin || shareRole === 'editor';
    
    if (obj.id && !canEditObj) {
      toast.error('Du har inte behörighet att redigera detta objekt!');
      return;
    }
    if (obj.parentId) {
      setDefaultParentId(obj.parentId);
    }
    setEditingObject(obj.id ? obj : null);
    setShowCreateModal(true);
    setSelectedObject(null);
  }, [user, isAdmin, toast]);

  const handleDuplicate = useCallback((obj) => {
    if (!user) {
      toast.error('Du måste vara inloggad för att kopiera!');
      return;
    }
    setDuplicatingObject(obj);
    setDefaultParentId(obj.parentId || null);
    setShowCreateModal(true);
    setSelectedObject(null);
  }, [user, toast]);

  if (loading || !categoriesLoaded) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">{!categoriesLoaded ? 'Laddar kategorier...' : 'Laddar dina platser...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
      style={{
         backgroundImage: `radial-gradient(circle at 15% 12%, rgba(59,130,246,0.20), transparent 35%),
                           radial-gradient(circle at 85% 8%, rgba(56,189,248,0.16), transparent 32%),
                           radial-gradient(circle at 50% 88%, rgba(59,130,246,0.14), transparent 36%),
                           linear-gradient(to bottom right, #06070c, #0b1220, #06070c)`
      }}
    >
      <AppHeader
        pendingTiebreakerChallenges={pendingTiebreakerChallenges}
        selectedObject={selectedObject}
        objects={objects}
        setSelectedObject={setSelectedObject}
        headerRef={headerRef}
        showDemoObjects={showDemoObjects}
        setShowDemoObjects={setShowDemoObjects}
        isAdmin={isAdmin}
        onOpenMenu={() => setShowMenu(true)}
        pendingInvitations={pendingInvitations}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        user={user}
        handleLogin={handleLogin}
        userEmailKey={userEmailKey}
        handleAcceptInvitation={handleAcceptInvitation}
        handleRejectInvitation={handleRejectInvitation}
        headerHeight={headerHeight}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        showFavoritesOnly={showFavoritesOnly}
        setShowFavoritesOnly={setShowFavoritesOnly}
        showOnlyOwned={showOnlyOwned}
        setShowOnlyOwned={setShowOnlyOwned}
        viewFilter={viewFilter}
        setViewFilter={setViewFilter}
        compactCards={compactCards}
        setCompactCards={setCompactCards}
        userLocation={userLocation}
        maxDistanceKm={maxDistanceKm}
        setMaxDistanceKm={setMaxDistanceKm}
        sortByDistance={sortByDistance}
        setSortByDistance={setSortByDistance}
        validFavoritesCount={validFavoritesCount}
      />
      
      <main
        className="max-w-6xl mx-auto px-4"
        onTouchStart={onMainTouchStart}
        onTouchMove={onMainTouchMove}
        onTouchEnd={onMainTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div className="flex justify-center pt-2 pb-1 transition-all" style={{ height: pullDistance > 0 ? pullDistance : 'auto' }}>
            <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/20 ${isRefreshing ? 'animate-spin' : ''}`}>
              <Loader size={16} className={`text-blue-400 transition-transform ${!isRefreshing ? `rotate-[${Math.min(pullDistance / pullThreshold * 360, 360)}deg]` : ''}`} 
                style={!isRefreshing ? { transform: `rotate(${Math.min(pullDistance / pullThreshold * 360, 360)}deg)` } : {}}
              />
            </div>
          </div>
        )}
        {viewMode === 'list' ? (
          <div className="pt-4 pb-8">
            <div className={`grid ${compactCards ? 'grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'}`}>
              {displayObjects.map(obj => {
                const childCount = childCountMap[obj.id] || 0;
                const distance = getObjectDistance(obj);
                const parent = obj.parentId ? objects.find(o => o.id === obj.parentId) : null;
                const isOrphanChild = obj.parentId && !parent;
                
                return (
                  <ObjectCard 
                    key={obj.id} 
                    object={obj} 
                    onClick={handleSelectObject} 
                    currentUser={user} 
                    childCount={childCount} 
                    distance={distance} 
                    categories={categories}
                    isFavorite={favorites.includes(obj.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isOrphanChild={isOrphanChild}
                    allObjects={objects}
                    showAsChild={!!obj.parentId && (searchTerm || isOrphanChild)}
                    compact={compactCards}
                    onNavigate={handleNavigateToMap}
                    onShare={setShowShareModal}
                  />
                );
              })}
            </div>
            {displayObjects.length === 0 && (
              <div className="text-center py-12 pt-8">
                {/* Search with category filter - suggest expanding search */}
                {searchTerm && activeCategory !== 'all' && activeCategory !== 'favorites' ? (
                  <div className="max-w-sm mx-auto px-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Search size={28} className="text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-lg font-medium mb-1">
                      Inga träffar för "{searchTerm}"
                    </p>
                    <p className="text-gray-500 text-sm mb-4">
                      i kategorin {categories.find(c => c.id === activeCategory)?.label || activeCategory}
                    </p>
                    <button
                      onClick={() => setActiveCategory('all')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all text-sm"
                    >
                      <Filter size={16} />
                      Sök i alla kategorier
                    </button>
                  </div>
                ) : !user && !showDemoObjects ? (
                  /* Not logged in – hero onboarding */
                  <div className="max-w-md mx-auto px-4">
                    <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] p-6 sm:p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                        <Globe size={26} className="text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">Din värld. Organiserad.</h3>
                      <p className="text-gray-400 text-sm mb-1.5 leading-relaxed">
                        Spara platser, samla idéer och planera upplevelser.
                      </p>
                      <p className="text-gray-500 text-sm mb-1.5 leading-relaxed">
                        Från restauranger och svampställen till resor, checklistor och projekt.
                      </p>
                      <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                        Dela med vänner och planera tillsammans – eller behåll allt för dig själv.
                      </p>
                      <div className="flex justify-center">
                        <button
                          onClick={handleLogin}
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all text-sm shadow-lg shadow-blue-500/20"
                        >
                          <LogIn size={16} />
                          <span>Logga in</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : user && !showFavoritesOnly && !showDemoObjects && objects.filter(o => o.ownerId === user.uid).length === 0 ? (
                  /* Logged in, no objects */
                  <div className="max-w-md mx-auto px-4">
                    <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] p-6 sm:p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-5">
                        <Sparkles size={26} className="text-blue-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Välkommen till OurSpots!</h3>
                      <p className="text-gray-400 text-sm mb-1.5 leading-relaxed">
                        Bygg dina egna objekt med block – text, listor, platser, bilder och mer.
                      </p>
                      <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                        Koppla ihop dem i samlingar och dela när ni vill planera tillsammans.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            setShowDemoObjects(true);
                            setShowOnlyOwned(false);
                            setShowFavoritesOnly(false);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-all text-sm"
                        >
                          <Eye size={16} />
                          <span>Se demo</span>
                        </button>
                        <button
                          onClick={() => { setEditingObject(null); setShowCreateModal(true); }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all text-sm shadow-lg shadow-blue-500/20"
                        >
                          <Plus size={16} />
                          <span>Skapa objekt</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <MapPin size={32} className="text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-lg font-medium">
                      {showFavoritesOnly ? 'Inga favoriter ännu' : 'Inga objekt hittades'}
                    </p>
                    <p className="text-gray-600 text-sm mt-2 max-w-xs mx-auto">
                      {showFavoritesOnly ? 'Markera objekt med stjärnan för att lägga till favoriter' :
                       'Tryck på + knappen för att skapa ditt första objekt'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <MapView objects={(() => {
            // Filter out objects with hideLocation categories
            let mapObjects = displayObjects.filter(obj => {
              const cat = categories.find(c => c.id === obj.type);
              return !cat?.hideLocation;
            });
            // Ensure the returnToObjectId object is included even if filtered out
            if (returnToObjectId && !mapObjects.find(o => o.id === returnToObjectId)) {
              const targetObj = objects.find(o => o.id === returnToObjectId);
              if (targetObj) {
                const cat = categories.find(c => c.id === targetObj.type);
                if (!cat?.hideLocation) {
                  mapObjects = [...mapObjects, targetObj];
                }
              }
            }
            return mapObjects;
          })()} onSelectObject={setSelectedObject} currentUser={user} userLocation={userLocation} categories={categories} mapCenter={mapCenter} showFilters={showFilters} isGlobalTracking={isGlobalTracking} startGlobalTracking={startGlobalTracking} stopGlobalTracking={stopGlobalTracking} liveUserLocation={liveUserLocation} setLiveUserLocation={setLiveUserLocation} />
        )}
      </main>

      {/* FAB container - constrained to max-w-6xl like main content */}
      {user && (
        <div className="fixed inset-x-0 bottom-0 pointer-events-none z-[1200]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-6xl mx-auto relative px-4">
            {/* Hide buttons when modals are open */}
            {!selectedObject && !showCreateModal && !showCategoryAdmin && !showObjectsAdmin && !showUsersAdmin && !showShareModal && (
              <>
                {/* + button - also hidden in demo mode for non-admins */}
                {!(showDemoObjects && !isAdmin) && (
                  <button 
                    onClick={() => { setEditingObject(null); setShowCreateModal(true); }} 
                    className="absolute bottom-6 right-2 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 pointer-events-auto"
                    title="Skapa nytt objekt"
                  >
                    <Plus size={26} strokeWidth={2.5} />
                  </button>
                )}
                {/* Back to object button - shows when we navigated to map from ObjectDetail */}
                {viewMode === 'map' && returnToObjectId && (
                  <button
                    onClick={() => {
                      const obj = objects.find(o => o.id === returnToObjectId);
                      if (obj) {
                        setSelectedObject(obj);
                      }
                      setViewMode('list'); // Go back to list view
                      setMapCenter(null);
                      setReturnToObjectId(null);
                    }}
                    className="absolute bottom-24 right-2 w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 backdrop-blur-sm rounded-2xl shadow-xl shadow-purple-500/30 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 pointer-events-auto"
                    title="Tillbaka till objekt"
                  >
                    <ArrowLeft size={22} />
                  </button>
                )}
                <button
                  onClick={() => {
                    const newMode = viewMode === 'list' ? 'map' : 'list';
                    setViewMode(newMode);
                    setReturnToObjectId(null); // Clear return state when manually toggling
                    if (newMode === 'map') {
                      window.scrollTo(0, 0);
                    } else {
                      // Clear mapCenter when leaving map view so next open focuses on user location
                      setMapCenter(null);
                    }
                  }}
                  className={`absolute right-2 w-14 h-14 bg-gray-900/90 hover:bg-gray-800 backdrop-blur-sm rounded-2xl shadow-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 border border-white/10 pointer-events-auto ${
                    viewMode === 'map' && returnToObjectId ? 'bottom-[10.5rem]' : 'bottom-24'
                  }`}
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
                className={`absolute right-2 w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all duration-300 pointer-events-auto ${
                  (selectedObject || showCreateModal || showCategoryAdmin || showObjectsAdmin || showShareModal) 
                    ? 'bottom-6' 
                    : viewMode === 'map' && returnToObjectId 
                      ? 'bottom-[15rem]' 
                      : 'bottom-[10.5rem]'
                }`}
                title="Snabbpinna GPS-position"
              >
                <Target size={22} />
                {captures.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {captures.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lazy-loaded modals wrapped in Suspense */}
      <Suspense fallback={<ModalLoadingFallback />}>
        {selectedObject && (
          <ObjectDetail 
            object={selectedObject} 
            onClose={() => { setSelectedObject(null); setNavigationHistory([]); }} 
            onEdit={handleEdit} 
            onDelete={handleDeleteObject} 
            onDuplicate={handleDuplicate}
            onBlockUpdate={handleBlockUpdate} 
            currentUser={user} 
            userDisplayName={displayName}
            userLocation={userLocation}
            showQuickCapture={showQuickCapture}
            preciseGPS={preciseGPS}
            allObjects={objects} 
            onNavigate={(obj, options = {}) => {
              if (options.fromPlanner) {
                setOpenPlannerOnReturn(true);
              }
              setNavigationHistory(prev => [...prev, selectedObject]);
              setSelectedObject(obj);
            }}
            onGoBack={navigationHistory.length > 0 ? () => {
              const prev = navigationHistory[navigationHistory.length - 1];
              setNavigationHistory(h => h.slice(0, -1));
              setSelectedObject(prev);
              // The planner will open via openPlannerOnReturn prop if set
            } : null}
            previousObject={navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null}
            openPlannerOnReturn={openPlannerOnReturn}
            onClearPlannerReturn={() => setOpenPlannerOnReturn(false)}
            categories={categories} 
            isAdmin={isAdmin}
            onShowOnMap={(coords, objectId) => {
              setReturnToObjectId(objectId || selectedObject?.id);
              setSelectedObject(null);
              setViewMode('map');
              setMapCenter(coords);
              window.scrollTo(0, 0);
            }}
            onShare={(obj) => setShowShareModal(obj)}
            onLeaveShare={handleLeaveShare}
            collections={objects.filter(o => o.isCollection && (o.ownerId === user?.uid || isAdmin))}
            onAddToCollection={addToCollection}
            onRemoveFromCollection={removeFromCollection}
            onUpdateLinkedNote={updateLinkedNote}
            onAddLinkedUrl={addLinkedUrl}
            onUpdateLinkedUrl={updateLinkedUrl}
            onRemoveLinkedUrl={removeLinkedUrl}
            onReorderLinked={reorderLinked}
          />
        )}

        {showCreateModal && (
          <CreateObjectModal 
            onClose={() => { setShowCreateModal(false); setEditingObject(null); setDefaultParentId(null); setDuplicatingObject(null); }} 
            onSave={handleSaveObject} 
            editObject={editingObject} 
            duplicateFromObject={duplicatingObject}
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
            isAdmin={isAdmin}
            currentUser={user}
            currentUserDisplayName={displayName}
            hasChildren={editingObject?.id ? objects.some(o => o.parentId === editingObject.id) : false}
            defaultCategory={activeCategory !== 'all' && activeCategory !== 'favorites' ? activeCategory : null}
            isDemoMode={showDemoObjects}
          />
        )}

        {showShareModal && (
          <ShareModal
            object={showShareModal}
            onClose={() => setShowShareModal(null)}
            currentUserEmail={user?.email?.toLowerCase()}
            allObjects={objects}
            sharedContacts={sharedContacts}
            favoriteContacts={favoriteContacts}
            onAddContact={addContact}
            onToggleFavoriteContact={toggleFavoriteContact}
          />
        )}

        {showContacts && (
          <ContactsModal
            onClose={() => setShowContacts(false)}
            currentUserEmail={user?.email?.toLowerCase()}
            objects={objects}
            favoriteContacts={favoriteContacts}
            onToggleFavoriteContact={toggleFavoriteContact}
            onNavigateToObject={(objectId) => {
              const obj = objects.find(o => o.id === objectId);
              if (obj) {
                setSelectedObject(obj);
              }
            }}
          />
        )}

        {showCategoryAdmin && (
          <CategoryAdminModal
            categories={categories}
            onClose={() => setShowCategoryAdmin(false)}
            currentUser={user}
            objects={objects}
            menuOpen={showMenu}
          />
        )}

        {showObjectsAdmin && (
          <ObjectsAdminModal
            objects={objects}
            categories={categories}
            onClose={() => setShowObjectsAdmin(false)}
            menuOpen={showMenu}
            onViewObject={(obj) => {
              // Add object to list temporarily if not already there (for admin viewing other users' objects)
              if (!objects.find(o => o.id === obj.id)) {
                setObjects(prev => [...prev, { ...obj, _adminView: true }]);
              }
              setSelectedObject(obj);
            }}
          />
        )}

        {showUsersAdmin && (
          <UsersAdminModal
            currentUserId={user?.uid}
            onClose={() => setShowUsersAdmin(false)}
            menuOpen={showMenu}
          />
        )}
      </Suspense>

      {/* Captures Modal */}
      {showCaptures && (
        <CapturesModal
          captures={captures}
          onDeleteCapture={handleDeleteCapture}
          onCreateFromCapture={handleCreateFromCapture}
          onClose={() => setShowCaptures(false)}
        />
      )}

      {showMenu && (
        <AppMenu
          onClose={() => { setShowMenu(false); setShowCategoryAdmin(false); setShowObjectsAdmin(false); setShowUsersAdmin(false); }}
          onCloseMenuOnly={() => setShowMenu(false)}
          user={user}
          isAdmin={isAdmin}
          displayName={displayName}
          setDisplayName={setDisplayName}
          keepScreenOn={keepScreenOn}
          setKeepScreenOn={setKeepScreenOn}
          preciseGPS={preciseGPS}
          setPreciseGPS={setPreciseGPS}
          showDemoObjects={showDemoObjects}
          setShowDemoObjects={setShowDemoObjects}
          setShowOnlyOwned={setShowOnlyOwned}
          setShowFavoritesOnly={setShowFavoritesOnly}
          showQuickCapture={showQuickCapture}
          setShowQuickCapture={setShowQuickCapture}
          quickCaptureObjectId={quickCaptureObjectId}
          objects={objects}
          categories={categories}
          captures={captures}
          onOpenQuickCapturePicker={() => {
            setQuickCaptureSearchQuery('');
            setShowQuickCaptureObjectPicker(true);
          }}
          onShowCaptures={() => setShowCaptures(true)}
          onShowCategoryAdmin={() => { setShowCategoryAdmin(true); setShowObjectsAdmin(false); setShowUsersAdmin(false); }}
          onShowObjectsAdmin={() => { setShowObjectsAdmin(true); setShowCategoryAdmin(false); setShowUsersAdmin(false); }}
          onShowUsersAdmin={() => { setShowUsersAdmin(true); setShowCategoryAdmin(false); setShowObjectsAdmin(false); }}
          showCategoryAdmin={showCategoryAdmin}
          showObjectsAdmin={showObjectsAdmin}
          showUsersAdmin={showUsersAdmin}
          onShowContacts={() => setShowContacts(true)}
          menuAdminExpanded={menuAdminExpanded}
          setMenuAdminExpanded={setMenuAdminExpanded}
          menuSettingsExpanded={menuSettingsExpanded}
          setMenuSettingsExpanded={setMenuSettingsExpanded}
          menuQuickCaptureExpanded={menuQuickCaptureExpanded}
          setMenuQuickCaptureExpanded={setMenuQuickCaptureExpanded}
          menuToolsExpanded={menuToolsExpanded}
          setMenuToolsExpanded={setMenuToolsExpanded}
          menuHelpExpanded={menuHelpExpanded}
          setMenuHelpExpanded={setMenuHelpExpanded}
          handleSwitchAccount={handleSwitchAccount}
          handleLogout={handleLogout}
          userLocation={userLocation}
        />
      )}
      
      {/* Quick Capture Object Picker Modal */}
      {showQuickCaptureObjectPicker && (
        <QuickCaptureObjectPicker
          objects={objects}
          categories={categories}
          user={user}
          quickCaptureObjectId={quickCaptureObjectId}
          quickCaptureSearchQuery={quickCaptureSearchQuery}
          onSearchChange={setQuickCaptureSearchQuery}
          onSelect={(id) => {
            setQuickCaptureObjectId(id);
            setShowQuickCaptureObjectPicker(false);
          }}
          onClose={() => setShowQuickCaptureObjectPicker(false)}
        />
      )}
    </div>
  );
}

export default App;
