import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Plus, Edit2, Trash2, Settings, ChevronDown, ChevronUp,
  Share2, Users, UserMinus, Home, List, LayoutGrid, Copy, ClipboardList, Link2, X, Search, ExternalLink, Map as MapIcon, Calendar
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getIconComponent, PREDEFINED_ICONS, emailToKey } from '../utils/iconHelpers';
import { getTransformedImageUrl, getFocalPointStyles } from '../utils/imageUtils';
import { getObjectDistance, formatDistance } from '../utils/geoUtils';
import { useSwipeToClose } from '../utils/useSwipeToClose';
import { blockComponents } from './blocks';
import { HeroInfoBlock } from './blocks/HeroInfoBlock';
import DeleteConfirmModal from './DeleteConfirmModal';
import LeaderboardModal from './LeaderboardModal';
import DistributionModal from './DistributionModal';
import { FullscreenTextEditor } from './BlockEditor';
import { ListEditorModal } from './ListEditorModal';
import { SimpleTableEditorModal, MultiColumnTableEditorModal } from './SimpleTableEditorModal';
import { TABLE_TEMPLATES } from './blocks';
import PlannerModal from './PlannerModal';
import CollectionMapView from './map/CollectionMapView';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { usePrompt } from '../utils/usePrompt';
import { useToast } from '../utils/useToast';

// Folder icon - we'll define it locally since it's only used here
const Folder = ({ size = 24, ...props }) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

// Helper to get/set pending locations from localStorage
const PENDING_LOCATIONS_KEY = STORAGE_KEYS.PENDING_LOCATIONS;

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

function ObjectDetail({ object, onClose, onEdit, onDelete, onDuplicate, onBlockUpdate, currentUser, userDisplayName, userLocation, showQuickCapture, allObjects, onNavigate, onGoBack, previousObject, categories, isAdmin, onShowOnMap, onShare, onLeaveShare, collections, onAddToCollection, onRemoveFromCollection, onUpdateLinkedNote, onAddLinkedUrl, onUpdateLinkedUrl, onRemoveLinkedUrl, onReorderLinked, preciseGPS = true, openPlannerOnReturn, onClearPlannerReturn }) {
  const prompt = usePrompt();
  const toast = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showManageSection, setShowManageSection] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showAddObjectPicker, setShowAddObjectPicker] = useState(false);
  const [objectSearchQuery, setObjectSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const editingNoteRef = useRef({ id: null, text: '' }); // Track current editing state for save-before-switch
  const [linkedEditMode, setLinkedEditMode] = useState(false);
  const [showAddUrlForm, setShowAddUrlForm] = useState(false);
  const [newUrlTitle, setNewUrlTitle] = useState('');
  const [newUrlValue, setNewUrlValue] = useState('');
  const [newUrlNote, setNewUrlNote] = useState('');
  const [editingUrlId, setEditingUrlId] = useState(null);
  const [childViewMode, setChildViewMode] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.CHILD_VIEW_MODE) || 'grid';
  });
  const [leaderboardModalData, setLeaderboardModalData] = useState(null); // { blockIndex, data }
  const [textEditModalData, setTextEditModalData] = useState(null); // { blockIndex, content, title }
  const [tableEditModalData, setTableEditModalData] = useState(null); // { blockIndex, rows, columns, template, title }
  const [distributionModalData, setDistributionModalData] = useState(null); // { blockIndex, data }
  const [showCollectionMap, setShowCollectionMap] = useState(false); // For collection map modal
  const [showMultiLocationMap, setShowMultiLocationMap] = useState(false); // For multi-location objects map
  const [showPlanner, setShowPlanner] = useState(false); // For trip planner modal
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
          toast.success(`${pending.length} sparade platser synkade!`);
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
    localStorage.setItem(STORAGE_KEYS.CHILD_VIEW_MODE, newMode);
  };
  
  // Helper: update a single block's data in Firestore
  // For simple merges:  updateBlockField(idx, { votes: newVotes })
  // For transforms:     updateBlockField(idx, (data) => ({ ...data, options: [...data.options, newOpt] }))
  const updateBlockField = useCallback(async (blockIndex, changes) => {
    try {
      const updatedBlocks = [...object.blocks];
      const currentData = updatedBlocks[blockIndex].data;
      const newData = typeof changes === 'function' ? changes(currentData) : { ...currentData, ...changes };
      updatedBlocks[blockIndex] = { ...updatedBlocks[blockIndex], data: newData };
      await updateDoc(doc(db, 'objects', object.id), { blocks: updatedBlocks });
    } catch (err) {
      console.error('Error updating block:', err);
    }
  }, [object.id, object.blocks]);
  
  // Swipe to close
  const swipe = useSwipeToClose(onClose, { guardInteractive: true });
  const manageSectionRef = useRef(null);
  
  // Scroll manage section into view when opened
  useEffect(() => {
    if (showManageSection && manageSectionRef.current) {
      setTimeout(() => {
        manageSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50); // Small delay to let the animation start
    }
  }, [showManageSection]);
  
  
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
  const isDemoObject = object.isDemoObject || object.isDemo;
  
  // Open planner automatically when returning from linked object
  useEffect(() => {
    if (openPlannerOnReturn && isCollection && object.planningData) {
      setShowPlanner(true);
      onClearPlannerReturn?.();
    }
  }, [openPlannerOnReturn, isCollection, object.planningData, onClearPlannerReturn]);
  
  // Demo user identity: non-admins become "Anna" when viewing demo objects
  const demoUserIdentity = isDemoObject && !isAdmin ? {
    uid: 'demo_anna',
    email: 'anna.demo.se',
    displayName: 'Anna'
  } : null;
  const effectiveUser = demoUserIdentity || currentUser;
  const effectiveDisplayName = demoUserIdentity ? 'Anna' : userDisplayName;
  
  const userEmailKey = currentUser?.email ? emailToKey(currentUser.email.toLowerCase()) : null;
  const myShareRole = isSharedWithMe && userEmailKey ? object.shares?.[userEmailKey]?.role : null;
  // Demo objects are read-only for everyone except admins
  const canEdit = isDemoObject ? isAdmin : (isOwner || isAdmin || myShareRole === 'editor');
  const canManage = isDemoObject ? isAdmin : (isOwner || isAdmin);
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
  const linkedUrls = object.linkedUrls || [];
  
  // Helper function to save current note and switch to a new one
  const saveAndSwitchNote = (newId, newText) => {
    const currentId = editingNoteRef.current.id;
    const currentText = editingNoteRef.current.text;
    
    // Save current note if one is being edited
    if (currentId && currentId !== newId) {
      if (currentId.startsWith('url_')) {
        // It's a URL note
        const urlId = currentId.replace('url_', '');
        const urlItem = linkedUrls.find(u => u.id === urlId);
        if (urlItem && onUpdateLinkedUrl) {
          onUpdateLinkedUrl(object.id, urlId, { ...urlItem, note: currentText.trim() });
        }
      } else {
        // It's an object note
        if (onUpdateLinkedNote) {
          onUpdateLinkedNote(object.id, currentId, currentText.trim());
        }
      }
    }
    
    // Update ref and state for new note
    editingNoteRef.current = { id: newId, text: newText };
    setEditingNoteId(newId);
    setEditingNoteText(newText);
  };

  // Keep ref in sync with state
  useEffect(() => {
    editingNoteRef.current = { id: editingNoteId, text: editingNoteText };
  }, [editingNoteId, editingNoteText]);

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
  // Show map button for non-collection objects:
  //   - Always if 2+ locations (multi-location view is useful)
  //   - With 1 location only if showQuickCapture is on (FAB enables adding more)
  const showLocationMap = !isCollection && (hasMultipleLocations || (ownLocationBlocks.length >= 1 && showQuickCapture));
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
  const allDescendants = useMemo(() => 
    allObjects.filter(o => o.ancestorIds?.includes(object.id)),
    [allObjects, object.id]
  );
  
  // Inherit location from parent if child doesn't have one
  const hasOwnLocation = object.blocks.some(b => b.type === 'location');
  const parentLocation = parentObject?.blocks?.find(b => b.type === 'location');
  
  // Track original index in object.blocks for each block (memoized)
  const blocksToRender = useMemo(() => {
    const rawBlocks = object.blocks.map((block, idx) => ({ ...block, objectBlockIndex: idx }));
    
    // Add inherited location if needed
    if (!hasOwnLocation && parentLocation) {
      rawBlocks.push({ type: 'location', data: parentLocation.data, inherited: true, objectBlockIndex: -1 });
    }
    
    return rawBlocks.sort((a, b) => {
      const order = { 'title': 0, 'image': 1, 'location': 2, 'contact': 2.5 };
      const aOrder = order[a.type];
      const bOrder = order[b.type];
      
      if (aOrder !== undefined && bOrder !== undefined) {
        return aOrder - bOrder;
      }
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return a.objectBlockIndex - b.objectBlockIndex;
    });
  }, [object.blocks, hasOwnLocation, parentLocation]);

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
          ref={swipe.ref}
          className={`bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 sm:rounded-xl lg:rounded-2xl border-t sm:border border-white/10 sm:border-white/[0.08] w-full sm:max-w-lg lg:max-w-xl sm:w-[90%] lg:w-[40%] h-full sm:h-auto sm:max-h-[85vh] lg:h-[calc(100dvh-2rem)] lg:max-h-none overflow-hidden flex flex-col pt-[var(--sat)] sm:pt-0 ${swipe.className} relative sm:shadow-2xl sm:shadow-black/50`}
          style={swipe.style}
          {...swipe.handlers}
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
                  {isDemoObject && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                      Demo
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
          ) : parentObject ? (
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
          ) : (
            <div className="px-4 py-2 border-b border-white/5">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                <span>Tillbaka till översikten</span>
              </button>
            </div>
          )}
          
          {/* Scrollable content */}
          <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-5 lg:p-6 pb-8 sm:pb-10 lg:pb-6">
            <div className="space-y-5">
              {/* Show multi-location map button at top if no image block exists */}
              {!hasImageBlock && showLocationMap && (
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setShowMultiLocationMap(true)}
                    className="h-9 px-3 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-all"
                    title="Visa platser på karta"
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
                  .filter(block => !(block.type === 'location' && block.data?.isPrimary === true && !block.inherited)) // Hide primary location from list (rendered separately after image)
                  .filter(block => !(block.type === 'gallery' && hasImageBlock)) // Hide gallery block if there's an image (shown via ImageBlock thumbnails)
                  .filter(block => block.type !== 'rating' && block.type !== 'datetag'); // Rating + datetag rendered in metadata row
                
                // Extract rating and datetag blocks for the metadata row
                const ratingBlock = blocksToRender.find(b => b.type === 'rating');
                const dateTagBlock = blocksToRender.find(b => b.type === 'datetag');
                
                // onRate handler for the inline rating in metadata row
                const handleMetadataRate = ratingBlock ? async (newRatings) => {
                  await updateBlockField(ratingBlock.objectBlockIndex, { ratings: newRatings });
                } : undefined;
                
                // Unified hero info: location + rating + dates + planner + actions
                // Note: onEditNote omitted for primary location — notes are for extra locations only (e.g. mushroom spots)
                const renderHeroInfo = () => {
                  const hasContent = primaryLocationBlock || ratingBlock || dateTagBlock;
                  if (!hasContent) return null;
                  return (
                    <HeroInfoBlock
                      locationData={primaryLocationBlock?.data}
                      onShowOnMap={onShowOnMap ? (coords) => onShowOnMap(coords, object.id) : undefined}
                      canDelete={false}
                      hasAudio={audioIsDiscrete && audioUrl && !audioError}
                      isAudioPlaying={isAudioPlaying}
                      onToggleAudio={toggleAudio}
                      isCollection={isCollection}
                      collectionPlacesCount={isCollection ? linkedObjectsWithCoords.length : 0}
                      onShowCollectionMap={isCollection && linkedObjectsWithCoords.length > 0 ? () => setShowCollectionMap(true) : undefined}
                      whatsappGroupUrl={isCollection && linkedObjectsCount > 0 ? object.whatsappGroupUrl : undefined}
                      ratingData={ratingBlock?.data}
                      currentUser={effectiveUser}
                      onRate={handleMetadataRate}
                      dateTagData={dateTagBlock?.data}
                      planningData={isCollection ? object.planningData : undefined}
                      onShowPlanner={isCollection && object.planningData ? () => setShowPlanner(true) : undefined}
                    />
                  );
                };
                
                // If no image block, render hero info at the top
                const heroInfoAtTop = !hasImageBlock ? renderHeroInfo() : null;
                
                return (
                  <>
                    {heroInfoAtTop}
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
                    toast.error('Kunde inte ta bort position');
                  }
                };
                
                const handleEditNote = block.type === 'location' && canEdit && !block.inherited ? async () => {
                  const currentNote = block.data?.note || '';
                  const newNote = await prompt({ title: 'Anteckning', placeholder: 'Skriv en anteckning...', defaultValue: currentNote });
                  if (newNote === null) return;
                  updateBlockField(actualBlockIndex, { note: newNote });
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
                          isCollection={block.type === 'location' && isCollection}
                          collectionPlacesCount={block.type === 'location' && isCollection ? linkedObjectsWithCoords.length : 0}
                          onShowCollectionMap={block.type === 'location' && isCollection && linkedObjectsWithCoords.length > 0 ? () => setShowCollectionMap(true) : undefined}
                          whatsappGroupUrl={block.type === 'location' && isCollection && linkedObjectsCount > 0 ? object.whatsappGroupUrl : undefined}
                          // Location & Image block: centralized audio props
                          hasAudio={(block.type === 'location' && !block.inherited || block.type === 'image') && audioIsDiscrete && audioUrl && !audioError}
                          isAudioPlaying={(block.type === 'location' || block.type === 'image') ? isAudioPlaying : undefined}
                          onToggleAudio={(block.type === 'location' || block.type === 'image') ? toggleAudio : undefined}
                          // Image block: animation props + gallery images + date overlay
                          isPlaying={block.type === 'image' && audioIsDiscrete ? isAudioPlaying : false}
                          animation={block.type === 'image' ? audioAnimation : 'none'}
                          galleryImages={block.type === 'image' ? (blocksToRender.find(b => b.type === 'gallery')?.data?.images || []) : []}
                          dateTagData={block.type === 'image' ? dateTagBlock?.data : undefined}
                          // Poll-specific props (use effectiveUser for demo identity)
                          currentUser={effectiveUser}
                          userDisplayName={effectiveDisplayName}
                          shares={object.shares || {}}
                          objectOwner={{ uid: object.ownerId, email: object.ownerEmail, displayName: object.ownerName }}
                          canEdit={canEdit}
                          onVote={block.type === 'poll' ? async (newVotes) => {
                            await updateBlockField(actualBlockIndex, { votes: newVotes });
                          } : undefined}
                          onRate={block.type === 'rating' ? async (newRatings) => {
                            await updateBlockField(actualBlockIndex, { ratings: newRatings });
                          } : undefined}
                          onClosePoll={block.type === 'poll' && canEdit ? async () => {
                            await updateBlockField(actualBlockIndex, { closed: true });
                          } : undefined}
                          onReopenPoll={block.type === 'poll' && canEdit ? async () => {
                            await updateBlockField(actualBlockIndex, { closed: false });
                          } : undefined}
                          onResetPoll={block.type === 'poll' && canEdit ? async () => {
                            await updateBlockField(actualBlockIndex, { votes: {} });
                          } : undefined}
                          onAddOption={block.type === 'poll' && block.data?.allowSuggestions ? async (label, addedBy, url) => {
                            await updateBlockField(actualBlockIndex, (data) => ({
                              ...data,
                              options: [...(data.options || []), {
                                id: Date.now().toString(), label, addedBy,
                                ...(url && { url })
                              }]
                            }));
                          } : undefined}
                          onRemoveOption={block.type === 'poll' && block.data?.allowSuggestions ? async (optionId) => {
                            const userKey = effectiveUser?.email ? effectiveUser.email.replace(/\./g, '_DOT_') : null;
                            const optionToRemove = (block.data.options || []).find(o => o.id === optionId);
                            if (!optionToRemove || !optionToRemove.addedBy) return;
                            // Allow removal if user owns the suggestion OR is admin/editor
                            if (optionToRemove.addedBy !== userKey && !canEdit) return;
                            await updateBlockField(actualBlockIndex, (data) => ({
                              ...data,
                              options: (data.options || []).filter(o => o.id !== optionId)
                            }));
                          } : undefined}
                          // Split-specific props
                          onUpdateAmount={block.type === 'split' ? async (participantEmail, amount) => {
                            const userEmail = effectiveUser?.email?.toLowerCase();
                            if (participantEmail.toLowerCase() !== userEmail) return;
                            await updateBlockField(actualBlockIndex, (data) => ({
                              ...data,
                              participants: (data.participants || []).map(p =>
                                p.email?.toLowerCase() === participantEmail.toLowerCase()
                                  ? { ...p, paid: amount } : p
                              )
                            }));
                          } : undefined}
                          onCloseSplit={block.type === 'split' && canEdit ? async () => {
                            await updateBlockField(actualBlockIndex, { closed: true });
                          } : undefined}
                          onReopenSplit={block.type === 'split' && canEdit ? async () => {
                            await updateBlockField(actualBlockIndex, { closed: false });
                          } : undefined}
                          onResetSplit={block.type === 'split' && canEdit ? async () => {
                            await updateBlockField(actualBlockIndex, (data) => ({
                              ...data,
                              participants: (data.participants || []).map(p => ({ ...p, paid: 0 })),
                              closed: false
                            }));
                          } : undefined}
                          // Leaderboard-specific props
                          onOpenModal={block.type === 'leaderboard' ? () => {
                            setLeaderboardModalData({ blockIndex: actualBlockIndex, data: block.data });
                          } : block.type === 'distribution' ? () => {
                            setDistributionModalData({ blockIndex: actualBlockIndex, data: block.data });
                          } : undefined}
                          onCloseLeaderboard={block.type === 'leaderboard' && canEdit ? async () => {
                            await updateBlockField(actualBlockIndex, { status: 'finished' });
                          } : undefined}
                          onReopenLeaderboard={block.type === 'leaderboard' && canEdit ? async () => {
                            await updateBlockField(actualBlockIndex, { status: 'active' });
                          } : undefined}
                          onResetLeaderboard={block.type === 'leaderboard' && canEdit ? async () => {
                            await updateBlockField(actualBlockIndex, { scores: {}, roundCount: 0, status: 'active' });
                          } : undefined}
                          onResetDistribution={block.type === 'distribution' && canEdit ? async () => {
                            await updateBlockField(actualBlockIndex, { slots: [] });
                          } : undefined}
                          // Tiebreaker-specific update callback
                          onUpdateTiebreaker={block.type === 'tiebreaker' ? async (newData) => {
                            await updateBlockField(actualBlockIndex, newData);
                          } : undefined}
                          // Text block inline edit - for owners/editors OR when viewerEditable
                          onEditContent={(block.type === 'text' && (canEdit || block.data.viewerEditable)) ? () => {
                            setTextEditModalData({ 
                              blockIndex: actualBlockIndex, 
                              content: block.data.content || '', 
                              title: block.data.title || 'Anteckning' 
                            });
                          } : undefined}
                          // Table block inline edit - for owners/editors OR when viewerEditable
                          onEditTable={(block.type === 'table' && (canEdit || block.data.viewerEditable)) ? () => {
                            const template = TABLE_TEMPLATES[block.data.template] || TABLE_TEMPLATES.table;
                            const legacyTemplate = block.data.template;
                            
                            // For list template, normalize rows so 'item' field is populated
                            // (previous code may have saved to 'col1' instead)
                            if (legacyTemplate === 'list') {
                              const normalizedRows = (block.data.rows || []).map(row => {
                                // Ensure item field has the correct value
                                const itemValue = row.item || row.col1 || row.task || row.name || '';
                                return {
                                  ...row,
                                  item: itemValue
                                };
                              });
                              setTableEditModalData({ 
                                blockIndex: actualBlockIndex, 
                                rows: normalizedRows,
                                columns: block.data.columns || template.columns,
                                template: 'list',
                                title: block.data.title || template.name,
                                col2Type: block.data.col2Type || 'text'
                              });
                              return;
                            }
                            
                            // For fusebox template, use rows directly (num, description, amps)
                            if (legacyTemplate === 'fusebox') {
                              setTableEditModalData({ 
                                blockIndex: actualBlockIndex, 
                                rows: block.data.rows || [],
                                columns: template.columns,
                                template: 'fusebox',
                                title: block.data.title || template.name
                              });
                              return;
                            }
                            
                            // Convert legacy rows to new format (col1, col2) for table templates
                            const convertedRows = (block.data.rows || []).map(row => {
                              // If already has col1, it's in new format
                              if (row.col1 !== undefined) return row;
                              
                              // Convert from legacy format
                              let col1 = '';
                              let col2 = '';
                              
                              if (legacyTemplate === 'tasks') {
                                col1 = row.task || '';
                                col2 = row.who || '';
                              } else if (legacyTemplate === 'shopping') {
                                col1 = row.item || '';
                                col2 = row.qty?.toString() || '';
                              } else if (legacyTemplate === 'contacts') {
                                col1 = row.name || '';
                                col2 = row.phone || '';
                              } else {
                                // Generic fallback
                                col1 = row.item || row.task || row.name || '';
                                col2 = row.who || row.qty?.toString() || row.phone || '';
                              }
                              
                              return {
                                ...row,
                                col1,
                                col2,
                                done: row.done || false
                              };
                            });
                            
                            setTableEditModalData({ 
                              blockIndex: actualBlockIndex, 
                              rows: convertedRows,
                              columns: block.data.columns || template.columns,
                              template: block.data.template || 'table',
                              title: block.data.title || template.name,
                              col2Type: block.data.col2Type || 'text'
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
                    {/* Show location map button – visible for 1+ locations (enables adding more via FAB) */}
                    {block.type === 'image' && showLocationMap && (
                      <div className="flex items-center justify-end mt-3">
                        <button
                          onClick={() => setShowMultiLocationMap(true)}
                          className="h-9 px-3 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-all"
                          title="Visa platser på karta"
                        >
                          <MapIcon size={16} />
                          <span className="text-sm font-medium">
                            {ownLocationBlocks.length + pendingLocations.length} {(ownLocationBlocks.length + pendingLocations.length) === 1 ? 'plats' : 'platser'}
                            {pendingLocations.length > 0 && <span className="text-yellow-400 ml-1">({pendingLocations.length} väntar)</span>}
                          </span>
                        </button>
                      </div>
                    )}
                    {/* Render unified hero info (location + metadata) after image block */}
                    {block.type === 'image' && hasImageBlock && renderHeroInfo()}
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
                        const childImage = child.blocks.find(bl => bl.type === 'image');
                        const childCategory = categories?.find(c => c.id === child.type);
                        const ChildIcon = childCategory ? getIconComponent(childCategory.icon) : (PREDEFINED_ICONS[child.type]?.icon || Home);
                        const childDistance = getObjectDistance(child, userLocation);
                        
                        return (
                          <button
                            key={child.id}
                            onClick={() => onNavigate(child)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-400/30 transition-all text-left"
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
                              <div className="text-sm font-medium text-white truncate">{childTitle?.data?.text || 'Namnlöst'}</div>
                            </div>
                            {childDistance !== undefined && (
                              <div className="text-xs text-gray-500 flex-shrink-0">{formatDistance(childDistance)}</div>
                            )}
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
                        className="w-full px-3 py-2 text-base bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                        autoFocus
                      />
                      <input
                        type="url"
                        value={newUrlValue}
                        onChange={e => setNewUrlValue(e.target.value)}
                        placeholder="URL (https://...)"
                        className="w-full px-3 py-2 text-base bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                      />
                      <input
                        type="text"
                        value={newUrlNote}
                        onChange={e => setNewUrlNote(e.target.value)}
                        placeholder="Anteckning (valfritt, t.ex. Middag fredag 20:00)"
                        className="w-full px-3 py-2 text-base bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
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
                      const linkedDistance = getObjectDistance(linked, userLocation);
                      
                      return (
                        <div key={`obj_${linked.id}`} className="space-y-1">
                          <div className="flex items-center gap-1">
                            {/* Reorder arrows */}
                            {canManage && linkedEditMode && onReorderLinked && (
                              <div className="flex items-center gap-0.5 mr-1 flex-shrink-0">
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
                              className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-400/30 transition-all text-left"
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
                                {linkedDistance !== undefined && !linkedNote && (
                                  <div className="text-xs text-gray-500">{formatDistance(linkedDistance)}</div>
                                )}
                              </div>
                              {linkedDistance !== undefined && (linkedNote || isEditingThis) && (
                                <div className="text-xs text-gray-500 flex-shrink-0">{formatDistance(linkedDistance)}</div>
                              )}
                            </button>
                            {/* Edit note button - only in edit mode */}
                            {canManage && linkedEditMode && onUpdateLinkedNote && (
                              <button
                                onClick={() => {
                                  if (isEditingThis) {
                                    // Save and close
                                    onUpdateLinkedNote(object.id, linked.id, editingNoteText.trim());
                                    saveAndSwitchNote(null, '');
                                  } else {
                                    // Save any current note and switch to this one
                                    saveAndSwitchNote(linked.id, linkedNote);
                                  }
                                }}
                                className={`p-2 rounded-lg transition-all flex-shrink-0 ${isEditingThis ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-white/10 text-gray-500 hover:text-purple-300'}`}
                                title={linkedNote ? 'Redigera anteckning' : 'Lägg till anteckning'}
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canManage && linkedEditMode && onRemoveFromCollection && (
                              <button
                                onClick={() => onRemoveFromCollection(object.id, linked.id)}
                                className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
                                title="Ta bort från samlingsvy"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                          {/* Note input field - shown below the row when editing */}
                          {canManage && linkedEditMode && isEditingThis && onUpdateLinkedNote && (
                            <div 
                              className="flex items-center gap-1"
                              onClick={e => e.stopPropagation()}
                              onTouchStart={e => e.stopPropagation()}
                            >
                              {/* Spacer matching reorder arrows */}
                              <div className="flex items-center gap-0.5 mr-1 flex-shrink-0">
                                <div className="p-1.5 w-[18px]" />
                                <div className="p-1.5 w-[18px]" />
                              </div>
                              <input
                                ref={el => el && setTimeout(() => el.focus(), 50)}
                                type="text"
                                value={editingNoteText}
                                onChange={e => setEditingNoteText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    e.target.blur();
                                  }
                                }}
                                onBlur={() => {
                                  onUpdateLinkedNote(object.id, linked.id, editingNoteText.trim());
                                  saveAndSwitchNote(null, '');
                                }}
                                placeholder="t.ex. Lördag 10:00"
                                className="flex-1 min-w-0 px-3 py-2 text-base bg-white/10 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                              />
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // URL item
                      const urlItem = item.data;
                      const isEditingUrlNote = editingNoteId === `url_${urlItem.id}`;
                      
                      return (
                        <div key={`url_${urlItem.id}`} className="space-y-1">
                          <div className="flex items-center gap-1">
                            {/* Reorder arrows for URLs */}
                            {canManage && linkedEditMode && onReorderLinked && (
                              <div className="flex items-center gap-0.5 mr-1 flex-shrink-0">
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
                              className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-400/30 transition-all text-left"
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
                            {/* Edit note button - only in edit mode */}
                            {canManage && linkedEditMode && onUpdateLinkedUrl && (
                              <button
                                onClick={() => {
                                  if (isEditingUrlNote) {
                                    // Save and close
                                    onUpdateLinkedUrl(object.id, urlItem.id, { ...urlItem, note: editingNoteText.trim() });
                                    saveAndSwitchNote(null, '');
                                  } else {
                                    // Save any current note and switch to this one
                                    saveAndSwitchNote(`url_${urlItem.id}`, urlItem.note || '');
                                  }
                                }}
                                className={`p-2 rounded-lg transition-all flex-shrink-0 ${isEditingUrlNote ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-white/10 text-gray-500 hover:text-purple-300'}`}
                                title={urlItem.note ? 'Redigera anteckning' : 'Lägg till anteckning'}
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canManage && linkedEditMode && onRemoveLinkedUrl && (
                              <button
                                onClick={() => onRemoveLinkedUrl(object.id, urlItem.id)}
                                className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
                                title="Ta bort länk"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                          {/* Note input field - shown below the row when editing */}
                          {canManage && linkedEditMode && isEditingUrlNote && onUpdateLinkedUrl && (
                            <div 
                              className="flex items-center gap-1"
                              onClick={e => e.stopPropagation()}
                              onTouchStart={e => e.stopPropagation()}
                            >
                              {/* Spacer matching reorder arrows */}
                              <div className="flex items-center gap-0.5 mr-1 flex-shrink-0">
                                <div className="p-1.5 w-[18px]" />
                                <div className="p-1.5 w-[18px]" />
                              </div>
                              <input
                                ref={el => el && setTimeout(() => el.focus(), 50)}
                                type="text"
                                value={editingNoteText}
                                onChange={e => setEditingNoteText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    e.target.blur();
                                  }
                                }}
                                onBlur={() => {
                                  onUpdateLinkedUrl(object.id, urlItem.id, { ...urlItem, note: editingNoteText.trim() });
                                  saveAndSwitchNote(null, '');
                                }}
                                placeholder="t.ex. Middag 20:00"
                                className="flex-1 min-w-0 px-3 py-2 text-base bg-white/10 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                              />
                            </div>
                          )}
                        </div>
                      );
                    }
                  })}
                </div>
                
                {/* Planera-knapp under innehållslistan - visa endast för editors, eller viewers om planering finns */}
                {(canEdit || object.planningData) && (
                <button
                  type="button"
                  onClick={() => setShowPlanner(true)}
                  className={`w-full mt-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                    object.planningData 
                      ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-300 border border-white/10' 
                      : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-300 border border-white/10 border-dashed'
                  }`}
                >
                  <Calendar size={16} />
                  {object.planningData 
                    ? `Visa planering (${object.planningData.days} dagar)` 
                    : 'Skapa planering'}
                </button>
                )}
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
                              className="flex-1 h-9 flex items-center justify-center gap-1.5 px-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs"
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
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-base text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
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
          currentUser={effectiveUser}
          shares={object.shares || {}}
          canEdit={canEdit}
          onClose={() => setLeaderboardModalData(null)}
          onUpdateScores={async (newScores) => {
            await updateBlockField(leaderboardModalData.blockIndex, { scores: newScores });
            setLeaderboardModalData(prev => ({ ...prev, data: { ...prev.data, scores: newScores } }));
          }}
          onAddRound={async () => {
            const newCount = (object.blocks[leaderboardModalData.blockIndex].data.roundCount || 0) + 1;
            await updateBlockField(leaderboardModalData.blockIndex, { roundCount: newCount });
            setLeaderboardModalData(prev => ({ ...prev, data: { ...prev.data, roundCount: newCount } }));
          }}
          onDeleteRound={async (roundIndex) => {
            const blockData = object.blocks[leaderboardModalData.blockIndex].data;
            const currentRoundCount = blockData.roundCount || 0;
            if (currentRoundCount <= 0) return;
            
            // Remove scores for this round and shift subsequent rounds
            const newScores = { ...blockData.scores };
            Object.keys(newScores).forEach(email => {
              const ps = { ...newScores[email] };
              for (let i = roundIndex; i < currentRoundCount - 1; i++) ps[i] = ps[i + 1] || 0;
              delete ps[currentRoundCount - 1];
              newScores[email] = ps;
            });
            const newShots = { ...blockData.shots };
            Object.keys(newShots).forEach(email => {
              const ps = { ...newShots[email] };
              for (let i = roundIndex; i < currentRoundCount - 1; i++) ps[i] = ps[i + 1];
              delete ps[currentRoundCount - 1];
              newShots[email] = ps;
            });
            const newRounds = [...(blockData.rounds || [])];
            newRounds.splice(roundIndex, 1);
            
            const changes = { roundCount: currentRoundCount - 1, scores: newScores, shots: newShots, rounds: newRounds };
            await updateBlockField(leaderboardModalData.blockIndex, changes);
            setLeaderboardModalData(prev => ({ ...prev, data: { ...prev.data, ...changes } }));
          }}
          onUpdateShots={async (newShots) => {
            await updateBlockField(leaderboardModalData.blockIndex, { shots: newShots });
            setLeaderboardModalData(prev => ({ ...prev, data: { ...prev.data, shots: newShots } }));
          }}
          onUpdateRounds={async (newRounds) => {
            await updateBlockField(leaderboardModalData.blockIndex, { rounds: newRounds });
            setLeaderboardModalData(prev => ({ ...prev, data: { ...prev.data, rounds: newRounds } }));
          }}
          preciseGPS={preciseGPS}
        />
      )}
      {textEditModalData && (
        <FullscreenTextEditor
          content={textEditModalData.content}
          title={textEditModalData.title}
          onSave={async (newContent) => {
            try {
              const blockData = {
                ...object.blocks[textEditModalData.blockIndex].data,
                content: newContent
              };
              await onBlockUpdate(object.id, textEditModalData.blockIndex, blockData);
              setTextEditModalData(null);
            } catch (err) {
              console.error('Error saving text content:', err);
              toast.error('Kunde inte spara texten');
            }
          }}
          onCancel={() => setTextEditModalData(null)}
        />
      )}
      {tableEditModalData && tableEditModalData.template === 'list' && (
        <ListEditorModal
          rows={tableEditModalData.rows}
          title={tableEditModalData.title}
          onSave={async (newRows) => {
            try {
              // Clean rows: only keep item, done, isHeader (remove any legacy col1/col2 fields)
              const cleanedRows = newRows.map(row => {
                const cleanRow = { item: row.item || '' };
                if (row.isHeader) cleanRow.isHeader = true;
                if (row.done) cleanRow.done = true;
                return cleanRow;
              });
              const blockData = {
                ...object.blocks[tableEditModalData.blockIndex].data,
                rows: cleanedRows
              };
              await onBlockUpdate(object.id, tableEditModalData.blockIndex, blockData);
              setTableEditModalData(null);
            } catch (err) {
              console.error('Error saving list content:', err);
              toast.error('Kunde inte spara listan');
            }
          }}
          onCancel={() => setTableEditModalData(null)}
        />
      )}
      {tableEditModalData && tableEditModalData.template === 'fusebox' && (
        <MultiColumnTableEditorModal
          rows={tableEditModalData.rows}
          title={tableEditModalData.title}
          columns={tableEditModalData.columns}
          useCollapse={TABLE_TEMPLATES[tableEditModalData.template]?.useCollapse}
          onSave={async (newRows) => {
            try {
              const blockData = {
                ...object.blocks[tableEditModalData.blockIndex].data,
                rows: newRows,
                template: tableEditModalData.template
              };
              await onBlockUpdate(object.id, tableEditModalData.blockIndex, blockData);
              setTableEditModalData(null);
            } catch (err) {
              console.error('Error saving table content:', err);
              toast.error('Kunde inte spara tabellen');
            }
          }}
          onCancel={() => setTableEditModalData(null)}
        />
      )}
      {tableEditModalData && tableEditModalData.template !== 'list' && tableEditModalData.template !== 'fusebox' && (
        <SimpleTableEditorModal
          rows={tableEditModalData.rows}
          title={tableEditModalData.title}
          columns={tableEditModalData.columns}
          template={tableEditModalData.template}
          col2Type={tableEditModalData.col2Type || 'text'}
          onSave={async (newRows, newCol2Type) => {
            try {
              const blockData = {
                ...object.blocks[tableEditModalData.blockIndex].data,
                rows: newRows,
                col2Type: newCol2Type,
                template: tableEditModalData.template || 'table'
              };
              await onBlockUpdate(object.id, tableEditModalData.blockIndex, blockData);
              setTableEditModalData(null);
            } catch (err) {
              console.error('Error saving table content:', err);
              toast.error('Kunde inte spara tabellen');
            }
          }}
          onCancel={() => setTableEditModalData(null)}
        />
      )}
      {distributionModalData && (
        <DistributionModal
          data={object.blocks[distributionModalData.blockIndex]?.data || distributionModalData.data}
          currentUser={effectiveUser}
          shares={object.shares || {}}
          canEdit={canEdit}
          onClose={() => setDistributionModalData(null)}
          onCreateSlot={async (newSlot, leaveSlotId) => {
            const idx = distributionModalData.blockIndex;
            await updateBlockField(idx, (data) => {
              let currentSlots = data.slots || [];
              if (leaveSlotId) {
                const currentUserKey = effectiveUser?.email?.replace(/\./g, '_DOT_');
                currentSlots = currentSlots.map(slot =>
                  slot.id === leaveSlotId
                    ? { ...slot, assignees: (slot.assignees || []).filter(key => key !== currentUserKey) }
                    : slot
                );
              }
              return { ...data, slots: [...currentSlots, newSlot] };
            });
          }}
          onJoinSlot={async (slotId, userKey, extraSeats = 0, extraSeatsNote = null) => {
            const idx = distributionModalData.blockIndex;
            await updateBlockField(idx, (data) => {
              const updatedSlots = (data.slots || []).map(slot => {
                if (slot.id === slotId && !(slot.assignees || []).includes(userKey)) {
                  const assigneeDetails = { ...(slot.assigneeDetails || {}) };
                  if (extraSeats > 0 || extraSeatsNote) {
                    assigneeDetails[userKey] = { extraSeats, note: extraSeatsNote };
                  }
                  return { ...slot, assignees: [...(slot.assignees || []), userKey], assigneeDetails };
                }
                return slot;
              });
              return { ...data, slots: updatedSlots };
            });
          }}
          onLeaveSlot={async (slotId, userKey) => {
            const idx = distributionModalData.blockIndex;
            await updateBlockField(idx, (data) => {
              const updatedSlots = (data.slots || []).map(slot => {
                if (slot.id === slotId) {
                  const assigneeDetails = { ...(slot.assigneeDetails || {}) };
                  delete assigneeDetails[userKey];
                  return { ...slot, assignees: (slot.assignees || []).filter(key => key !== userKey), assigneeDetails };
                }
                return slot;
              });
              return { ...data, slots: updatedSlots };
            });
          }}
          onDeleteSlot={async (slotId) => {
            const idx = distributionModalData.blockIndex;
            await updateBlockField(idx, (data) => ({
              ...data, slots: (data.slots || []).filter(slot => slot.id !== slotId)
            }));
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
                  {object.blocks.find(b => b.type === 'title')?.data?.text || 'Platser'} ({multiLocationMapObjects.length + pendingLocations.length} {(multiLocationMapObjects.length + pendingLocations.length) === 1 ? 'plats' : 'platser'})
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
                    toast.success(`Plats #${ownLocationBlocks.length + pendingLocations.length + 1} tillagd!`);
                  } catch (err) {
                    console.error('Error adding location, saving locally:', err);
                    // Fallback: Save to localStorage for later sync
                    const newPending = savePendingLocation(object.id, coords);
                    setPendingLocations(newPending);
                    toast.info(`Plats #${ownLocationBlocks.length + newPending.length} sparad lokalt (synkas när nät finns)`);
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

      {/* Planner Modal for collections */}
      {isCollection && showPlanner && (
        <PlannerModal
          isOpen={showPlanner}
          onClose={() => setShowPlanner(false)}
          planningData={object.planningData}
          linkedObjects={linkedObjects}
          linkedUrls={object.linkedUrls || []}
          canEdit={canEdit}
          onNavigateToObject={(obj) => {
            setShowPlanner(false);
            onNavigate(obj, { fromPlanner: true });
          }}
          onOpenUrl={(url) => {
            window.open(url.url, '_blank');
          }}
          onSave={async (planningData) => {
            try {
              await updateDoc(doc(db, 'objects', object.id), {
                planningData
              });
            } catch (err) {
              console.error('Error saving planning data:', err);
              toast.error('Kunde inte spara planeringen');
            }
          }}
          onDelete={async () => {
            try {
              await updateDoc(doc(db, 'objects', object.id), {
                planningData: null
              });
            } catch (err) {
              console.error('Error deleting planning data:', err);
              toast.error('Kunde inte ta bort planeringen');
            }
          }}
        />
      )}
    </>
  );
}

export default ObjectDetail;
