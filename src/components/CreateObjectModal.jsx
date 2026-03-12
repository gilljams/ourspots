import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Plus, Upload, Loader, Navigation, ChevronDown, ChevronUp,
  Map as MapIcon, FileText, CheckSquare, ClipboardList, Link2, Table2, Image as ImageIcon, Calendar, Phone, Timer, BarChart3, Folder, MapPin, Music, Wallet, Trophy, Car, Users, Minus, MessageCircle, Swords, Zap, Images, Star, Search, Globe, Palette 
} from 'lucide-react';
import { 
  CLOUDINARY_CLOUD_NAME, 
  CLOUDINARY_UPLOAD_PRESET, 
  resizeImage, 
  extractGPSFromImage 
} from '../utils/imageUtils';
import { getIconComponent } from '../utils/iconHelpers';
import MapPicker from './MapPicker';
import FocalPointPicker from './FocalPointPicker';
import BlockEditor from './BlockEditor';
import { useConfirm } from '../utils/useConfirm';
import { useToast } from '../utils/useToast';
import { usePrompt } from '../utils/usePrompt';
import { fetchCountryFacts, searchPlaces, fetchPlaceFacts } from '../utils/countryData';
import { useDebounce } from '../utils/useDebounce';

// Demo users available when in demo mode for realistic examples
const DEMO_USERS = {
  'anna_DOT_demo_DOT_se': { email: 'anna.demo.se', displayName: 'Anna', status: 'accepted', role: 'editor' },
  'erik_DOT_demo_DOT_se': { email: 'erik.demo.se', displayName: 'Erik', status: 'accepted', role: 'viewer' },
  'lisa_DOT_demo_DOT_se': { email: 'lisa.demo.se', displayName: 'Lisa', status: 'accepted', role: 'viewer' },
  'johan_DOT_demo_DOT_se': { email: 'johan.demo.se', displayName: 'Johan', status: 'accepted', role: 'viewer' },
  'maria_DOT_demo_DOT_se': { email: 'maria.demo.se', displayName: 'Maria', status: 'accepted', role: 'viewer' },
};

// Stock images from Unsplash (no storage needed - direct URLs)
const STOCK_IMAGES = {
  food: [
    { url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80&fit=crop', label: 'Mat' },
  ],
  travel: [
    { url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80&fit=crop', label: 'Strand' },
    { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80&fit=crop', label: 'Berg' },
    { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&fit=crop', label: 'Tropiskt' },
  ],
  nature: [
    { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&fit=crop', label: 'Skog' },
    { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80&fit=crop', label: 'Dimma' },
    { url: 'https://images.unsplash.com/photo-1518173946687-a4c036bc3dc1?w=800&q=80&fit=crop', label: 'Äng' },
  ],
  vehicle: [
    { url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80&fit=crop', label: 'Bil' },
    { url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80&fit=crop', label: 'Husbil' },
    { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&fit=crop', label: 'Väg' },
  ],
  golf: [
    { url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80&fit=crop', label: 'Golfbana' },
    { url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80&fit=crop', label: 'Green' },
    { url: 'https://images.unsplash.com/photo-1592919505780-303950717480?w=800&q=80&fit=crop', label: 'Golfklubbor' },
  ],
  home: [
    { url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80&fit=crop', label: 'Hus' },
  ],
  todo: [
    { url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80&fit=crop', label: 'Checklista' },
    { url: 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&q=80&fit=crop', label: 'Planering' },
    { url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80&fit=crop', label: 'Anteckningar' },
  ],
  shopping: [
    { url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80&fit=crop', label: 'Shopping' },
  ],
};

// Map category IDs to stock image keys
const CATEGORY_STOCK_MAP = {
  food: 'food',
  restaurant: 'food',
  travel: 'travel',
  vacation: 'travel',
  nature: 'nature',
  outdoor: 'nature',
  vehicle: 'vehicle',
  car: 'vehicle',
  golf: 'golf',
  sport: 'golf',
  fitness: 'golf',
  home: 'home',
  property: 'home',
  todo: 'todo',
  task: 'todo',
  shopping: 'shopping',
  list: 'shopping',
};

// ========== OBJECT TEMPLATES ==========
// Pre-defined block setups that can be applied when creating new objects
const OBJECT_TEMPLATES = [
  {
    id: 'recipe',
    label: 'Recept',
    icon: 'UtensilsCrossed',
    description: 'Betyg, ingredienser, instruktioner & timer',
    requireHideLocation: true, // Only show for location-independent categories
    blocks: [
      { type: 'rating', title: 'Betyg', ratings: {} },
      { type: 'table', title: 'Ingredienser', template: 'list', columns: [], rows: [], showCheckbox: true, col2Type: 'text', viewerEditable: false, defaultCollapsed: false },
      { type: 'table', title: 'Gör så här', template: 'list', columns: [], rows: [], showCheckbox: true, col2Type: 'text', viewerEditable: false, defaultCollapsed: false },
      { type: 'timer', timers: [], defaultCollapsed: false },
    ]
  },
  {
    id: 'country',
    label: 'Plats',
    icon: 'Globe',
    description: 'Fakta om ett land, stad eller plats via Wikipedia',
    matchCategoryIcon: 'Plane', // Show for travel-type categories
    hasCountryPicker: true,
    blocks: [
      { type: 'text', title: 'Fakta', content: '', defaultCollapsed: true, viewerEditable: false },
    ]
  },
];

// Helper to get smaller thumbnail version
const getThumbUrl = (url) => url.replace('w=800', 'w=400');

// Wrapper that auto-scrolls a block into view when it expands (ResizeObserver)
function ScrollOnExpandWrapper({ children, blockId }) {
  const ref = useRef(null);
  const prevHeight = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        // Detect expansion (height grew from a meaningful previous height)
        if (newHeight > prevHeight.current && prevHeight.current > 0) {
          setTimeout(() => {
            const scrollContainer = el.closest('.overflow-y-auto');
            if (!scrollContainer) return;

            const elementRect = el.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            if (elementRect.top < containerRect.top) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (elementRect.bottom > containerRect.bottom) {
              const headerHeight = 44;
              const maxScroll = elementRect.top - containerRect.top - headerHeight;
              const neededScroll = elementRect.bottom - containerRect.bottom + 20;
              const scrollAmount = Math.min(neededScroll, maxScroll);
              if (scrollAmount > 0) {
                scrollContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
              }
            }
          }, 50);
        }
        prevHeight.current = newHeight;
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} data-block-id={blockId}>{children}</div>;
}

function CreateObjectModal({ onClose, onSave, editObject, duplicateFromObject, saving, availableParents, defaultParentId, userLocation, categories, preciseGPS, isAdmin, currentUser, currentUserDisplayName, hasChildren, defaultCategory, isDemoMode }) {
  // ========== STATE ==========
  const isEdit = !!editObject;
  const isDuplicate = !!duplicateFromObject;
  const sourceObject = editObject || duplicateFromObject; // Use either for initial data
  const confirm = useConfirm();
  const toast = useToast();
  const prompt = usePrompt();
  
  // Determine default type: source object > default category prop > parent type > first category
  const getDefaultType = () => {
    if (sourceObject?.type) return sourceObject.type;
    if (defaultCategory && categories.some(c => c.id === defaultCategory)) return defaultCategory;
    if (defaultParentId) {
      const parent = availableParents.find(p => p.id === defaultParentId);
      if (parent?.type) return parent.type;
    }
    return categories[0]?.id || 'property';
  };
  const defaultType = getDefaultType();

  // Form state
  const [selectedType, setSelectedType] = useState(sourceObject?.type || defaultType);
  const [parentId, setParentId] = useState(sourceObject?.parentId || defaultParentId || '');
  const [inheritLocation, setInheritLocation] = useState(false);
  const [isCollection, setIsCollection] = useState(sourceObject?.isCollection || false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearch, setPlaceSearch] = useState('');
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showPlaceBlockPicker, setShowPlaceBlockPicker] = useState(false);
  const [placeBlockSearch, setPlaceBlockSearch] = useState('');
  const [placeBlockResults, setPlaceBlockResults] = useState([]);
  const [searchingPlaceBlock, setSearchingPlaceBlock] = useState(false);
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState(sourceObject?.whatsappGroupUrl || '');
  const [whatsappAdded, setWhatsappAdded] = useState(!!sourceObject?.whatsappGroupUrl);
  const [whatsappExpanded, setWhatsappExpanded] = useState(false);
  
  // Collection fields - copy structure but NOT notes (linkedObjectNotes is time-specific)
  const linkedObjectIds = sourceObject?.linkedObjectIds || [];
  const linkedUrls = sourceObject?.linkedUrls || [];
  const linkedOrder = sourceObject?.linkedOrder || [];
  
  // For duplicates, add " (kopia)" suffix to title (strip existing suffixes first)
  const originalTitle = sourceObject?.blocks?.find(b => b.type === 'title')?.data?.text || '';
  const cleanTitle = originalTitle.replace(/( \(kopia\))+$/g, ''); // Remove existing (kopia) suffixes
  const [title, setTitle] = useState(isDuplicate ? `${cleanTitle} (kopia)` : originalTitle);
  
  // Location handling - preserve extra location blocks (e.g., mushroom spots added via quick capture)
  const locationBlocks = sourceObject?.blocks?.filter(b => b.type === 'location') || [];
  // Find primary location by isPrimary flag only
  const primaryLocation = locationBlocks.find(b => b.data?.isPrimary === true);
  const [address, setAddress] = useState(primaryLocation?.data?.address || '');
  const [lat, setLat] = useState(primaryLocation?.data?.lat ?? null);
  const [lng, setLng] = useState(primaryLocation?.data?.lng ?? null);
  // Extra locations (non-primary) are editable in customBlocks
  const [imageUrl, setImageUrl] = useState(sourceObject?.blocks?.find(b => b.type === 'image')?.data?.url || '');
  const [imageCropMode, setImageCropMode] = useState(sourceObject?.blocks?.find(b => b.type === 'image')?.data?.cropMode || 'auto');
  const [imageFocalPoint, setImageFocalPoint] = useState(sourceObject?.blocks?.find(b => b.type === 'image')?.data?.focalPoint || null);
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [customBlocks, setCustomBlocks] = useState(() => {
    if (!sourceObject) return [];
    
    // Get extra location blocks (all locations without isPrimary: true)
    const extraLocationBlocks = locationBlocks
      .filter(b => b.data?.isPrimary !== true)
      .map((b, idx) => ({
        id: Math.random().toString(36).substr(2, 9),
        type: 'location',
        lat: b.data.lat,
        lng: b.data.lng,
        address: b.data.address || '',
        note: b.data.note || ''
      }));
    
    const otherBlocks = sourceObject.blocks
      .filter(b => ['text', 'links', 'table', 'datetag', 'contact', 'timer', 'poll', 'audio', 'split', 'leaderboard', 'distribution', 'section', 'tiebreaker', 'gallery', 'rating', 'color'].includes(b.type))
      .map(b => {
        if (b.type === 'links') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'links',
            title: b.data.title || '',
            links: b.data.items || [],
            defaultCollapsed: b.data.defaultCollapsed || false
          };
        }
        if (b.type === 'table') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'table',
            title: b.data.title || '',
            template: b.data.template || 'tasks',
            rows: b.data.rows || [],
            columns: b.data.columns || [],
            defaultCollapsed: b.data.defaultCollapsed || false,
            viewerEditable: b.data.viewerEditable || false,
            col2Type: b.data.col2Type || 'text',
            showCheckbox: b.data.showCheckbox ?? true,
            yearMode: b.data.yearMode || false,
            yearData: b.data.yearData || {}
          };
        }
        if (b.type === 'datetag') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'datetag',
            tags: b.data.tags || [],
            defaultCollapsed: b.data.defaultCollapsed || false
          };
        }
        if (b.type === 'contact') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'contact',
            phone: b.data.phone || '',
            email: b.data.email || '',
            website: b.data.website || ''
          };
        }
        if (b.type === 'timer') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'timer',
            timers: b.data.timers || [],
            defaultCollapsed: b.data.defaultCollapsed || false
          };
        }
        if (b.type === 'poll') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'poll',
            title: b.data.title || '',
            pollType: b.data.pollType || 'date',
            options: b.data.options || [],
            votes: isDuplicate ? {} : (b.data.votes || {}), // Clear votes when duplicating
            closed: isDuplicate ? false : (b.data.closed || false), // Reset closed when duplicating
            allowSuggestions: b.data.allowSuggestions || false,
            defaultCollapsed: b.data.defaultCollapsed || false
          };
        }
        if (b.type === 'audio') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'audio',
            title: b.data.title || '',
            url: b.data.url || '',
            discrete: b.data.discrete !== false, // Default true
            animation: b.data.animation || 'none' // 'none', 'cykel', 'gris'
          };
        }
        if (b.type === 'split') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'split',
            title: b.data.title || '',
            model: b.data.model || 'individual',
            participants: isDuplicate 
              ? (b.data.participants || []).map(p => ({ ...p, paid: 0 })) // Reset paid amounts when duplicating
              : (b.data.participants || []),
            closed: isDuplicate ? false : (b.data.closed || false),
            defaultCollapsed: b.data.defaultCollapsed ?? true
          };
        }
        if (b.type === 'leaderboard') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'leaderboard',
            title: b.data.title || '',
            mode: b.data.mode || 'single',
            competitionType: b.data.competitionType || 'score',
            teams: b.data.teams || [{ id: 1, name: 'Lag 1' }, { id: 2, name: 'Lag 2' }],
            participants: isDuplicate ? [] : (b.data.participants || []), // Clear participants when duplicating
            roundCount: isDuplicate ? 0 : (b.data.roundCount || 0),
            scores: isDuplicate ? {} : (b.data.scores || {}), // Clear scores when duplicating
            shots: isDuplicate ? {} : (b.data.shots || {}), // Clear shots when duplicating
            rounds: isDuplicate ? [] : (b.data.rounds || []), // Clear rounds when duplicating
            status: isDuplicate ? 'active' : (b.data.status || 'active'),
            sortOrder: b.data.sortOrder || 'desc',
            defaultCollapsed: b.data.defaultCollapsed ?? true
          };
        }
        if (b.type === 'distribution') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'distribution',
            preset: b.data.preset || 'carpool',
            title: b.data.title || '',
            slots: isDuplicate ? [] : (b.data.slots || []), // Clear slots when duplicating
            participants: isDuplicate ? [] : (b.data.participants || []), // Load participants
            defaultCollapsed: b.data.defaultCollapsed ?? true
          };
        }
        if (b.type === 'section') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'section',
            title: b.data.title || 'Sektion',
            uppercase: b.data.uppercase !== false
          };
        }
        if (b.type === 'tiebreaker') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'tiebreaker',
            title: b.data.title || 'Tiebreaker',
            bestOf: b.data.bestOf || 3,
            defaultCollapsed: b.data.defaultCollapsed ?? false,
            activeMatch: isDuplicate ? null : b.data.activeMatch,
            challenges: isDuplicate ? {} : (b.data.challenges || {}),
            matchHistory: isDuplicate ? [] : (b.data.matchHistory || [])
          };
        }
        if (b.type === 'rating') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'rating',
            title: b.data.title || 'Betyg',
            ratings: isDuplicate ? {} : (b.data.ratings || {})
          };
        }
        if (b.type === 'gallery') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'gallery',
            images: b.data.images || []
          };
        }
        if (b.type === 'color') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'color',
            title: b.data.title || 'Kulör',
            entries: b.data.entries || [],
            defaultCollapsed: b.data.defaultCollapsed ?? false
          };
        }
        // Text blocks
        return {
          id: Math.random().toString(36).substr(2, 9),
          type: b.type,
          title: b.data.title || '',
          content: b.data.content || '',
          defaultCollapsed: b.data.defaultCollapsed || false,
          viewerEditable: b.data.viewerEditable || false
        };
      });
    
    // Return extra locations first, then other blocks
    return [...extraLocationBlocks, ...otherBlocks];
  });

  // UI state
  const [capturingGPS, setCapturingGPS] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showFocalPointPicker, setShowFocalPointPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [originalImageFile, setOriginalImageFile] = useState(null);
  const [extractingGPS, setExtractingGPS] = useState(false);
  const [showMoreBlocks, setShowMoreBlocks] = useState(false);
  const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const parentSearchRef = useRef(null);
  const parentDropdownRef = useRef(null);
  // Basic settings section - collapsed in edit mode if fields have values
  const [showBasicSettings, setShowBasicSettings] = useState(() => {
    if (!isEdit) return true; // Always expanded for new objects
    // For edit: collapse if we have some basic settings already filled
    const hasParent = !!sourceObject?.parentId;
    const hasLocation = !!primaryLocation;
    const hasImage = !!sourceObject?.blocks?.find(b => b.type === 'image')?.data?.url;
    return !(hasParent || hasLocation || hasImage); // Collapse if any is set
  });

  // Refs
  const fileInputRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const placeBlockPickerRef = useRef(null);
  const placeBlockInputRef = useRef(null);
  
  // Calculate effective shares for block editors
  // Combines sourceObject shares with parent's inheritable shares (for new objects under shared parent)
  const effectiveShares = useMemo(() => {
    // If editing existing object, use its shares
    if (sourceObject?.shares) {
      return sourceObject.shares;
    }
    
    // For new objects: check if parent has shares with includeChildren
    if (parentId) {
      const parent = availableParents.find(p => p.id === parentId);
      if (parent?.shares) {
        const inheritableShares = {};
        Object.entries(parent.shares).forEach(([emailKey, shareData]) => {
          if (shareData.includeChildren && (shareData.status === 'accepted' || shareData.status === 'inherited')) {
            inheritableShares[emailKey] = {
              ...shareData,
              status: 'inherited',
              includeChildren: false,
              inheritedFrom: parentId
            };
          }
        });
        return inheritableShares;
      }
    }
    
    return {};
  }, [sourceObject?.shares, parentId, availableParents]);
  
  // Add demo users when in demo mode
  const effectiveSharesWithDemo = useMemo(() => {
    if (!isDemoMode) return effectiveShares;
    return { ...effectiveShares, ...DEMO_USERS };
  }, [effectiveShares, isDemoMode]);
  const customBlocksRef = useRef(customBlocks);
  customBlocksRef.current = customBlocks;
  
  // Track if form has been modified (simpler than deep comparison)
  const [formTouched, setFormTouched] = useState(false);

  // ========== ESCAPE KEY ==========
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  // ========== iOS VIEWPORT FIX ==========
  // Fix for iOS Safari viewport zoom issues when keyboard closes
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;

    const handleFocusOut = (e) => {
      // When leaving an input/textarea, force viewport reset
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // Small delay to let iOS finish its animations
        setTimeout(() => {
          // Force scroll to trigger viewport recalculation
          window.scrollTo(0, window.scrollY);
        }, 100);
      }
    };

    document.addEventListener('focusout', handleFocusOut);
    return () => document.removeEventListener('focusout', handleFocusOut);
  }, []);

  // ========== COMPUTED ==========
  const selectedParent = availableParents.find(p => p.id === parentId);
  const parentHasLocation = selectedParent?.blocks?.some(b => b.type === 'location');
  const selectedCategory = categories.find(c => c.id === selectedType);
  const hideLocation = selectedCategory?.hideLocation || false;
  
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
    setSelectedTemplate(null); // Reset template when category changes
    setFormTouched(true);
  };

  // Get templates available for the currently selected category
  const availableTemplates = useMemo(() => {
    const cat = categories.find(c => c.id === selectedType);
    return OBJECT_TEMPLATES.filter(t => {
      if (t.requireHideLocation && !cat?.hideLocation) return false;
      if (t.requireCategory && t.requireCategory !== selectedType) return false;
      if (t.matchCategoryIcon && cat?.icon !== t.matchCategoryIcon) return false;
      return true;
    });
  }, [selectedType, categories]);

  const handleTemplateSelect = (templateId) => {
    if (isEdit) return; // Templates only for new objects
    const template = OBJECT_TEMPLATES.find(t => t.id === templateId);
    if (selectedTemplate === templateId) {
      // Deselect: clear template blocks
      setSelectedTemplate(null);
      setCustomBlocks([]);
      setSelectedPlace(null);
      setPlaceSearch('');
      setPlaceResults([]);
      setFormTouched(true);
      return;
    }
    setSelectedTemplate(templateId);
    setSelectedPlace(null);
    setPlaceSearch('');
    setPlaceResults([]);
    if (template) {
      // For country/place template, don't populate blocks yet — wait for place selection
      if (template.hasCountryPicker) {
        const blocks = template.blocks.map(b => ({
          ...b,
          id: Math.random().toString(36).substr(2, 9),
        }));
        setCustomBlocks(blocks);
        setFormTouched(true);
        return;
      }
      const blocks = template.blocks.map(b => ({
        ...b,
        id: Math.random().toString(36).substr(2, 9),
      }));
      setCustomBlocks(blocks);
      setFormTouched(true);
    }
  };

  // Debounced place search for template picker
  const debouncedPlaceSearch = useDebounce(placeSearch, 350);
  useEffect(() => {
    if (!debouncedPlaceSearch || debouncedPlaceSearch.length < 2 || selectedPlace) return;
    let cancelled = false;
    setSearchingPlace(true);
    searchPlaces(debouncedPlaceSearch).then(results => {
      if (!cancelled) setPlaceResults(results);
    }).catch(() => {}).finally(() => { if (!cancelled) setSearchingPlace(false); });
    return () => { cancelled = true; };
  }, [debouncedPlaceSearch, selectedPlace]);

  // Debounced place search for block picker
  const debouncedPlaceBlockSearch = useDebounce(placeBlockSearch, 350);
  useEffect(() => {
    if (!debouncedPlaceBlockSearch || debouncedPlaceBlockSearch.length < 2) return;
    let cancelled = false;
    setSearchingPlaceBlock(true);
    searchPlaces(debouncedPlaceBlockSearch).then(results => {
      if (!cancelled) setPlaceBlockResults(results);
    }).catch(() => {}).finally(() => { if (!cancelled) setSearchingPlaceBlock(false); });
    return () => { cancelled = true; };
  }, [debouncedPlaceBlockSearch]);

  const handlePlaceSelect = async (place) => {
    setSelectedPlace(place);
    setPlaceSearch('');
    setPlaceResults([]);
    setLoadingPlace(true);
    try {
      let facts;
      if (place.type === 'country' && place.countryCode) {
        // Country → use rich country facts (el, adapter, valuta etc)
        facts = await fetchCountryFacts(place.countryCode);
      } else {
        // City/place → use Wikipedia-based facts
        facts = await fetchPlaceFacts(place.name, place.lat, place.lng, {
          country: place.country,
          state: place.state,
          city: place.city,
        });
      }
      setTitle(facts.title);
      if (facts.imageUrl) {
        setImageUrl(facts.imageUrl);
      }
      if (facts.lat != null && facts.lng != null) {
        setLat(facts.lat);
        setLng(facts.lng);
        setAddress(facts.address || place.displayName);
      }
      setCustomBlocks(prev => prev.map(b => 
        b.type === 'text' && b.title === 'Fakta' 
          ? { ...b, content: facts.content }
          : b
      ));
      setFormTouched(true);
    } catch (err) {
      console.error('Place fetch error:', err);
      toast.error('Kunde inte hämta platsdata');
    } finally {
      setLoadingPlace(false);
    }
  };

  const handlePlaceBlockSelect = async (place) => {
    setPlaceBlockSearch('');
    setPlaceBlockResults([]);
    setShowPlaceBlockPicker(false);
    setLoadingPlace(true);
    try {
      let facts;
      if (place.type === 'country' && place.countryCode) {
        facts = await fetchCountryFacts(place.countryCode);
      } else {
        facts = await fetchPlaceFacts(place.name, place.lat, place.lng, {
          country: place.country,
          state: place.state,
          city: place.city,
        });
      }
      const newBlock = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        title: 'Fakta',
        content: facts.content,
        defaultCollapsed: true,
        viewerEditable: false,
      };
      setCustomBlocks(prev => [...prev, newBlock]);
      setFormTouched(true);
      toast.success(`Fakta om ${facts.title} tillagt!`);
    } catch (err) {
      console.error('Place block fetch error:', err);
      toast.error('Kunde inte hämta platsdata');
    } finally {
      setLoadingPlace(false);
    }
  };

  const handleGPSCapture = () => {
    if (!navigator.geolocation) {
      toast.error('GPS stöds inte av din enhet');
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
            toast.error('Kunde inte hämta position: ' + error.message);
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
          toast.error('Kunde inte hämta position: ' + error.message);
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

  const handleExtractGPSFromImage = async () => {
    if (!originalImageFile || extractingGPS) return;
    
    setExtractingGPS(true);
    try {
      const gpsData = await extractGPSFromImage(originalImageFile);
      if (gpsData) {
        setLat(gpsData.lat);
        setLng(gpsData.lng);
        setFormTouched(true);
      } else {
        toast.info('Ingen platsdata hittades i bilden.');
      }
    } catch (e) {
      toast.error('Kunde inte läsa platsdata från bilden.');
    } finally {
      setExtractingGPS(false);
    }
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || uploadingImage) return;

    // Store original file for potential GPS extraction later
    setOriginalImageFile(file);

    setUploadingImage(true);
    try {
      let fileToUpload = file;
      try {
        const resizedBlob = await resizeImage(file, 1400, 0.70);
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
      toast.error('Kunde inte ladda upp bild. Försök igen!');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !title.trim()) {
      toast.error('Titel måste fyllas i!');
      return;
    }

    const blocks = [{ type: 'title', data: { text: title.trim() } }];
  
    if (!inheritLocation && ((lat !== null && lng !== null) || address.trim())) {
      blocks.push({ 
        type: 'location', 
        data: { 
          lat: lat !== null ? Number(lat) : null,
          lng: lng !== null ? Number(lng) : null,
          address: address.trim() || (lat !== null && lng !== null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : ''),
          note: '', // Primary location has no note by default
          isPrimary: true // Mark as primary location
        }
      });
    }
    
    // Extra location blocks are now in customBlocks and will be saved below

    if (imageUrl.trim()) {
      const imageData = { url: imageUrl.trim(), cropMode: imageCropMode };
      if (imageFocalPoint) imageData.focalPoint = imageFocalPoint;
      blocks.push({ type: 'image', data: imageData });
    }

    const currentCustomBlocks = customBlocksRef.current;
    
    currentCustomBlocks.forEach(block => {
      if (block.type === 'location') {
        // Extra location blocks (from quick capture or added manually)
        if (block.lat != null && block.lng != null) {
          blocks.push({
            type: 'location',
            data: {
              lat: block.lat,
              lng: block.lng,
              address: block.address || '',
              note: block.note || '',
              isPrimary: false // Mark as extra location
            }
          });
        }
      } else if (block.type === 'links') {
        const validLinks = (block.links || []).filter(l => l.url?.trim());
        if (validLinks.length > 0) {
          blocks.push({ 
            type: 'links', 
            data: { 
              title: (block.title || 'Länkar').trim(), 
              items: validLinks.map(l => ({
                title: l.title?.trim() || '',
                url: l.url.trim(),
                icon: l.icon || 'Link'
              })),
              defaultCollapsed: block.defaultCollapsed || false
            } 
          });
        }
      } else if (block.type === 'table') {
        // Always save table/list blocks, even if empty (skeleton)
        blocks.push({ 
          type: 'table', 
          data: { 
            title: (block.title || '').trim(), 
            template: block.template || 'tasks',
            columns: block.columns || [],
            rows: block.rows || [],
            defaultCollapsed: block.defaultCollapsed || false,
            viewerEditable: block.viewerEditable || false,
            col2Type: block.col2Type || 'text',
            showCheckbox: block.showCheckbox ?? true,
            yearMode: block.yearMode || false,
            ...(block.yearMode && block.yearData && Object.keys(block.yearData).length > 0 ? { yearData: block.yearData } : {})
          } 
        });
      } else if (block.type === 'datetag') {
        if (block.tags && block.tags.length > 0) {
          blocks.push({ 
            type: 'datetag', 
            data: { 
              tags: block.tags,
              defaultCollapsed: block.defaultCollapsed || false
            } 
          });
        }
      } else if (block.type === 'contact') {
        // Save contact block if any field is filled
        if (block.phone?.trim() || block.email?.trim() || block.website?.trim()) {
          blocks.push({ 
            type: 'contact', 
            data: { 
              phone: (block.phone || '').trim(),
              email: (block.email || '').trim(),
              website: (block.website || '').trim()
            } 
          });
        }
      } else if (block.type === 'timer') {
        // Save timer block if any timers exist
        if (block.timers && block.timers.length > 0) {
          blocks.push({ 
            type: 'timer', 
            data: { 
              timers: block.timers,
              defaultCollapsed: block.defaultCollapsed || false
            } 
          });
        }
      } else if (block.type === 'poll') {
        // Save poll block if any options exist OR allowSuggestions is enabled
        if ((block.options && block.options.length > 0) || block.allowSuggestions) {
          blocks.push({ 
            type: 'poll', 
            data: { 
              title: (block.title || 'Omröstning').trim(),
              pollType: block.pollType || 'date',
              options: block.options,
              votes: block.votes || {},
              closed: block.closed || false,
              allowSuggestions: block.allowSuggestions || false,
              defaultCollapsed: block.defaultCollapsed || false
            } 
          });
        }
      } else if (block.type === 'audio') {
        // Save audio block if URL exists
        if (block.url && block.url.trim()) {
          blocks.push({ 
            type: 'audio', 
            data: { 
              title: (block.title || 'Ljud').trim(),
              url: block.url.trim(),
              discrete: block.discrete !== false, // Default true
              animation: block.animation || 'none' // 'none', 'cykel', 'gris'
            } 
          });
        }
      } else if (block.type === 'split') {
        // Save split block if it has participants
        if (block.participants && block.participants.length > 0) {
          blocks.push({ 
            type: 'split', 
            data: { 
              title: (block.title || 'Splitt').trim(),
              model: block.model || 'individual',
              participants: block.participants.map(p => ({ ...p, paid: p.paid || 0 })),
              closed: block.closed || false,
              defaultCollapsed: block.defaultCollapsed ?? true
            } 
          });
        }
      } else if (block.type === 'leaderboard') {
        // Save leaderboard block - use competitionType-based default title
        const defaultTitle = (block.competitionType || 'score') === 'longestdrive' ? 'Longest Drive' : 'Leaderboard';
        blocks.push({ 
          type: 'leaderboard', 
          data: { 
            title: (block.title || defaultTitle).trim(),
            participants: block.participants || [],
            roundCount: block.roundCount || 0,
            scores: block.scores || {},
            shots: block.shots || {},
            rounds: block.rounds || [],
            status: block.status || 'active',
            sortOrder: block.sortOrder || 'desc',
            defaultCollapsed: block.defaultCollapsed ?? true,
            mode: block.mode || 'single',
            competitionType: block.competitionType || 'score',
            teams: block.teams || [
              { id: 1, name: 'Lag 1' },
              { id: 2, name: 'Lag 2' }
            ]
          } 
        });
      } else if (block.type === 'distribution') {
        // Save distribution block (carpool/tasks)
        blocks.push({ 
          type: 'distribution', 
          data: { 
            preset: block.preset || 'carpool',
            title: (block.title || (block.preset === 'tasks' ? 'Uppgifter' : 'Samåkning')).trim(),
            slots: block.slots || [],
            participants: block.participants || [],
            defaultCollapsed: block.defaultCollapsed ?? true
          } 
        });
      } else if (block.type === 'section') {
        // Save section block
        blocks.push({ 
          type: 'section', 
          data: { 
            title: (block.title || 'Sektion').trim(),
            uppercase: block.uppercase !== false
          } 
        });
      } else if (block.type === 'tiebreaker') {
        // Save tiebreaker block
        blocks.push({ 
          type: 'tiebreaker', 
          data: { 
            title: (block.title || 'Tiebreaker').trim(),
            bestOf: block.bestOf || 3,
            defaultCollapsed: block.defaultCollapsed ?? false,
            activeMatch: null,
            challenges: {},
            matchHistory: block.matchHistory || []
          } 
        });
      } else if (block.type === 'rating') {
        // Save rating block
        blocks.push({ 
          type: 'rating', 
          data: { 
            title: (block.title || 'Betyg').trim(),
            ratings: block.ratings || {}
          } 
        });
      } else if (block.type === 'gallery') {
        // Save gallery block
        if (block.images && block.images.length > 0) {
          blocks.push({ 
            type: 'gallery', 
            data: { 
              images: block.images.map(img => ({
                url: img.url,
                caption: img.caption || ''
              }))
            } 
          });
        }
      } else if (block.type === 'color') {
        blocks.push({
          type: 'color',
          data: {
            title: (block.title || 'Kulör').trim(),
            entries: block.entries || [],
            defaultCollapsed: block.defaultCollapsed ?? false
          }
        });
      } else if (block.type === 'text') {
        // Always save text blocks, even if empty (can be edited from view mode)
        blocks.push({ 
          type: 'text', 
          data: { 
            title: (block.title || 'Anteckning').trim(), 
            content: (block.content || '').trim(), 
            defaultCollapsed: block.defaultCollapsed || false,
            viewerEditable: block.viewerEditable || false
          } 
        });
      }
    });

    // Build save data
    const saveData = { type: selectedType, layerId: 'default', blocks, parentId: parentId || null, isCollection };
    
    // For collections (both edit and duplicate), include linked items
    // Note: linkedObjectNotes is NOT copied during duplicate - it contains time-specific info
    if (isCollection) {
      saveData.linkedObjectIds = linkedObjectIds;
      saveData.linkedUrls = linkedUrls;
      saveData.linkedOrder = linkedOrder;
      saveData.whatsappGroupUrl = whatsappGroupUrl.trim() || null;
      // linkedObjectNotes intentionally not included - will start fresh
    }
    
    onSave(saveData, isEdit ? editObject.id : null);
  };

  const addCustomBlock = (type, template = null) => {
    const newBlock = { id: Math.random().toString(36).substr(2, 9), type, title: '', content: '' };
    if (type === 'links') {
      newBlock.links = [{ title: '', url: '', icon: 'Link' }];
    }
    if (type === 'table') {
      newBlock.template = template || 'table';
      newBlock.rows = [];
      newBlock.columns = [];
      newBlock.col2Type = 'text'; // Default to text for new tables
      newBlock.showCheckbox = true; // Default to showing checkbox
      // Fusebox defaults to collapsed
      if (template === 'fusebox') {
        newBlock.defaultCollapsed = true;
      }
    }
    if (type === 'datetag') {
      newBlock.tags = [];
    }
    if (type === 'contact') {
      newBlock.phone = '';
      newBlock.email = '';
      newBlock.website = '';
    }
    if (type === 'timer') {
      newBlock.timers = [];
    }
    if (type === 'poll') {
      newBlock.pollType = 'date';
      newBlock.options = [];
      newBlock.votes = {};
      newBlock.closed = false;
    }
    if (type === 'audio') {
      newBlock.title = '';
      newBlock.url = '';
      newBlock.discrete = true; // Default to discrete mode
    }
    if (type === 'split') {
      newBlock.title = 'Splitt';
      newBlock.model = 'individual';
      newBlock.participants = [];
      newBlock.closed = false;
      newBlock.defaultCollapsed = true;
    }
    if (type === 'leaderboard') {
      newBlock.title = 'Leaderboard';
      newBlock.participants = [];
      newBlock.roundCount = 0;
      newBlock.scores = {};
      newBlock.shots = {};
      newBlock.rounds = [];
      newBlock.status = 'active';
      newBlock.sortOrder = 'desc';
      newBlock.defaultCollapsed = true;
      newBlock.mode = 'single';
      newBlock.competitionType = 'score';
    }
    if (type === 'distribution') {
      // template can be 'carpool' or 'tasks'
      newBlock.preset = template || 'carpool';
      newBlock.title = template === 'tasks' ? 'Uppgifter' : 'Samåkning';
      newBlock.slots = [];
      newBlock.defaultCollapsed = true;
    }
    if (type === 'section') {
      newBlock.title = 'Sektion';
      newBlock.uppercase = true;
    }
    if (type === 'tiebreaker') {
      newBlock.title = 'Tiebreaker';
      newBlock.bestOf = 3;
      newBlock.defaultCollapsed = false;
      newBlock.activeMatch = null;
      newBlock.challenges = {};
      newBlock.matchHistory = [];
    }
    if (type === 'rating') {
      newBlock.title = 'Betyg';
      newBlock.ratings = {};
    }
    if (type === 'gallery') {
      newBlock.images = [];
    }
    if (type === 'color') {
      newBlock.title = 'Kulör';
      newBlock.entries = [];
      newBlock.defaultCollapsed = true;
    }
    setCustomBlocks(prev => [...prev, newBlock]);
    setFormTouched(true);
  };

  const updateCustomBlock = (id, updates) => {
    setCustomBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    setFormTouched(true);
  };

  const removeCustomBlock = async (id) => {
    // Find the block to get its type/title for the confirmation message
    const block = customBlocks.find(b => b.id === id);
    const blockName = block?.title || block?.type || 'blocket';
    
    if (!await confirm({ title: 'Ta bort block?', message: `Vill du ta bort ${blockName}?`, confirmText: 'Ta bort', variant: 'danger' })) {
      return;
    }
    
    setCustomBlocks(prev => prev.filter(b => b.id !== id));
    setFormTouched(true);
  };

  // Block types rendered in the dedicated metadata section (not reorderable content)
  const METADATA_TYPES = ['rating', 'datetag', 'gallery'];

  const moveCustomBlock = (id, delta) => {
    setCustomBlocks(prev => {
      const items = [...prev];
      const from = items.findIndex(b => b.id === id);
      if (from === -1) return prev;
      // Skip over metadata blocks when moving content blocks
      let to = from + delta;
      while (to >= 0 && to < items.length && METADATA_TYPES.includes(items[to].type)) {
        to += delta;
      }
      if (to < 0 || to >= items.length) return prev;
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return items;
    });
    setFormTouched(true);
    
    // Scroll the moved block into view after React re-renders
    setTimeout(() => {
      const blockEl = document.querySelector(`[data-block-id="${id}"]`);
      if (blockEl) {
        blockEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  // ========== RENDER ==========
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 sm:bg-black/70 lg:bg-black/50 z-[1000] flex items-end sm:items-center justify-center lg:justify-end sm:p-8"
        onClick={(e) => { 
          if (!saving && e.target === e.currentTarget) onClose(); 
        }}
      >
        {/* Modal */}
        <div 
          className="bg-gray-900 sm:rounded-xl lg:rounded-2xl border-t sm:border border-white/10 w-full sm:max-w-2xl sm:w-[90%] lg:w-[45%] h-full sm:h-auto sm:max-h-[90vh] lg:h-[calc(100dvh-2rem)] lg:max-h-none overflow-hidden flex flex-col pt-[var(--sat)] sm:pt-0"
          style={{ touchAction: 'pan-y' }}
        >
          
          {/* Header */}
          <div className="flex-shrink-0 px-4 lg:px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Plus size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{isEdit ? 'Redigera objekt' : isDuplicate ? 'Kopiera objekt' : 'Skapa nytt objekt'}</h2>
                <p className="text-xs text-gray-400">{isEdit ? 'Uppdatera detaljer' : isDuplicate ? 'Skapa kopia med nya ändringar' : 'Fyll i detaljer nedan'}</p>
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
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6 space-y-6">
            
            {/* Category selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Välj kategori</label>
              <div className="grid grid-cols-5 gap-2">
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

            {/* Template picker - only for new objects with matching templates */}
            {!isEdit && !isDuplicate && availableTemplates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Startmall</label>
                <div className="flex flex-wrap gap-2">
                  {availableTemplates.map(t => {
                    const TplIcon = getIconComponent(t.icon);
                    const isActive = selectedTemplate === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTemplateSelect(t.id)}
                        disabled={saving}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                          isActive
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <TplIcon size={16} className={isActive ? 'text-blue-400' : 'text-gray-400'} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedTemplate && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    {OBJECT_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                  </p>
                )}

                {/* Place/country picker for Plats template */}
                {selectedTemplate === 'country' && (
                  <div className="mt-3">
                    {/* Results shown ABOVE the input so they aren't hidden by the iOS keyboard */}
                    {placeSearch.length >= 2 && !selectedPlace && placeResults.length > 0 && (
                      <div className="mb-1 max-h-48 overflow-y-auto bg-gray-800 border border-white/10 rounded-lg shadow-xl">
                        {placeResults.map((p, i) => (
                          <button
                            key={`${p.lat}-${p.lng}-${i}`}
                            type="button"
                            onClick={() => handlePlaceSelect(p)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                          >
                            <span className="text-lg">{p.type === 'country' ? '🏳️' : '📍'}</span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{p.name}</div>
                              {p.displayName !== p.name && (
                                <div className="text-xs text-gray-500 truncate">{p.displayName}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {placeSearch.length >= 2 && !selectedPlace && placeResults.length === 0 && !searchingPlace && (
                      <div className="mb-1 px-3 py-2 text-sm text-gray-500 bg-gray-800 border border-white/10 rounded-lg">Inga resultat</div>
                    )}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={selectedPlace ? selectedPlace.displayName : placeSearch}
                        onChange={(e) => {
                          setPlaceSearch(e.target.value);
                          if (selectedPlace) { setSelectedPlace(null); setPlaceResults([]); }
                        }}
                        onFocus={() => { if (selectedPlace) { setSelectedPlace(null); setPlaceSearch(''); setPlaceResults([]); } }}
                        placeholder="Sök land, stad eller plats..."
                        disabled={saving || loadingPlace}
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                      {(loadingPlace || searchingPlace) && (
                        <Loader size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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

            {/* Collection toggle */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${hasChildren ? 'bg-white/[0.03] border-white/5' : 'bg-white/5 border-white/10'}`}>
              <button
                type="button"
                onClick={() => { 
                  if (!hasChildren) {
                    setIsCollection(!isCollection); 
                    setFormTouched(true); 
                  }
                }}
                disabled={saving || hasChildren}
                className={`relative w-11 h-6 rounded-full transition-colors ${hasChildren ? 'bg-white/10 cursor-not-allowed' : isCollection ? 'bg-blue-500' : 'bg-white/20'}`}
              >
                <span 
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isCollection && !hasChildren ? 'translate-x-5' : 'translate-x-0'}`} 
                />
              </button>
              <div className="flex-1">
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  <ClipboardList size={16} className={hasChildren ? 'text-gray-500' : 'text-blue-400'} />
                  Samlingsvy
                </div>
                {hasChildren ? (
                  <div className="text-xs text-yellow-500">Kan inte ändras – objektet har barn</div>
                ) : (
                  <div className="text-xs text-gray-500">Samlar och visar andra objekt (kan ej ha barn)</div>
                )}
              </div>
            </div>

            {/* Inherit location checkbox - shown when parent has location */}
            {!hideLocation && parentId && parentHasLocation && (
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

            {/* Basic settings section - collapsible */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
              {/* Header */}
              <button
                type="button"
                onClick={() => setShowBasicSettings(!showBasicSettings)}
                className="w-full flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronDown 
                  size={16} 
                  className={`text-gray-500 transition-transform ${showBasicSettings ? '' : '-rotate-90'}`} 
                />
                <span className="text-sm font-medium text-gray-300">Grundinställningar</span>
              </button>

              {/* Content */}
              {showBasicSettings && (
                <div className="p-3 pt-0 space-y-4">
                  {/* Parent selector */}
                  <div className="pt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Lägg under objekt (valfritt)</label>
                    <div className="relative" ref={parentDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setParentDropdownOpen(!parentDropdownOpen);
                          setParentSearchQuery('');
                          setTimeout(() => parentSearchRef.current?.focus(), 50);
                        }}
                        disabled={saving}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 text-left flex items-center justify-between gap-2"
                      >
                        <span className={parentId ? 'text-white' : 'text-gray-400'}>
                          {parentId
                            ? (availableParents.find(p => p.id === parentId)?.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlöst')
                            : '- Inget parent-objekt -'}
                        </span>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${parentDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {parentDropdownOpen && (() => {
                        const rect = parentDropdownRef.current?.getBoundingClientRect();
                        const top = rect ? rect.bottom + 4 : 100;
                        const left = rect ? rect.left : 16;
                        const width = rect ? rect.width : 300;
                        return (
                        <>
                          <div className="fixed inset-0 z-[9998]" onClick={() => setParentDropdownOpen(false)} />
                          <div className="fixed rounded-xl bg-gray-800 border border-white/10 shadow-2xl z-[9999] flex flex-col" style={{ top, left, width, maxHeight: 'min(50vh, 400px)' }}>
                            <div className="p-2 border-b border-white/10 flex-shrink-0">
                              <input
                                ref={parentSearchRef}
                                type="text"
                                value={parentSearchQuery}
                                onChange={(e) => setParentSearchQuery(e.target.value)}
                                placeholder="Sök objekt..."
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="overflow-y-auto flex-1" style={{ minHeight: '200px' }}>
                              <button
                                type="button"
                                onClick={() => { setParentId(''); setFormTouched(true); setParentDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${!parentId ? 'text-blue-400 bg-white/5' : 'text-gray-300'}`}
                              >
                                - Inget parent-objekt -
                              </button>
                              {categories.map(category => {
                                const objectsInCategory = availableParents.filter(obj => {
                                  if (obj.type !== category.id) return false;
                                  if (!parentSearchQuery) return true;
                                  const title = obj.blocks?.find(b => b.type === 'title')?.data?.text || '';
                                  return title.toLowerCase().includes(parentSearchQuery.toLowerCase());
                                });
                                if (objectsInCategory.length === 0) return null;
                                return (
                                  <div key={category.id}>
                                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white/[0.02]">{category.label}</div>
                                    {objectsInCategory.map(obj => {
                                      const objTitle = obj.blocks?.find(b => b.type === 'title')?.data?.text || 'Namnlöst';
                                      return (
                                        <button
                                          key={obj.id}
                                          type="button"
                                          onClick={() => { setParentId(obj.id); setFormTouched(true); setParentDropdownOpen(false); }}
                                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${parentId === obj.id ? 'text-blue-400 bg-white/5' : 'text-white'}`}
                                        >
                                          {objTitle}
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Location */}
                  {!hideLocation && !inheritLocation && (
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
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleGPSCapture}
                            disabled={saving || capturingGPS}
                            className="flex-1 px-3 py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 active:bg-white/20 flex items-center justify-center gap-2 touch-manipulation"
                          >
                            <Navigation size={18} className={capturingGPS ? 'animate-pulse' : ''} />
                            <span className="text-sm font-medium">
                              {capturingGPS ? (gpsAccuracy ? `±${gpsAccuracy}m` : '...') : 'Min plats'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowMapPicker(true)}
                            disabled={saving}
                            className="flex-1 px-3 py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 active:bg-white/20 flex items-center justify-center gap-2 touch-manipulation"
                          >
                            <MapIcon size={18} />
                            <span className="text-sm font-medium">På karta</span>
                          </button>
                          {originalImageFile && (
                            <button
                              type="button"
                              onClick={handleExtractGPSFromImage}
                              disabled={saving || extractingGPS}
                              className="flex-1 px-3 py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 active:bg-white/20 flex items-center justify-center gap-2 touch-manipulation"
                            >
                              <ImageIcon size={18} className={extractingGPS ? 'animate-pulse' : ''} />
                              <span className="text-sm font-medium">{extractingGPS ? '...' : 'Från bild'}</span>
                            </button>
                          )}
                        </div>
                        {lat !== null && lng !== null && (
                          <div className="flex items-center justify-between text-xs text-gray-500 bg-white/5 p-2 rounded-lg">
                            <span className="flex items-center gap-1"><MapPin size={12} /> {lat.toFixed(5)}, {lng.toFixed(5)}</span>
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
                            onClick={() => { setImageUrl(''); setImageFocalPoint(null); setOriginalImageFile(null); setFormTouched(true); }}
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
                          onClick={() => setShowStockPicker(!showStockPicker)}
                          disabled={uploadingImage || saving}
                          className={`flex-1 px-4 py-3 rounded-xl border text-sm flex items-center justify-center gap-2 ${showStockPicker ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                        >
                          <ImageIcon size={18} />
                          <span>Stock</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const url = await prompt({ title: 'Bild-URL', placeholder: 'https://...' });
                            if (url?.trim()) { setImageUrl(url.trim()); setFormTouched(true); }
                          }}
                          disabled={uploadingImage || saving}
                          className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm"
                        >
                          URL
                        </button>
                      </div>
                      
                      {/* Stock Image Picker */}
                      {showStockPicker && (
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                          <div className="text-xs text-gray-400 mb-2">Välj en stockbild</div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.keys(STOCK_IMAGES).map(key => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  const img = STOCK_IMAGES[key][0];
                                  setImageUrl(img.url);
                                  setImageFocalPoint(null);
                                  setShowStockPicker(false);
                                  setFormTouched(true);
                                }}
                                className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg text-gray-300 hover:text-white transition-colors"
                              >
                                {key === 'food' ? 'Mat' : key === 'travel' ? 'Resor' : key === 'nature' ? 'Natur' : key === 'vehicle' ? 'Fordon' : key === 'golf' ? 'Golf' : key === 'home' ? 'Hus' : key === 'todo' ? 'Att göra' : key === 'shopping' ? 'Shopping' : key}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Primary location display - only show if there are extra locations (pinnings) */}
            {customBlocks.some(b => b.type === 'location') && (
              <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="flex items-center gap-2 p-3">
                  <MapPin size={16} className="text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-300">
                    Plats #1 <span className="text-gray-500 font-normal">(primär)</span>
                  </span>
                  <span className="text-xs text-gray-500 truncate ml-1 flex-1">
                    {lat != null && lng != null 
                      ? (address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
                      : <span className="text-amber-500 italic">Saknas – ange under Plats ovan</span>
                    }
                  </span>
                  {lat != null && lng != null && (
                    <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded">Readonly</span>
                  )}
                </div>
              </div>
            )}

            {/* Metadata section – rating + datetag (fixed position, not reorderable) */}
            {(() => {
              const metadataBlocks = customBlocks.filter(b => METADATA_TYPES.includes(b.type));
              const hasRating = metadataBlocks.some(b => b.type === 'rating');
              const hasDateTag = metadataBlocks.some(b => b.type === 'datetag');
              const hasGallery = metadataBlocks.some(b => b.type === 'gallery');
              const hasWhatsapp = isCollection && whatsappAdded;
              // Always show section so add buttons are accessible
              return (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 uppercase">Metadata</div>
                  {metadataBlocks.map((block) => (
                    <ScrollOnExpandWrapper key={block.id} blockId={block.id}>
                      <BlockEditor
                        block={block}
                        onUpdate={updateCustomBlock}
                        onRemove={removeCustomBlock}
                        onMove={moveCustomBlock}
                        index={0}
                        total={1}
                        saving={saving}
                        hideReorder
                      />
                    </ScrollOnExpandWrapper>
                  ))}
                  {/* WhatsApp – collection-only, metadata-style collapsible */}
                  {hasWhatsapp && (
                    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                      <div className="flex items-center gap-2 p-3">
                        <button
                          type="button"
                          onClick={() => setWhatsappExpanded(prev => !prev)}
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          <ChevronDown size={16} className={`text-gray-500 transition-transform flex-shrink-0 ${whatsappExpanded ? '' : '-rotate-90'}`} />
                          <MessageCircle size={16} className="text-blue-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-300 truncate">
                            WhatsApp
                          </span>
                          {!whatsappExpanded && whatsappGroupUrl && (
                            <span className="text-xs text-gray-500 truncate flex-shrink min-w-0">{whatsappGroupUrl.replace(/^https?:\/\//, '').slice(0, 30)}</span>
                          )}
                        </button>
                        <button type="button" onClick={() => { setWhatsappGroupUrl(''); setWhatsappAdded(false); setWhatsappExpanded(false); setFormTouched(true); }} className="w-7 h-7 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                      {whatsappExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          <input
                            type="url"
                            value={whatsappGroupUrl}
                            onChange={(e) => { setWhatsappGroupUrl(e.target.value); setFormTouched(true); }}
                            disabled={saving}
                            placeholder="https://chat.whatsapp.com/..."
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500">Länk till gruppens WhatsApp-chatt</p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Quick-add buttons for missing metadata types */}
                  {(!hasDateTag || !hasRating || !hasGallery || (isCollection && !hasWhatsapp)) && (
                    <div className="flex gap-2 flex-wrap">
                      {!hasDateTag && (
                        <button type="button" onClick={() => addCustomBlock('datetag')} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-dashed border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10 text-xs transition-colors">
                          <Calendar size={12} /> + Datum
                        </button>
                      )}
                      {!hasRating && (
                        <button type="button" onClick={() => addCustomBlock('rating')} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-dashed border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10 text-xs transition-colors">
                          <Star size={12} /> + Betyg
                        </button>
                      )}
                      {!hasGallery && (
                        <button type="button" onClick={() => addCustomBlock('gallery')} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-dashed border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10 text-xs transition-colors">
                          <Images size={12} /> + Galleri
                        </button>
                      )}
                      {isCollection && !hasWhatsapp && (
                        <button type="button" onClick={() => { setWhatsappAdded(true); setWhatsappExpanded(true); }} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-dashed border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10 text-xs transition-colors">
                          <MessageCircle size={12} /> + WhatsApp
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Content blocks (excludes metadata types) */}
            {(() => {
              const contentBlocks = customBlocks.filter(b => !METADATA_TYPES.includes(b.type));
              if (contentBlocks.length === 0) return null;
              return (
                <>
                <div className="text-xs text-gray-500 uppercase">Innehåll</div>
                {contentBlocks.map((block, index) => {
                // For location blocks in customBlocks, they are always "extra" locations (position 2+)
                const locationBlocksBeforeThis = contentBlocks.slice(0, index).filter(b => b.type === 'location').length;
                const locationDisplayNumber = block.type === 'location' ? locationBlocksBeforeThis + 2 : 0;
                const locationIndexOffset = block.type === 'location' 
                  ? locationDisplayNumber - index - 1 
                  : 0;
                
                return (
                  <ScrollOnExpandWrapper key={block.id} blockId={block.id}>
                    <BlockEditor
                      block={block}
                      onUpdate={updateCustomBlock}
                      onRemove={removeCustomBlock}
                      onMove={moveCustomBlock}
                      index={index}
                      total={contentBlocks.length}
                      saving={saving}
                      locationIndexOffset={locationIndexOffset}
                      shares={effectiveSharesWithDemo}
                      currentUser={currentUser}
                      currentUserDisplayName={currentUserDisplayName}
                    />
                  </ScrollOnExpandWrapper>
                );
              })}
              </>
              );
            })()}

            {/* Add block buttons */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs text-gray-600 uppercase mb-2">Lägg till block</div>
              
              {/* Primary blocks - always visible */}
              <div className="flex gap-1.5">
                <button type="button" onClick={() => addCustomBlock('text')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                  <FileText size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Text
                </button>
                <button type="button" onClick={() => addCustomBlock('table', 'list')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                  <CheckSquare size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Lista
                </button>
                <button type="button" onClick={() => addCustomBlock('table')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                  <Table2 size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Tabell
                </button>
                
                {/* Expand/collapse */}
                <button 
                  type="button" 
                  onClick={() => {
                    const willExpand = !showMoreBlocks;
                    setShowMoreBlocks(willExpand);
                    if (willExpand) {
                      setTimeout(() => {
                        const scrollContainer = document.querySelector('.overflow-y-auto');
                        if (scrollContainer) {
                          scrollContainer.scrollBy({ top: 200, behavior: 'smooth' });
                        }
                      }, 50);
                    }
                  }} 
                  className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-gray-600 hover:text-gray-400 text-xs transition-colors ml-auto"
                >
                  {showMoreBlocks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showMoreBlocks ? 'Färre' : 'Fler'}
                </button>
              </div>
              
              {/* Secondary blocks - expandable */}
              {showMoreBlocks && (
                <div className="grid grid-cols-3 gap-x-1 gap-y-0.5 mt-1.5 pt-1.5 border-t border-white/5">
                  <button type="button" onClick={() => addCustomBlock('links')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Link2 size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Länkar
                  </button>
                  <button type="button" onClick={() => addCustomBlock('contact')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Phone size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Kontakt
                  </button>
                  <button type="button" onClick={() => addCustomBlock('timer')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Timer size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Timers
                  </button>
                  <button type="button" onClick={() => addCustomBlock('poll')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <BarChart3 size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Omröstning
                  </button>
                  <button type="button" onClick={() => addCustomBlock('section')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Minus size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Sektion
                  </button>
                  <button type="button" onClick={() => addCustomBlock('split')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Wallet size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Splitt
                  </button>
                  <button type="button" onClick={() => addCustomBlock('distribution', 'carpool')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Car size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Samåkning
                  </button>
                  <button type="button" onClick={() => addCustomBlock('distribution', 'tasks')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Users size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Uppgifter
                  </button>
                  <button type="button" onClick={() => addCustomBlock('leaderboard')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Trophy size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Golf
                  </button>
                  <button type="button" onClick={() => addCustomBlock('tiebreaker')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Swords size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Tiebreaker
                  </button>
                  <button type="button" onClick={() => addCustomBlock('table', 'fusebox')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Zap size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Proppskåp
                  </button>
                  <button type="button" onClick={() => addCustomBlock('color')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    <Palette size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Kulör
                  </button>
                  <button type="button" onClick={() => { 
                    setShowPlaceBlockPicker(true);
                    setTimeout(() => {
                      placeBlockInputRef.current?.focus();
                      placeBlockPickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 150);
                  }} disabled={saving || loadingPlace} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                    {loadingPlace ? <Loader size={14} className="animate-spin text-blue-400" /> : <Globe size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" />} Platsfakta
                  </button>
                  {isAdmin && (
                    <button type="button" onClick={() => addCustomBlock('audio')} disabled={saving} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 text-xs transition-colors">
                      <Music size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" /> Ljud
                    </button>
                  )}
                </div>
              )}
              {/* Place/country block picker - inline search */}
              {showPlaceBlockPicker && (
                <div ref={placeBlockPickerRef} className="mt-2 pt-2 border-t border-white/5">
                  {/* Results shown ABOVE the input so they aren't hidden by the iOS keyboard */}
                  {placeBlockSearch.length >= 2 && placeBlockResults.length > 0 && (
                    <div className="mb-1 max-h-48 overflow-y-auto bg-gray-800 border border-white/10 rounded-lg shadow-xl">
                      {placeBlockResults.map((p, i) => (
                        <button
                          key={`${p.lat}-${p.lng}-${i}`}
                          type="button"
                          onClick={() => handlePlaceBlockSelect(p)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                        >
                          <span className="text-lg">{p.type === 'country' ? '🏳️' : '📍'}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{p.name}</div>
                            {p.displayName !== p.name && (
                              <div className="text-xs text-gray-500 truncate">{p.displayName}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {placeBlockSearch.length >= 2 && placeBlockResults.length === 0 && !searchingPlaceBlock && (
                    <div className="mb-1 px-3 py-2 text-sm text-gray-500 bg-gray-800 border border-white/10 rounded-lg">Inga resultat</div>
                  )}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      ref={placeBlockInputRef}
                      type="text"
                      value={placeBlockSearch}
                      onChange={(e) => setPlaceBlockSearch(e.target.value)}
                      placeholder="Sök land, stad eller plats..."
                      disabled={saving || loadingPlace}
                      className="w-full pl-9 pr-10 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    {searchingPlaceBlock && (
                      <Loader size={14} className="absolute right-7 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
                    )}
                    <button
                      type="button"
                      onClick={() => { setShowPlaceBlockPicker(false); setPlaceBlockSearch(''); setPlaceBlockResults([]); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 text-gray-400 hover:text-white flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 lg:px-6 border-t border-white/10 bg-gray-900">
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={saving} 
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 active:bg-white/20 touch-manipulation"
              >
                Avbryt
              </button>
              <button 
                type="button" 
                onClick={(e) => {
                  // Blur any focused input first to ensure iOS processes the click
                  if (document.activeElement && document.activeElement.blur) {
                    document.activeElement.blur();
                  }
                  handleSubmit(e);
                }}
                disabled={saving || (isEdit && !hasChanges)} 
                className={`flex-1 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 touch-manipulation ${
                  isEdit && !hasChanges 
                    ? 'bg-white/10 text-gray-400' 
                    : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white'
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

export default CreateObjectModal;
