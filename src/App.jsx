import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { 
  X, Plus,
  Loader, LogIn, Check,
  Map as MapIcon, List, ArrowLeft, Search,
  Target, SlidersHorizontal, Menu, Filter, Users, Mail, User,
  MapPin, Star, Navigation, Eye, AlertTriangle,
  LayoutGrid, LayoutList, ArrowUpDown, Sparkles, Swords
} from 'lucide-react';

import { getObjectDistance as getObjectDistanceUtil } from './utils/geoUtils';

import { getIconComponent, emailToKey } from './utils/iconHelpers';
import { STORAGE_KEYS } from './utils/storageKeys';
import { usePersistedState } from './utils/usePersistedState';
import { useAuth } from './utils/useAuth';
import { useObjects } from './utils/useObjects';
import { useFavorites } from './utils/useFavorites';
import { useSharing } from './utils/useSharing';
import { useDisplayObjects } from './utils/useDisplayObjects';

// Components
import { blockComponents } from './components/blocks';
import ObjectCard from './components/ObjectCard';
import MapPicker from './components/MapPicker';
import MapView from './components/MapView';
import InvitationsDropdown from './components/InvitationsDropdown';
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
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, getDoc, getDocs, setDoc, deleteField, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function App() {
  const [saving, setSaving] = useState(false);
  const [toast, setToastInternal] = useState(null); // { message, type: 'success' | 'error' | 'info', key }
  // Wrapper to add unique key for proper timer reset on repeated toasts
  const setToast = (value) => setToastInternal(value ? { ...value, key: Date.now() } : null);

  // --- Extracted hooks ---
  const {
    user, isAdmin, userApproved, appSettings,
    displayName, setDisplayName, sharedContacts, setSharedContacts,
    favoriteContacts, setFavoriteContacts, initialFavorites,
    handleLogin, handleLogout, handleSwitchAccount
  } = useAuth(setToast);

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
  } = useSharing(user, objects, displayName, setToast, setSelectedObject);

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
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'collections' | 'objects'
  const [compactCards, setCompactCards] = usePersistedState(STORAGE_KEYS.COMPACT_CARDS, false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
  const [showCategoryAdmin, setShowCategoryAdmin] = useState(false);
  const [showObjectsAdmin, setShowObjectsAdmin] = useState(false);
  const [showUsersAdmin, setShowUsersAdmin] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
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
  const [menuSettingsExpanded, setMenuSettingsExpanded] = usePersistedState(STORAGE_KEYS.MENU_SETTINGS_EXPANDED, true, { defaultTrue: true });
  const [menuQuickCaptureExpanded, setMenuQuickCaptureExpanded] = usePersistedState(STORAGE_KEYS.MENU_QUICK_CAPTURE_EXPANDED, true, { defaultTrue: true });
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
        console.log('Global tracking error:', error);
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

  // Auto-dismiss toast after 3 seconds (key ensures timer resets on repeated toasts)
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToastInternal(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast?.key]);

  // Scroll to top when category changes to avoid white screen
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeCategory]);

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
        // Page was restored from bfcache - reload to get fresh state
        console.log('Page restored from bfcache, reloading...');
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
    viewFilter, searchQuery, showAllObjects,
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
      setToast({ message: 'Ingen GPS-position! Vänta tills GPS har hittats.', type: 'error' });
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
          setToast({ message: `Position tillagd till "${objectName}"!`, type: 'success' });
          return;
        } catch (err) {
          console.error('Error adding location:', err);
          setToast({ message: 'Kunde inte lägga till position', type: 'error' });
          return;
        }
      } else {
        setToast({ message: 'Valt objekt finns inte längre. Välj ett nytt i inställningar.', type: 'error' });
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
    setToast({ message: `Position sparad! (${newCaptures.length} st)`, type: 'success' });
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
    if (!user) {
      setToast({ message: 'Du måste vara inloggad!', type: 'error' });
      return;
    }
    
    // Check object limit for new objects (not edits) - admins have no limit
    if (!editId && !isAdmin) {
      const ownedObjectsCount = objects.filter(o => o.ownerId === user.uid).length;
      const limit = userApproved ? appSettings.approvedObjectLimit : appSettings.defaultObjectLimit;
      
      if (ownedObjectsCount >= limit) {
        if (!userApproved) {
          setToast({ message: `Du har nått gränsen på ${limit} objekt. Kontakta en administratör för att få ditt konto godkänt och utökat.`, type: 'error' });
        } else {
          setToast({ message: `Du har nått din gräns på ${limit} objekt.`, type: 'error' });
        }
        return;
      }
    }
    
    setSaving(true);
    try {
      let savedObjectId = editId;
      
      // Build parent path for breadcrumb display AND ancestor IDs for fast lookups
      const buildAncestorData = (parentId) => {
        if (!parentId) return { parentPath: [], ancestorIds: [] };
        const path = [];
        const ids = [];
        let currentId = parentId;
        let depth = 0;
        while (currentId && depth < 10) {
          const p = objects.find(o => o.id === currentId);
          if (p) {
            const name = p.blocks?.find(b => b.type === 'title')?.data?.text;
            if (name) path.unshift(name);
            ids.unshift(currentId); // Add ID to ancestor list
            currentId = p.parentId;
          } else {
            break;
          }
          depth++;
        }
        return { parentPath: path, ancestorIds: ids };
      };
      
      const { parentPath, ancestorIds } = buildAncestorData(objectData.parentId);
      const dataWithPath = { ...objectData, parentPath, ancestorIds };
      
      // Check if parent has shares with includeChildren - inherit them for new children
      let inheritedShares = {};
      let inheritedSharedWithEmails = [];
      let inheritedAcceptedShareEmails = []; // For inherited shares - auto-accepted
      let inheritedEditorEmails = [];
      if (!editId && objectData.parentId) {
        const parent = objects.find(o => o.id === objectData.parentId);
        if (parent?.shares) {
          // Find shares that have includeChildren enabled
          Object.entries(parent.shares).forEach(([emailKey, shareData]) => {
            if (shareData.includeChildren) {
              inheritedShares[emailKey] = {
                ...shareData,
                status: 'inherited', // Use 'inherited' status - no notification needed
                includeChildren: false, // Children don't cascade further
                inheritedFrom: objectData.parentId
              };
              if (shareData.email) {
                const emailLower = shareData.email.toLowerCase();
                inheritedSharedWithEmails.push(emailLower);
                inheritedAcceptedShareEmails.push(emailLower); // Inherited = auto-accepted
                if (shareData.role === 'editor') {
                  inheritedEditorEmails.push(emailLower);
                }
              }
            }
          });
        }
      }
      
      if (editId) {
        // Check if parent changed - need to update descendants' ancestorIds and shares
        const existingObj = objects.find(o => o.id === editId);
        const parentChanged = existingObj?.parentId !== objectData.parentId;
        const oldParentId = existingObj?.parentId;
        const newParentId = objectData.parentId;
        
        // Build shares update data if parent changed
        let sharesUpdateData = {};
        if (parentChanged) {
          // Find old inherited shares (from old ancestors) that need to be removed
          const oldAncestorIds = existingObj?.ancestorIds || [];
          const sharesToRemove = {};
          const emailsToRemove = [];
          
          if (existingObj?.shares) {
            Object.entries(existingObj.shares).forEach(([emailKey, shareData]) => {
              // Remove inherited shares that came from old ancestors
              if (shareData.status === 'inherited' && oldAncestorIds.includes(shareData.inheritedFrom)) {
                sharesToRemove[emailKey] = deleteField();
                if (shareData.email) {
                  emailsToRemove.push(shareData.email.toLowerCase());
                }
              }
            });
          }
          
          // Find new inherited shares from new parent
          const newInheritedShares = {};
          const newInheritedEmails = [];
          const newInheritedEditorEmails = [];
          
          if (newParentId) {
            const newParent = objects.find(o => o.id === newParentId);
            if (newParent?.shares) {
              Object.entries(newParent.shares).forEach(([emailKey, shareData]) => {
                if (shareData.includeChildren && (shareData.status === 'accepted' || shareData.status === 'inherited')) {
                  newInheritedShares[emailKey] = {
                    ...shareData,
                    status: 'inherited',
                    includeChildren: false,
                    inheritedFrom: newParentId
                  };
                  if (shareData.email) {
                    const emailLower = shareData.email.toLowerCase();
                    newInheritedEmails.push(emailLower);
                    if (shareData.role === 'editor') {
                      newInheritedEditorEmails.push(emailLower);
                    }
                  }
                }
              });
            }
          }
          
          // Build the shares update
          Object.keys(sharesToRemove).forEach(key => {
            sharesUpdateData[`shares.${key}`] = deleteField();
          });
          Object.entries(newInheritedShares).forEach(([key, data]) => {
            sharesUpdateData[`shares.${key}`] = data;
          });
          
          // Update array fields for removed emails
          if (emailsToRemove.length > 0) {
            sharesUpdateData.sharedWithEmails = arrayRemove(...emailsToRemove);
            sharesUpdateData.acceptedShareEmails = arrayRemove(...emailsToRemove);
            sharesUpdateData.editorEmails = arrayRemove(...emailsToRemove);
          }
        }
        
        // Update existing object
        const updatePayload = { ...dataWithPath, updatedAt: Timestamp.now(), ...sharesUpdateData };
        await updateDoc(doc(db, 'objects', editId), updatePayload);
        
        // If new inherited emails, add them (separate update to handle arrayUnion after arrayRemove)
        if (parentChanged && newParentId) {
          const newParent = objects.find(o => o.id === newParentId);
          if (newParent?.shares) {
            const emailsToAdd = [];
            const editorEmailsToAdd = [];
            Object.entries(newParent.shares).forEach(([emailKey, shareData]) => {
              if (shareData.includeChildren && (shareData.status === 'accepted' || shareData.status === 'inherited')) {
                if (shareData.email) {
                  emailsToAdd.push(shareData.email.toLowerCase());
                  if (shareData.role === 'editor') {
                    editorEmailsToAdd.push(shareData.email.toLowerCase());
                  }
                }
              }
            });
            if (emailsToAdd.length > 0) {
              const addPayload = {
                sharedWithEmails: arrayUnion(...emailsToAdd),
                acceptedShareEmails: arrayUnion(...emailsToAdd)
              };
              if (editorEmailsToAdd.length > 0) {
                addPayload.editorEmails = arrayUnion(...editorEmailsToAdd);
              }
              await updateDoc(doc(db, 'objects', editId), addPayload);
            }
          }
        }
        
        // If parent changed, update all descendants' ancestorIds AND shares
        if (parentChanged) {
          const descendants = objects.filter(o => o.ancestorIds?.includes(editId));
          if (descendants.length > 0) {
            // New ancestor path for the edited object
            const newAncestorBase = [...ancestorIds, editId];
            // Old ancestors that are no longer in the chain
            const oldAncestorIds = existingObj?.ancestorIds || [];
            
            // Get new inherited shares from the moved object's new ancestor chain
            const newInheritedSharesForDesc = {};
            const newInheritedEmailsForDesc = [];
            const newInheritedEditorEmailsForDesc = [];
            
            // Check all new ancestors for shares with includeChildren
            for (const ancId of ancestorIds) {
              const ancestor = objects.find(o => o.id === ancId);
              if (ancestor?.shares) {
                Object.entries(ancestor.shares).forEach(([emailKey, shareData]) => {
                  if (shareData.includeChildren && (shareData.status === 'accepted' || shareData.status === 'inherited')) {
                    if (!newInheritedSharesForDesc[emailKey]) {
                      newInheritedSharesForDesc[emailKey] = {
                        ...shareData,
                        status: 'inherited',
                        includeChildren: false,
                        inheritedFrom: ancId
                      };
                      if (shareData.email) {
                        const emailLower = shareData.email.toLowerCase();
                        if (!newInheritedEmailsForDesc.includes(emailLower)) {
                          newInheritedEmailsForDesc.push(emailLower);
                          if (shareData.role === 'editor') {
                            newInheritedEditorEmailsForDesc.push(emailLower);
                          }
                        }
                      }
                    }
                  }
                });
              }
            }
            
            await Promise.all(descendants.map(async (desc) => {
              // Find where editId is in the descendant's ancestorIds
              const editIdIndex = desc.ancestorIds.indexOf(editId);
              if (editIdIndex !== -1) {
                // Replace everything before editId with new ancestor path
                const descendantSuffix = desc.ancestorIds.slice(editIdIndex + 1);
                const newDescAncestorIds = [...newAncestorBase, ...descendantSuffix];
                
                // Also rebuild parentPath names
                const newParentPath = [];
                for (const ancId of newDescAncestorIds) {
                  const anc = objects.find(o => o.id === ancId);
                  if (anc) {
                    const name = anc.blocks?.find(b => b.type === 'title')?.data?.text;
                    if (name) newParentPath.push(name);
                  }
                }
                
                // Build shares update for descendant
                const descSharesUpdate = {};
                const descEmailsToRemove = [];
                
                // Remove inherited shares from old ancestors
                if (desc.shares) {
                  Object.entries(desc.shares).forEach(([emailKey, shareData]) => {
                    if (shareData.status === 'inherited' && oldAncestorIds.includes(shareData.inheritedFrom)) {
                      descSharesUpdate[`shares.${emailKey}`] = deleteField();
                      if (shareData.email) {
                        descEmailsToRemove.push(shareData.email.toLowerCase());
                      }
                    }
                  });
                }
                
                // Add new inherited shares
                Object.entries(newInheritedSharesForDesc).forEach(([key, data]) => {
                  descSharesUpdate[`shares.${key}`] = data;
                });
                
                const descUpdatePayload = {
                  ancestorIds: newDescAncestorIds,
                  parentPath: newParentPath,
                  ...descSharesUpdate
                };
                
                if (descEmailsToRemove.length > 0) {
                  descUpdatePayload.sharedWithEmails = arrayRemove(...descEmailsToRemove);
                  descUpdatePayload.acceptedShareEmails = arrayRemove(...descEmailsToRemove);
                  descUpdatePayload.editorEmails = arrayRemove(...descEmailsToRemove);
                }
                
                await updateDoc(doc(db, 'objects', desc.id), descUpdatePayload);
                
                // Add new emails (separate update)
                if (newInheritedEmailsForDesc.length > 0) {
                  const addPayload = {
                    sharedWithEmails: arrayUnion(...newInheritedEmailsForDesc),
                    acceptedShareEmails: arrayUnion(...newInheritedEmailsForDesc)
                  };
                  if (newInheritedEditorEmailsForDesc.length > 0) {
                    addPayload.editorEmails = arrayUnion(...newInheritedEditorEmailsForDesc);
                  }
                  await updateDoc(doc(db, 'objects', desc.id), addPayload);
                }
              }
            }));
          }
        }
      } else {
        // Create new - use Promise.race with timeout
        const newObjectData = { 
          ...dataWithPath, 
          ownerId: user.uid, 
          ownerName: user.displayName, 
          ownerEmail: user.email, 
          createdAt: Timestamp.now(), 
          updatedAt: Timestamp.now(),
          isCollection: objectData.isCollection || false,
          linkedObjectIds: objectData.linkedObjectIds || [],
          linkedUrls: objectData.linkedUrls || [],
          linkedOrder: objectData.linkedOrder || [],
          whatsappGroupUrl: objectData.whatsappGroupUrl || null,
          // Demo objects: auto-create as demo when admin is in demo mode
          ...(isAdmin && showDemoObjects ? { isDemo: true } : {})
          // Note: linkedObjectNotes is NOT copied - it contains time-specific info
        };
        
        // Add inherited shares if any
        if (Object.keys(inheritedShares).length > 0) {
          newObjectData.shares = inheritedShares;
          newObjectData.sharedWithEmails = inheritedSharedWithEmails;
          newObjectData.acceptedShareEmails = inheritedAcceptedShareEmails;
          if (inheritedEditorEmails.length > 0) {
            newObjectData.editorEmails = inheritedEditorEmails;
          }
        }
        
        const addOperation = addDoc(collection(db, 'objects'), newObjectData);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        
        const docRef = await Promise.race([addOperation, timeoutPromise]);
        savedObjectId = docRef.id;
      }
      
      setShowCreateModal(false);
      setEditingObject(null);
      setDefaultParentId(null);
      
      // Show the saved object - fetch fresh from Firestore to ensure we have latest data
      if (savedObjectId) {
        try {
          const freshDoc = await getDoc(doc(db, 'objects', savedObjectId));
          if (freshDoc.exists()) {
            setSelectedObject({ id: freshDoc.id, ...freshDoc.data() });
          }
        } catch (fetchErr) {
          console.error('Error fetching saved object:', fetchErr);
          // Fallback to local objects if fetch fails
          const savedObj = objects.find(o => o.id === savedObjectId);
          if (savedObj) {
            setSelectedObject(savedObj);
          }
        }
      }
    } catch (err) {
      console.error('Save error:', err);
      setToast({ message: err.message === 'Timeout' ? 'Sparningen tog för lång tid. Försök igen.' : 'Kunde inte spara!', type: 'error' });
    } finally {
      setSaving(false);
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
      setToast({ message: 'Kunde inte ta bort!', type: 'error' });
    }
  }, [objects, setToast]);

  const handleEdit = useCallback((obj) => {
    if (!user) {
      setToast({ message: 'Du måste vara inloggad för att redigera!', type: 'error' });
      return;
    }
    
    // Check if user can edit: owner, admin, or editor role
    const isOwner = obj.ownerId === user.uid;
    const userEmailKey = user.email ? emailToKey(user.email.toLowerCase()) : null;
    const shareRole = userEmailKey ? obj.shares?.[userEmailKey]?.role : null;
    const canEditObj = isOwner || isAdmin || shareRole === 'editor';
    
    if (obj.id && !canEditObj) {
      setToast({ message: 'Du har inte behörighet att redigera detta objekt!', type: 'error' });
      return;
    }
    if (obj.parentId) {
      setDefaultParentId(obj.parentId);
    }
    setEditingObject(obj.id ? obj : null);
    setShowCreateModal(true);
    setSelectedObject(null);
  }, [user, isAdmin, setToast]);

  const handleDuplicate = useCallback((obj) => {
    if (!user) {
      setToast({ message: 'Du måste vara inloggad för att kopiera!', type: 'error' });
      return;
    }
    setDuplicatingObject(obj);
    setDefaultParentId(obj.parentId || null);
    setShowCreateModal(true);
    setSelectedObject(null);
  }, [user, setToast]);

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
      {/* Toast notification */}
      {toast && (
        <div 
          key={toast.key}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm flex items-center gap-3 transition-all ${
            toast.type === 'success' ? 'bg-green-500/90 text-white' :
            toast.type === 'error' ? 'bg-red-500/90 text-white' :
            'bg-gray-800/90 text-white border border-white/10'
          }`}
          style={{ 
            marginTop: 'env(safe-area-inset-top)',
            animation: 'toast-slide-in 0.3s ease-out'
          }}
          onClick={() => setToast(null)}
        >
          {toast.type === 'success' && <Check size={18} />}
          {toast.type === 'error' && <AlertTriangle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
      {/* Tiebreaker challenge banner - fixed at top when not viewing the object */}
      {pendingTiebreakerChallenges.length > 0 && selectedObject?.id !== pendingTiebreakerChallenges[0].objectId && (
        <div 
          className="fixed top-0 left-0 right-0 z-[100] bg-blue-600/95 backdrop-blur-sm border-b border-blue-400/30 cursor-pointer"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
          onClick={() => {
            const challenge = pendingTiebreakerChallenges[0];
            const obj = objects.find(o => o.id === challenge.objectId);
            if (obj) setSelectedObject(obj);
          }}
        >
          <div className="max-w-6xl mx-auto px-3 py-2.5 flex items-center justify-between gap-3" style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}>
            <div className="flex items-center gap-2 text-white text-sm min-w-0">
              <Swords size={18} className="flex-shrink-0 animate-pulse" />
              <span className="truncate">
                <span className="font-semibold">{pendingTiebreakerChallenges[0].fromName}</span> utmanar dig!
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-white/70 text-xs hidden sm:inline truncate max-w-[120px]">
                {pendingTiebreakerChallenges[0].objectName}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-xs font-medium">
                Gå till match →
              </span>
            </div>
          </div>
        </div>
      )}
      <header ref={headerRef} className={`bg-gray-900/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 ${pendingTiebreakerChallenges.length > 0 && selectedObject?.id !== pendingTiebreakerChallenges[0].objectId ? 'mt-[52px]' : ''}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Demo mode banner - at top of header */}
        {showDemoObjects && (
          <div className="bg-purple-600/90 border-b border-purple-400/30">
            <div className="max-w-6xl mx-auto px-3 py-1.5 flex items-center justify-between gap-2" style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}>
              <div className="flex items-center gap-1.5 text-white text-xs">
                <Eye size={14} className="flex-shrink-0" />
                <span><span className="font-medium">Demo</span> {isAdmin ? '(admin-läge)' : '– du deltar som "Anna"'}</span>
              </div>
              <button
                onClick={() => {
                  setShowDemoObjects(false);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors flex-shrink-0"
              >
                <X size={12} />
                Avsluta
              </button>
            </div>
          </div>
        )}
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowMenu(true)}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              title="Meny"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-white">OurSpots</h1>
            {pendingInvitations.length > 0 && (
              <button
                onClick={() => setShowInvitations(!showInvitations)}
                className="relative w-9 h-9 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400 hover:text-blue-300 transition-all"
                title="Inbjudningar"
              >
                <Mail size={18} />
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingInvitations.length}
                </span>
              </button>
            )}
          </div>
          
          {/* Right side: Search + User */}
          <div className="flex-1 flex items-center justify-end gap-3">
          <div className="relative flex items-center justify-end">
            {/* Expandable search */}
            <div className={`flex items-center transition-all duration-300 ease-out ${
              searchExpanded || searchQuery ? 'w-full max-w-md' : 'w-9'
            }`}>
              {(searchExpanded || searchQuery) ? (
                <div className="relative w-full">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) setSearchExpanded(false);
                    }}
                    className="w-full h-9 bg-white/10 text-white text-sm placeholder:text-gray-500 rounded-full pl-9 pr-8 border border-white/10 focus:border-blue-400 focus:bg-white/15 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Sök..."
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchExpanded(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-gray-300 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white border border-white/10 transition-all"
                  title="Sök"
                >
                  <Search size={16} />
                </button>
              )}
            </div>
          </div>
          
          {/* User avatar or login */}
          <div className="flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <div className="text-sm text-white truncate max-w-[120px]">{user.displayName}</div>
                  <div className="text-xs text-gray-400 truncate max-w-[120px]">{user.email}</div>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full border border-white/10" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-white/10 flex items-center justify-center">
                    <User size={16} className="text-blue-400" />
                  </div>
                )}
              </div>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm transition-all">
                <LogIn size={16} />
                <span className="hidden sm:inline">Logga in</span>
              </button>
            )}
          </div>
          </div>
        </div>
      </header>
      
      {/* Invitations dropdown */}
      {showInvitations && pendingInvitations.length > 0 && (
        <InvitationsDropdown
          pendingInvitations={pendingInvitations}
          userEmailKey={userEmailKey}
          onAccept={async (obj) => {
            const success = await handleAcceptInvitation(obj);
            if (success && pendingInvitations.length === 1) setShowInvitations(false);
          }}
          onReject={async (obj) => {
            const success = await handleRejectInvitation(obj);
            if (success && pendingInvitations.length === 1) setShowInvitations(false);
          }}
          onClose={() => setShowInvitations(false)}
        />
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
            
            {/* Filter button - round to distinguish from category pills */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${showFilters ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              title={showFilters ? 'Dölj filter' : 'Visa filter'}
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
          
          {showFilters && (
            <div className="mt-3 p-3 bg-white/5 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-300 ease-out">
              {/* Row 1: Favorites, Mina | View filter pills | Compact toggle */}
              <div className="flex items-center gap-1.5">
                {user && (
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`h-8 flex items-center justify-center gap-1 px-2.5 rounded-lg transition-all text-sm font-medium ${showFavoritesOnly ? 'bg-yellow-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                    title="Favoriter"
                  >
                    <Star size={14} className={showFavoritesOnly ? 'fill-white' : ''} />
                    {validFavoritesCount > 0 && (
                      <span className={`text-xs ${showFavoritesOnly ? '' : 'text-yellow-400'}`}>
                        {validFavoritesCount}
                      </span>
                    )}
                  </button>
                )}
                {user && (
                  <button 
                    onClick={() => setShowOnlyOwned(!showOnlyOwned)}
                    className={`h-8 flex items-center justify-center gap-1 px-2.5 rounded-lg transition-all text-sm font-medium ${showOnlyOwned ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                  >
                    <User size={14} />
                    <span className="text-xs">Mina</span>
                  </button>
                )}
                
                {/* Connected pill group for view filter */}
                <div className="flex h-8 rounded-lg overflow-hidden border border-white/10">
                  <button
                    onClick={() => setViewFilter('all')}
                    className={`px-2 transition-all text-xs font-medium border-r border-white/10 ${viewFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                  >
                    Alla
                  </button>
                  <button
                    onClick={() => setViewFilter('collections')}
                    className={`px-2 transition-all text-xs font-medium border-r border-white/10 ${viewFilter === 'collections' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                  >
                    Samlingar
                  </button>
                  <button
                    onClick={() => setViewFilter('objects')}
                    className={`px-2 transition-all text-xs font-medium ${viewFilter === 'objects' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                  >
                    Objekt
                  </button>
                </div>
                
                {/* Compact cards toggle - pushed to right */}
                <button
                  onClick={() => setCompactCards(v => !v)}
                  className={`ml-auto h-8 w-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0 ${compactCards ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                  title={compactCards ? 'Stora kort' : 'Kompakta kort'}
                >
                  {compactCards ? <LayoutGrid size={14} /> : <LayoutList size={14} />}
                </button>
              </div>
              
              {/* Row 3: Distance slider + Närmast */}
              {userLocation && (
                <div className="flex items-center gap-2">
                  <Navigation size={14} className="text-gray-500 flex-shrink-0" />
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={maxDistanceKm ?? 50}
                    onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                    className="flex-1 h-1.5 accent-emerald-500"
                  />
                  <span className="text-xs text-gray-300 w-14 text-right tabular-nums">
                    {maxDistanceKm ? `≤${maxDistanceKm} km` : 'Alla'}
                  </span>
                  {maxDistanceKm && (
                    <button
                      onClick={() => setMaxDistanceKm(null)}
                      className="h-6 w-6 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-all"
                      title="Rensa avståndsfilter"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <button 
                    onClick={() => setSortByDistance(!sortByDistance)}
                    className={`h-8 flex items-center gap-1 px-2.5 rounded-lg transition-all text-xs font-medium ${sortByDistance ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                  >
                    <ArrowUpDown size={12} />
                    <span>Närmast</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <main className="max-w-6xl mx-auto px-4">
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
                ) : user && !showFavoritesOnly && !showDemoObjects && objects.filter(o => o.ownerId === user.uid).length === 0 ? (
                  <div className="max-w-sm mx-auto px-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-5">
                      <Sparkles size={28} className="text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Välkommen till OurSpots</h3>
                    <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                      Skapa objekt med valfritt innehåll – text, listor, platser, bilder. 
                      Dela med vänner. Bara fantasin sätter gränser.
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
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all text-sm"
                      >
                        <Plus size={16} />
                        <span>Skapa objekt</span>
                      </button>
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
                      {!user ? 'Logga in för att skapa objekt!' : 
                       showFavoritesOnly ? 'Markera objekt med stjärnan för att lägga till favoriter' :
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
            {!selectedObject && !showCreateModal && !showCategoryAdmin && !showObjectsAdmin && !showShareModal && (
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
                  className={`absolute right-2 w-14 h-14 bg-gray-800/90 hover:bg-gray-700 backdrop-blur-sm rounded-2xl shadow-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 border border-white/10 pointer-events-auto ${
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
            setToast={setToast}
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
            onAddToCollection={async (objectId, collectionId) => {
              try {
                // Prevent circular linking (adding collection to itself)
                if (objectId === collectionId) {
                  setToast({ message: 'En samlingsvy kan inte länka till sig själv', type: 'error' });
                  return;
                }
                const collection = objects.find(o => o.id === collectionId);
                if (!collection) return;
                const currentLinked = collection.linkedObjectIds || [];
                if (currentLinked.includes(objectId)) {
                  setToast({ message: 'Objektet finns redan i samlingsvyn', type: 'info' });
                  return;
                }
                // Add to both linkedObjectIds and linkedOrder
                const currentOrder = collection.linkedOrder || [];
                await updateDoc(doc(db, 'objects', collectionId), {
                  linkedObjectIds: [...currentLinked, objectId],
                  linkedOrder: [...currentOrder, { type: 'object', id: objectId }],
                  updatedAt: Timestamp.now()
                });
                const collectionTitle = collection.blocks?.find(b => b.type === 'title')?.data?.text || 'samlingsvyn';
                setToast({ message: `Tillagt i "${collectionTitle}"!`, type: 'success' });
              } catch (err) {
                console.error('Error adding to collection:', err);
                setToast({ message: 'Kunde inte lägga till i samlingsvyn', type: 'error' });
              }
            }}
            onRemoveFromCollection={async (collectionId, objectId) => {
              try {
                const collection = objects.find(o => o.id === collectionId);
                if (!collection) return;
                const currentLinked = collection.linkedObjectIds || [];
                const currentOrder = collection.linkedOrder || [];
                await updateDoc(doc(db, 'objects', collectionId), {
                  linkedObjectIds: currentLinked.filter(id => id !== objectId),
                  linkedOrder: currentOrder.filter(item => !(item.type === 'object' && item.id === objectId)),
                  updatedAt: Timestamp.now()
                });
              } catch (err) {
                console.error('Error removing from collection:', err);
                setToast({ message: 'Kunde inte ta bort från samlingsvyn', type: 'error' });
              }
            }}
            onUpdateLinkedNote={async (collectionId, linkedObjectId, note) => {
              try {
                const collection = objects.find(o => o.id === collectionId);
                if (!collection) return;
                const currentNotes = collection.linkedObjectNotes || {};
                const updatedNotes = { ...currentNotes };
                if (note) {
                  updatedNotes[linkedObjectId] = note;
                } else {
                  delete updatedNotes[linkedObjectId];
                }
                await updateDoc(doc(db, 'objects', collectionId), {
                  linkedObjectNotes: updatedNotes,
                  updatedAt: Timestamp.now()
                });
              } catch (err) {
                console.error('Error updating linked note:', err);
              }
            }}
            onAddLinkedUrl={async (collectionId, urlData) => {
              try {
                const collection = objects.find(o => o.id === collectionId);
                if (!collection) return;
                const newUrl = {
                  id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                  title: urlData.title,
                  url: urlData.url,
                  note: urlData.note || ''
                };
                const currentUrls = collection.linkedUrls || [];
                const currentOrder = collection.linkedOrder || [];
                await updateDoc(doc(db, 'objects', collectionId), {
                  linkedUrls: [...currentUrls, newUrl],
                  linkedOrder: [...currentOrder, { type: 'url', id: newUrl.id }],
                  updatedAt: Timestamp.now()
                });
              } catch (err) {
                console.error('Error adding linked URL:', err);
                setToast({ message: 'Kunde inte lägga till länken', type: 'error' });
              }
            }}
            onUpdateLinkedUrl={async (collectionId, urlId, urlData) => {
              try {
                const collection = objects.find(o => o.id === collectionId);
                if (!collection) return;
                const currentUrls = collection.linkedUrls || [];
                const updatedUrls = currentUrls.map(u => u.id === urlId ? { ...u, ...urlData } : u);
                await updateDoc(doc(db, 'objects', collectionId), {
                  linkedUrls: updatedUrls,
                  updatedAt: Timestamp.now()
                });
              } catch (err) {
                console.error('Error updating linked URL:', err);
              }
            }}
            onRemoveLinkedUrl={async (collectionId, urlId) => {
              try {
                const collection = objects.find(o => o.id === collectionId);
                if (!collection) return;
                const currentUrls = collection.linkedUrls || [];
                const currentOrder = collection.linkedOrder || [];
                await updateDoc(doc(db, 'objects', collectionId), {
                  linkedUrls: currentUrls.filter(u => u.id !== urlId),
                  linkedOrder: currentOrder.filter(item => !(item.type === 'url' && item.id === urlId)),
                  updatedAt: Timestamp.now()
                });
              } catch (err) {
                console.error('Error removing linked URL:', err);
              }
            }}
            onReorderLinked={async (collectionId, currentIndex, direction) => {
              try {
                const collection = objects.find(o => o.id === collectionId);
                if (!collection) return;
                
                const currentOrder = [...(collection.linkedOrder || [])];
                const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
                
                if (newIndex < 0 || newIndex >= currentOrder.length) return;
                
                // Swap in the unified order array
                [currentOrder[currentIndex], currentOrder[newIndex]] = [currentOrder[newIndex], currentOrder[currentIndex]];
                
                await updateDoc(doc(db, 'objects', collectionId), {
                  linkedOrder: currentOrder,
                  updatedAt: Timestamp.now()
                });
              } catch (err) {
                console.error('Error reordering linked item:', err);
              }
            }}
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
            onAddContact={async (email) => {
              const newContacts = [...sharedContacts.filter(c => c !== email), email].slice(-20); // Keep last 20
              setSharedContacts(newContacts);
              try {
                await updateDoc(doc(db, 'users', user.uid), { sharedContacts: newContacts });
              } catch (err) {
                console.error('Error saving contact:', err);
              }
            }}
            onToggleFavoriteContact={async (email) => {
              const isFavorite = favoriteContacts.includes(email);
              const newFavorites = isFavorite 
                ? favoriteContacts.filter(c => c !== email)
                : [...favoriteContacts, email];
              setFavoriteContacts(newFavorites);
              try {
                await updateDoc(doc(db, 'users', user.uid), { favoriteContacts: newFavorites });
              } catch (err) {
                console.error('Error saving favorite contact:', err);
              }
            }}
          />
        )}

        {showContacts && (
          <ContactsModal
            onClose={() => setShowContacts(false)}
            currentUserEmail={user?.email?.toLowerCase()}
            objects={objects}
            favoriteContacts={favoriteContacts}
            onToggleFavoriteContact={async (email) => {
              const isFavorite = favoriteContacts.includes(email);
              const newFavorites = isFavorite 
                ? favoriteContacts.filter(c => c !== email)
                : [...favoriteContacts, email];
              setFavoriteContacts(newFavorites);
              try {
                await updateDoc(doc(db, 'users', user.uid), { favoriteContacts: newFavorites });
              } catch (err) {
                console.error('Error saving favorite contact:', err);
              }
            }}
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

        {showUsersAdmin && (
          <UsersAdminModal
            currentUserId={user?.uid}
            onClose={() => setShowUsersAdmin(false)}
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
          onClose={() => setShowMenu(false)}
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
          onShowCategoryAdmin={() => setShowCategoryAdmin(true)}
          onShowObjectsAdmin={() => setShowObjectsAdmin(true)}
          onShowUsersAdmin={() => setShowUsersAdmin(true)}
          onShowContacts={() => setShowContacts(true)}
          menuAdminExpanded={menuAdminExpanded}
          setMenuAdminExpanded={setMenuAdminExpanded}
          menuSettingsExpanded={menuSettingsExpanded}
          setMenuSettingsExpanded={setMenuSettingsExpanded}
          menuQuickCaptureExpanded={menuQuickCaptureExpanded}
          setMenuQuickCaptureExpanded={setMenuQuickCaptureExpanded}
          handleSwitchAccount={handleSwitchAccount}
          handleLogout={handleLogout}
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
