import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { 
  X, Plus, Image, Edit2, Trash2, 
  Loader, LogOut, LogIn, Check, Circle, Upload, 
  Map as MapIcon, List, ChevronDown, ArrowUp, ArrowDown, Search, Settings,
  Target, Lightbulb, SlidersHorizontal, Menu, Filter, Share2, UserPlus, UserMinus, Users, Mail, User,
  FileText, MapPin, Home, RotateCcw, Star, Navigation, Eye, Edit3
} from 'lucide-react';

// Version for cache-busting visual indicator (remove in production)
// const APP_VERSION = 'v9';

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
import { iconMap, getIconComponent, PREDEFINED_ICONS, AVAILABLE_ICONS, emailToKey, keyToEmail } from './utils/iconHelpers';

// Components
import { 
  TitleBlock, LocationBlock, ImageBlock, TextBlock, 
  LinksBlock, TableBlock, blockComponents, renderMarkdown 
} from './components/blocks';
import ObjectCard from './components/ObjectCard';
import MapPicker from './components/MapPicker';
import ShareModal from './components/ShareModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import FocalPointPicker from './components/FocalPointPicker';
import ObjectDetail from './components/ObjectDetail';
import MapView from './components/MapView';
import BlockEditor from './components/BlockEditor';
import CreateObjectModal from './components/CreateObjectModal';
import ObjectsAdminModal from './components/ObjectsAdminModal';
import CategoryAdminModal from './components/CategoryAdminModal';
import UsersAdminModal from './components/UsersAdminModal';
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
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingObject, setEditingObject] = useState(null);
  const [duplicatingObject, setDuplicatingObject] = useState(null);
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
  const [showUsersAdmin, setShowUsersAdmin] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [sharedContacts, setSharedContacts] = useState([]);
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
  // Menu section collapse states with localStorage
  const [menuAdminExpanded, setMenuAdminExpanded] = useState(() => {
    const saved = localStorage.getItem('menuAdminExpanded');
    return saved === 'true'; // Default collapsed
  });
  const [menuSettingsExpanded, setMenuSettingsExpanded] = useState(() => {
    const saved = localStorage.getItem('menuSettingsExpanded');
    return saved !== 'false'; // Default expanded
  });
  const [menuQuickCaptureExpanded, setMenuQuickCaptureExpanded] = useState(() => {
    const saved = localStorage.getItem('menuQuickCaptureExpanded');
    return saved !== 'false'; // Default expanded
  });
  const [mapCenter, setMapCenter] = useState(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const seedingRef = useRef(false);
  const wakeLockRef = useRef(null);
  
  // User approval and limits
  const [userApproved, setUserApproved] = useState(false);
  const [appSettings, setAppSettings] = useState({
    defaultObjectLimit: 5,
    approvedObjectLimit: 100
  });

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
          // Fetch app settings
          const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
          if (settingsDoc.exists()) {
            const settingsData = settingsDoc.data();
            setAppSettings({
              defaultObjectLimit: settingsData.defaultObjectLimit ?? 5,
              approvedObjectLimit: settingsData.approvedObjectLimit ?? 100
            });
          }

          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Check if user is blocked
            if (userData?.blocked) {
              alert('Ditt konto har blivit blockerat. Kontakta administratören.');
              await signOut(auth);
              return;
            }
            
            const adminFlag = userData?.isAdmin === true;
            const userFavorites = userData?.favorites || [];
            const userDisplayName = userData?.displayName || '';
            const userSharedContacts = userData?.sharedContacts || [];
            const userApprovedFlag = userData?.approved === true || adminFlag; // Admins are always approved

            setIsAdmin(adminFlag);
            setUserApproved(userApprovedFlag);
            setFavorites(userFavorites);
            setDisplayName(userDisplayName);
            setSharedContacts(userSharedContacts);
          } else {

            // Create user doc if it doesn't exist
            await setDoc(doc(db, 'users', u.uid), {
              email: u.email,
              isAdmin: false,
              approved: false,
              favorites: [],
              displayName: '',
              sharedContacts: [],
              createdAt: Timestamp.now()
            });
            setIsAdmin(false);
            setUserApproved(false);
            setFavorites([]);
            setDisplayName('');
            setSharedContacts([]);
          }
        } catch (err) {
          console.error('Error fetching user doc:', err);
          setIsAdmin(false);
          setUserApproved(false);
          setFavorites([]);
        }
      } else {
        setIsAdmin(false);
        setUserApproved(false);
        setFavorites([]);
        setDisplayName('');
        setSharedContacts([]);
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

  // Count only favorites that still exist in objects
  const validFavoritesCount = favorites.filter(fid => objects.some(o => o.id === fid)).length;

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
      if (block.type === 'table' && Array.isArray(block.data?.rows)) {
        block.data.rows.forEach(row => {
          Object.values(row).forEach(val => {
            if (typeof val === 'string') values.push(val);
          });
        });
      }
      if (block.type === 'datetag' && Array.isArray(block.data?.tags)) {
        block.data.tags.forEach(tag => {
          if (tag.type === 'year') {
            values.push(tag.value.toString());
          } else if (tag.type === 'range') {
            values.push(tag.start);
            values.push(tag.end);
          }
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
  
  // Apply "only owned" filter
  if (showOnlyOwned && user) {
    filteredObjects = filteredObjects.filter(o => o.ownerId === user.uid);
  }
  
  // Determine which objects to display
  let displayObjects;
  
  if (showAllObjects) {
    // Show all objects flat
    displayObjects = filteredObjects;
  } else if (searchTerm) {
    // When searching: show all matching objects directly (including children)
    displayObjects = filteredObjects.filter(obj => matchesSearch(obj));
  } else {
    // Normal mode: show top-level objects + "orphaned" children (whose parent user can't see)
    const accessibleIds = new Set(filteredObjects.map(o => o.id));
    displayObjects = filteredObjects.filter(o => {
      // Include if no parent (top-level)
      if (!o.parentId) return true;
      // Include if parent is not accessible (orphaned child)
      if (!accessibleIds.has(o.parentId)) return true;
      return false;
    });
  }

  if (maxDistanceKm && userLocation) {
    displayObjects = displayObjects.filter(obj => {
      // Always include objects from hideLocation categories (they have no location)
      const cat = categories.find(c => c.id === obj.type);
      if (cat?.hideLocation) return true;
      
      const dist = getObjectDistance(obj);
      return typeof dist === 'number' && dist <= maxDistanceKm;
    });
  }
  
  // Apply distance sorting if enabled
  if (sortByDistance && userLocation) {
    displayObjects = [...displayObjects].sort((a, b) => {
      // Put hideLocation objects last when sorting by distance
      const catA = categories.find(c => c.id === a.type);
      const catB = categories.find(c => c.id === b.type);
      if (catA?.hideLocation && !catB?.hideLocation) return 1;
      if (!catA?.hideLocation && catB?.hideLocation) return -1;
      
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
    
    // Check object limit for new objects (not edits)
    if (!editId) {
      const ownedObjectsCount = objects.filter(o => o.ownerId === user.uid).length;
      const limit = userApproved ? appSettings.approvedObjectLimit : appSettings.defaultObjectLimit;
      
      if (ownedObjectsCount >= limit) {
        if (!userApproved) {
          alert(`Du har nått gränsen på ${limit} objekt. Kontakta en administratör för att få ditt konto godkänt och utökat.`);
        } else {
          alert(`Du har nått din gräns på ${limit} objekt.`);
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
                inheritedSharedWithEmails.push(shareData.email);
              }
            }
          });
        }
      }
      
      if (editId) {
        // Check if parent changed - need to update descendants' ancestorIds
        const existingObj = objects.find(o => o.id === editId);
        const parentChanged = existingObj?.parentId !== objectData.parentId;
        
        // Update existing
        await updateDoc(doc(db, 'objects', editId), { ...dataWithPath, updatedAt: Timestamp.now() });
        
        // If parent changed, update all descendants' ancestorIds
        if (parentChanged) {
          const descendants = objects.filter(o => o.ancestorIds?.includes(editId));
          if (descendants.length > 0) {
            // New ancestor path for the edited object
            const newAncestorBase = [...ancestorIds, editId];
            
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
                
                await updateDoc(doc(db, 'objects', desc.id), {
                  ancestorIds: newDescAncestorIds,
                  parentPath: newParentPath
                });
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
          updatedAt: Timestamp.now()
        };
        
        // Add inherited shares if any
        if (Object.keys(inheritedShares).length > 0) {
          newObjectData.shares = inheritedShares;
          newObjectData.sharedWithEmails = inheritedSharedWithEmails;
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
      alert(err.message === 'Timeout' ? 'Sparningen tog för lång tid. Försök igen.' : 'Kunde inte spara!');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteObject = async (id) => {
    try {
      // Find all descendants using ancestorIds
      const descendants = objects.filter(o => o.ancestorIds?.includes(id));
      
      // Delete all descendants first, then the object itself
      const allToDelete = [...descendants.map(d => d.id), id];
      
      await Promise.all(allToDelete.map(objId => 
        deleteDoc(doc(db, 'objects', objId))
      ));
    } catch (err) {
      console.error('Error deleting objects:', err);
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
        acceptedShareEmails: arrayRemove(userEmail),
        editorEmails: arrayRemove(userEmail)
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

  const handleDuplicate = (obj) => {
    if (!user) {
      alert('Du måste vara inloggad för att kopiera!');
      return;
    }
    setDuplicatingObject(obj);
    setDefaultParentId(obj.parentId || null);
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
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        {shareInfo?.role === 'editor' ? <><Edit3 size={10} /> <span>Redigerare</span></> : <><Eye size={10} /> <span>Läsare</span></>}
                        {shareInfo?.includeChildren && <span className="ml-1">• Inkl. barn</span>}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          try {
                            const emailKey = emailToKey(user.email.toLowerCase());
                            const userEmail = user.email.toLowerCase();
                            const updateData = {
                              [`shares.${emailKey}.status`]: 'accepted',
                              [`shares.${emailKey}.respondedAt`]: Timestamp.now(),
                              acceptedShareEmails: arrayUnion(userEmail)
                            };
                            // Add to editorEmails if editor role (for Firestore security rules)
                            if (shareInfo?.role === 'editor') {
                              updateData.editorEmails = arrayUnion(userEmail);
                            }
                            await updateDoc(doc(db, 'objects', obj.id), updateData);
                            if (pendingInvitations.length === 1) setShowInvitations(false);
                          } catch (err) {
                            alert('Kunde inte acceptera');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-green-500/20 text-green-300 text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center justify-center"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const emailKey = emailToKey(user.email.toLowerCase());
                            const userEmail = user.email.toLowerCase();
                            await updateDoc(doc(db, 'objects', obj.id), {
                              [`shares.${emailKey}`]: deleteField(),
                              sharedWithEmails: arrayRemove(userEmail),
                              acceptedShareEmails: arrayRemove(userEmail),
                              editorEmails: arrayRemove(userEmail)
                            });
                            if (pendingInvitations.length === 1) setShowInvitations(false);
                          } catch (err) {
                            alert('Kunde inte neka');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center"
                      >
                        <X size={14} />
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
                    {validFavoritesCount > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${showFavoritesOnly ? 'bg-white/25' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {validFavoritesCount}
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
                {user && (
                  <button 
                    onClick={() => setShowOnlyOwned(!showOnlyOwned)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${showOnlyOwned ? 'bg-green-500/80 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'}`}
                  >
                    <User size={16} />
                    <span>Mina</span>
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
                const parent = obj.parentId ? objects.find(o => o.id === obj.parentId) : null;
                const isOrphanChild = obj.parentId && !parent;
                
                // Build parent chain for breadcrumb
                // For orphans, use stored parentPath; otherwise build dynamically
                const getParentChain = () => {
                  if (!obj.parentId) return [];
                  
                  // For orphans, use stored parentPath if available
                  if (isOrphanChild && obj.parentPath && obj.parentPath.length > 0) {
                    return obj.parentPath;
                  }
                  
                  // Build dynamically from accessible parents
                  const chain = [];
                  let currentId = obj.parentId;
                  let depth = 0;
                  while (currentId && depth < 5) {
                    const p = objects.find(o => o.id === currentId);
                    if (p) {
                      const name = p.blocks?.find(b => b.type === 'title')?.data?.text;
                      if (name) chain.unshift(name);
                      currentId = p.parentId;
                    } else {
                      break;
                    }
                    depth++;
                  }
                  return chain;
                };
                const parentChain = getParentChain();
                
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
                    isOrphanChild={isOrphanChild}
                    parentChain={parentChain}
                    showAsChild={!!obj.parentId && (searchTerm || isOrphanChild)}
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
          <MapView objects={filteredObjects.filter(obj => {
            const cat = categories.find(c => c.id === obj.type);
            return !cat?.hideLocation;
          })} onSelectObject={setSelectedObject} currentUser={user} userLocation={userLocation} categories={categories} mapCenter={mapCenter} showFilters={showFilters} />
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
          onDuplicate={handleDuplicate}
          onBlockUpdate={handleBlockUpdate} 
          currentUser={user} 
          userDisplayName={displayName}
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
        />
      )}

      {showShareModal && (
        <ShareModal
          object={showShareModal}
          onClose={() => setShowShareModal(null)}
          currentUserEmail={user?.email?.toLowerCase()}
          allObjects={objects}
          sharedContacts={sharedContacts}
          onAddContact={async (email) => {
            const newContacts = [...sharedContacts.filter(c => c !== email), email].slice(-20); // Keep last 20
            setSharedContacts(newContacts);
            try {
              await updateDoc(doc(db, 'users', user.uid), { sharedContacts: newContacts });
            } catch (err) {
              console.error('Error saving contact:', err);
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
          <div className="fixed top-0 left-0 h-full w-80 bg-gray-950/98 backdrop-blur-xl border-r border-white/10 z-[2001] shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
            {/* Sticky header */}
            <div className="flex-shrink-0 p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Meny</h2>
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation"
                  aria-label="Stäng"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isAdmin && (
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <button
                      onClick={() => {
                        const newValue = !menuAdminExpanded;
                        setMenuAdminExpanded(newValue);
                        localStorage.setItem('menuAdminExpanded', String(newValue));
                      }}
                      className="w-full flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${menuAdminExpanded ? '' : '-rotate-90'}`} />
                      <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Admin</span>
                    </button>
                    {menuAdminExpanded && (
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            setShowCategoryAdmin(true);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
                        >
                          <Settings size={16} className="text-blue-400" />
                          <span className="text-sm">Hantera kategorier</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowObjectsAdmin(true);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
                        >
                          <Settings size={16} className="text-purple-400" />
                          <span className="text-sm">Alla objekt</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowUsersAdmin(true);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
                        >
                          <Users size={16} className="text-green-400" />
                          <span className="text-sm">Användare</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Settings section */}
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <button
                    onClick={() => {
                      const newValue = !menuSettingsExpanded;
                      setMenuSettingsExpanded(newValue);
                      localStorage.setItem('menuSettingsExpanded', String(newValue));
                    }}
                    className="w-full flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <ChevronDown size={16} className={`text-gray-500 transition-transform ${menuSettingsExpanded ? '' : '-rotate-90'}`} />
                    <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Inställningar</span>
                  </button>
                {menuSettingsExpanded && (
                <div className="p-2 space-y-2">
                  {/* Profile / Nickname */}
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <div className="flex-1 mb-2">
                      <div className="text-sm font-medium text-white">Visningsnamn</div>
                      <div className="text-xs text-gray-400 mt-0.5">Hur andra ser dig vid delning</div>
                    </div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={async () => {
                        if (user) {
                          try {
                            await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
                          } catch (err) {
                            console.error('Error saving displayName:', err);
                          }
                        }
                      }}
                      placeholder={user?.email?.split('@')[0] || 'Ditt namn'}
                      className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="p-2.5 rounded-lg bg-white/5">
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
                  <div className="p-2.5 rounded-lg bg-white/5">
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
                )}
                </div>
                
                {/* Quick Capture section */}
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <button
                    onClick={() => {
                      const newValue = !menuQuickCaptureExpanded;
                      setMenuQuickCaptureExpanded(newValue);
                      localStorage.setItem('menuQuickCaptureExpanded', String(newValue));
                    }}
                    className="w-full flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <ChevronDown size={16} className={`text-gray-500 transition-transform ${menuQuickCaptureExpanded ? '' : '-rotate-90'}`} />
                    <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Snabbpinningar</span>
                  </button>
                {menuQuickCaptureExpanded && (
                <div className="p-2 space-y-2">
                  <div className="p-2.5 rounded-lg bg-white/5">
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
                      <div className="p-2.5 rounded-lg bg-white/5">
                        <div className="flex-1 mb-2">
                          <div className="text-sm font-medium text-white">Går till objekt</div>
                          <div className="text-xs text-gray-400 mt-0.5">Lägg till positioner direkt</div>
                        </div>
                        <select
                          value={quickCaptureObjectId}
                          onChange={(e) => setQuickCaptureObjectId(e.target.value)}
                          className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm appearance-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
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
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Target size={16} className="text-orange-400" />
                          <span className="text-sm">Visa pinningar</span>
                        </div>
                        {captures.length > 0 && (
                          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {captures.length}
                          </span>
                        )}
                      </button>
                    </>
                  )}
                </div>
                )}
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
