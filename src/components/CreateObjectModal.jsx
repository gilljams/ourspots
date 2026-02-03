import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Upload, Loader, Navigation, ChevronDown, ChevronUp,
  Map as MapIcon, FileText, CheckSquare, ClipboardList, Link2, Table2, Image as ImageIcon, Calendar, Phone, Timer, BarChart3, Folder, MapPin, Music, Wallet, Trophy 
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
import BlockEditor, { DateTagBlockEditor, TimerBlockEditor, PollBlockEditor, AudioBlockEditor, SplitBlockEditor, LeaderboardBlockEditor } from './BlockEditor';

function CreateObjectModal({ onClose, onSave, editObject, duplicateFromObject, saving, availableParents, defaultParentId, userLocation, categories, preciseGPS, isAdmin, currentUser, currentUserDisplayName }) {
  // ========== STATE ==========
  const isEdit = !!editObject;
  const isDuplicate = !!duplicateFromObject;
  const sourceObject = editObject || duplicateFromObject; // Use either for initial data
  
  const defaultType = defaultParentId 
    ? (availableParents.find(p => p.id === defaultParentId)?.type || categories[0]?.id || 'property') 
    : (categories[0]?.id || 'property');

  // Form state
  const [selectedType, setSelectedType] = useState(sourceObject?.type || defaultType);
  const [parentId, setParentId] = useState(sourceObject?.parentId || defaultParentId || '');
  const [inheritLocation, setInheritLocation] = useState(false);
  
  // For duplicates, add " (kopia)" suffix to title (strip existing suffixes first)
  const originalTitle = sourceObject?.blocks?.find(b => b.type === 'title')?.data?.text || '';
  const cleanTitle = originalTitle.replace(/( \(kopia\))+$/g, ''); // Remove existing (kopia) suffixes
  const [title, setTitle] = useState(isDuplicate ? `${cleanTitle} (kopia)` : originalTitle);
  
  // Location handling - preserve extra location blocks (e.g., mushroom spots added via quick capture)
  const locationBlocks = sourceObject?.blocks?.filter(b => b.type === 'location') || [];
  const primaryLocation = locationBlocks[0];
  const [address, setAddress] = useState(primaryLocation?.data?.address || '');
  const [lat, setLat] = useState(primaryLocation?.data?.lat ?? null);
  const [lng, setLng] = useState(primaryLocation?.data?.lng ?? null);
  // Extra locations (index 1+) are preserved but not editable in the modal
  const extraLocationBlocks = locationBlocks.slice(1);
  const [imageUrl, setImageUrl] = useState(sourceObject?.blocks?.find(b => b.type === 'image')?.data?.url || '');
  const [imageCropMode, setImageCropMode] = useState(sourceObject?.blocks?.find(b => b.type === 'image')?.data?.cropMode || 'auto');
  const [imageFocalPoint, setImageFocalPoint] = useState(sourceObject?.blocks?.find(b => b.type === 'image')?.data?.focalPoint || null);
  const [customBlocks, setCustomBlocks] = useState(() => {
    if (!sourceObject) return [];
    return sourceObject.blocks
      .filter(b => ['text', 'links', 'table', 'datetag', 'contact', 'timer', 'poll', 'audio', 'split', 'leaderboard'].includes(b.type))
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
            defaultCollapsed: b.data.defaultCollapsed || false
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
            discrete: b.data.discrete !== false // Default true
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
            participants: isDuplicate ? [] : (b.data.participants || []), // Clear participants when duplicating
            roundCount: isDuplicate ? 0 : (b.data.roundCount || 0),
            scores: isDuplicate ? {} : (b.data.scores || {}), // Clear scores when duplicating
            status: isDuplicate ? 'active' : (b.data.status || 'active'),
            sortOrder: b.data.sortOrder || 'desc',
            defaultCollapsed: b.data.defaultCollapsed ?? true
          };
        }
        // Text blocks
        return {
          id: Math.random().toString(36).substr(2, 9),
          type: b.type,
          title: b.data.title || '',
          content: b.data.content || '',
          defaultCollapsed: b.data.defaultCollapsed || false
        };
      });
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
  const customBlocksRef = useRef(customBlocks);
  customBlocksRef.current = customBlocks;
  
  // Track if form has been modified (simpler than deep comparison)
  const [formTouched, setFormTouched] = useState(false);

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
        alert('Ingen platsdata hittades i bilden.');
      }
    } catch (e) {
      alert('Kunde inte läsa platsdata från bilden.');
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

  const handleSubmit = async () => {
    if (!title || !title.trim()) {
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
    
    // Preserve extra location blocks (e.g., mushroom spots added via quick capture)
    // For edit: keep the extra locations from the original object
    // For duplicate: copy ALL locations from source (so the copy also gets mushroom spots)
    if ((isEdit || isDuplicate) && extraLocationBlocks.length > 0) {
      extraLocationBlocks.forEach(locBlock => {
        blocks.push({ type: 'location', data: locBlock.data });
      });
    }

    if (imageUrl.trim()) {
      const imageData = { url: imageUrl.trim(), cropMode: imageCropMode };
      if (imageFocalPoint) imageData.focalPoint = imageFocalPoint;
      blocks.push({ type: 'image', data: imageData });
    }

    const currentCustomBlocks = customBlocksRef.current;
    
    currentCustomBlocks.forEach(block => {
      if (block.type === 'links') {
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
        if (block.rows && block.rows.length > 0) {
          blocks.push({ 
            type: 'table', 
            data: { 
              title: (block.title || '').trim(), 
              template: block.template || 'tasks',
              columns: block.columns || [],
              rows: block.rows,
              defaultCollapsed: block.defaultCollapsed || false
            } 
          });
        }
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
        // Save poll block if any options exist
        if (block.options && block.options.length > 0) {
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
              discrete: block.discrete !== false // Default true
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
        // Save leaderboard block
        blocks.push({ 
          type: 'leaderboard', 
          data: { 
            title: (block.title || 'Leaderboard').trim(),
            participants: block.participants || [],
            roundCount: block.roundCount || 0,
            scores: block.scores || {},
            status: block.status || 'active',
            sortOrder: block.sortOrder || 'desc',
            defaultCollapsed: block.defaultCollapsed ?? true
          } 
        });
      } else if (block.content && block.content.trim()) {
        if (block.type === 'text') {
          blocks.push({ type: 'text', data: { title: (block.title || 'Anteckning').trim(), content: block.content.trim(), defaultCollapsed: block.defaultCollapsed || false } });
        }
      }
    });

    onSave({ type: selectedType, layerId: 'default', blocks, parentId: parentId || null }, isEdit ? editObject.id : null);
  };

  const addCustomBlock = (type, template = null) => {
    const newBlock = { id: Math.random().toString(36).substr(2, 9), type, title: '', content: '' };
    if (type === 'links') {
      newBlock.links = [{ title: '', url: '', icon: 'Link' }];
    }
    if (type === 'table') {
      newBlock.template = template || 'tasks';
      newBlock.rows = [];
      newBlock.columns = [];
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
      newBlock.status = 'active';
      newBlock.sortOrder = 'desc';
      newBlock.defaultCollapsed = true;
    }
    setCustomBlocks(prev => [...prev, newBlock]);
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
        onClick={(e) => { 
          if (!saving && e.target === e.currentTarget) onClose(); 
        }}
      >
        {/* Modal */}
        <div 
          className="bg-gray-900 sm:rounded-xl border-t sm:border border-white/10 w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
          style={{ touchAction: 'pan-y' }}
        >
          
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-4 border-b border-white/10 flex items-center justify-between bg-gray-900">
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
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
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
                {!showBasicSettings && (
                  <span className="text-xs text-gray-500 ml-auto flex items-center gap-3">
                    {parentId && <Folder size={14} className="text-blue-400" />}
                    {(lat !== null || address) && <MapPin size={14} className="text-green-400" />}
                    {imageUrl && <ImageIcon size={14} className="text-purple-400" />}
                  </span>
                )}
              </button>

              {/* Content */}
              {showBasicSettings && (
                <div className="p-3 pt-0 space-y-4">
                  {/* Parent selector */}
                  <div className="pt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Lägg under objekt (valfritt)</label>
                    <select 
                      value={parentId} 
                      onChange={(e) => { setParentId(e.target.value); setFormTouched(true); }} 
                      disabled={saving}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 appearance-none"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
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
                </div>
              )}
            </div>

            {/* Custom blocks */}
            {customBlocks.map((block, index) => (
              block.type === 'datetag' ? (
                <DateTagBlockEditor
                  key={block.id}
                  block={block}
                  onUpdate={updateCustomBlock}
                  onRemove={removeCustomBlock}
                  onMove={moveCustomBlock}
                  index={index}
                  total={customBlocks.length}
                  saving={saving}
                />
              ) : block.type === 'timer' ? (
                <TimerBlockEditor
                  key={block.id}
                  block={block}
                  onUpdate={updateCustomBlock}
                  onRemove={removeCustomBlock}
                  onMove={moveCustomBlock}
                  index={index}
                  total={customBlocks.length}
                  saving={saving}
                />
              ) : block.type === 'poll' ? (
                <PollBlockEditor
                  key={block.id}
                  block={block}
                  onUpdate={updateCustomBlock}
                  onRemove={removeCustomBlock}
                  onMove={moveCustomBlock}
                  index={index}
                  total={customBlocks.length}
                  saving={saving}
                />
              ) : block.type === 'audio' ? (
                <AudioBlockEditor
                  key={block.id}
                  block={block}
                  onUpdate={updateCustomBlock}
                  onRemove={removeCustomBlock}
                  onMove={moveCustomBlock}
                  index={index}
                  total={customBlocks.length}
                  saving={saving}
                />
              ) : block.type === 'split' ? (
                <SplitBlockEditor
                  key={block.id}
                  block={block}
                  onUpdate={updateCustomBlock}
                  onRemove={removeCustomBlock}
                  onMove={moveCustomBlock}
                  index={index}
                  total={customBlocks.length}
                  saving={saving}
                  shares={sourceObject?.shares || {}}
                  currentUser={currentUser}
                  currentUserDisplayName={currentUserDisplayName}
                />
              ) : block.type === 'leaderboard' ? (
                <LeaderboardBlockEditor
                  key={block.id}
                  block={block}
                  onUpdate={updateCustomBlock}
                  onRemove={removeCustomBlock}
                  onMove={moveCustomBlock}
                  index={index}
                  total={customBlocks.length}
                  saving={saving}
                  shares={sourceObject?.shares || {}}
                  currentUser={currentUser}
                  currentUserDisplayName={currentUserDisplayName}
                />
              ) : (
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
              )
            ))}

            {/* Add block buttons */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs text-gray-500 uppercase mb-3">Lägg till block</div>
              
              {/* Primary blocks - always visible, compact to fit one row */}
              <div className="flex gap-2">
                <button type="button" onClick={() => addCustomBlock('text')} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                  <FileText size={16} className="text-blue-400" /> Text
                </button>
                <button type="button" onClick={() => addCustomBlock('table', 'list')} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                  <CheckSquare size={16} className="text-green-400" /> Lista
                </button>
                <button type="button" onClick={() => addCustomBlock('links')} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                  <Link2 size={16} className="text-purple-400" /> URL
                </button>
                
                {/* Expand/collapse button */}
                <button 
                  type="button" 
                  onClick={() => {
                    const willExpand = !showMoreBlocks;
                    setShowMoreBlocks(willExpand);
                    if (willExpand) {
                      // Scroll down to show expanded content
                      setTimeout(() => {
                        const scrollContainer = document.querySelector('.overflow-y-auto');
                        if (scrollContainer) {
                          scrollContainer.scrollBy({ top: 100, behavior: 'smooth' });
                        }
                      }, 50);
                    }
                  }} 
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300 text-sm"
                >
                  {showMoreBlocks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showMoreBlocks ? 'Färre' : 'Fler'}
                </button>
              </div>
              
              {/* Secondary blocks - expandable */}
              {showMoreBlocks && (
                <div className="flex gap-2 flex-wrap mt-2 pt-2 border-t border-white/5">
                  <button type="button" onClick={() => addCustomBlock('contact')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                    <Phone size={16} className="text-green-400" /> Kontakt
                  </button>
                  <button type="button" onClick={() => addCustomBlock('table')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                    <Table2 size={16} className="text-amber-400" /> Tabell
                  </button>
                  <button type="button" onClick={() => addCustomBlock('datetag')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                    <Calendar size={16} className="text-cyan-400" /> Datum
                  </button>
                  <button type="button" onClick={() => addCustomBlock('timer')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                    <Timer size={16} className="text-orange-400" /> Timers
                  </button>
                  <button type="button" onClick={() => addCustomBlock('poll')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                    <BarChart3 size={16} className="text-indigo-400" /> Omröstning
                  </button>
                  <button type="button" onClick={() => addCustomBlock('split')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                    <Wallet size={16} className="text-green-400" /> Splitt
                  </button>
                  <button type="button" onClick={() => addCustomBlock('leaderboard')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                    <Trophy size={16} className="text-blue-400" /> Leaderboard
                  </button>
                  {isAdmin && (
                    <button type="button" onClick={() => addCustomBlock('audio')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-sm">
                      <Music size={16} className="text-purple-400" /> Ljud
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 border-t border-white/10 bg-gray-900">
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
                    ? 'bg-gray-600 text-gray-400' 
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
