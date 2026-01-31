import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Upload, Loader, Navigation, 
  Map as MapIcon, FileText, CheckSquare, ClipboardList, Link2, Table2, Image as ImageIcon, Calendar, Phone, Timer 
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
import BlockEditor, { DateTagBlockEditor, TimerBlockEditor } from './BlockEditor';

function CreateObjectModal({ onClose, onSave, editObject, duplicateFromObject, saving, availableParents, defaultParentId, userLocation, categories, preciseGPS }) {
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
      .filter(b => ['text', 'checklist', 'todo', 'links', 'table', 'datetag', 'contact', 'timer'].includes(b.type))
      .map(b => {
        if (b.type === 'links') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'links',
            title: b.data.title || '',
            links: b.data.items || []
          };
        }
        if (b.type === 'table') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'table',
            title: b.data.title || '',
            template: b.data.template || 'tasks',
            rows: b.data.rows || [],
            columns: b.data.columns || []
          };
        }
        if (b.type === 'datetag') {
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'datetag',
            tags: b.data.tags || []
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
            timers: b.data.timers || []
          };
        }
        return {
          id: Math.random().toString(36).substr(2, 9),
          type: b.type,
          title: b.data.title || '',
          content: b.type === 'text' ? b.data.content : b.data.items.map(i => i.text).join('\n')
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

  // Refs
  const fileInputRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const customBlocksRef = useRef(customBlocks);
  customBlocksRef.current = customBlocks;
  
  // Track if form has been modified (simpler than deep comparison)
  const [formTouched, setFormTouched] = useState(false);

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
              }))
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
              rows: block.rows
            } 
          });
        }
      } else if (block.type === 'datetag') {
        if (block.tags && block.tags.length > 0) {
          blocks.push({ 
            type: 'datetag', 
            data: { 
              tags: block.tags
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
              timers: block.timers
            } 
          });
        }
      } else if (block.content && block.content.trim()) {
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
    const newBlock = { id: Math.random().toString(36).substr(2, 9), type, title: '', content: '' };
    if (type === 'links') {
      newBlock.links = [{ title: '', url: '', icon: 'Link' }];
    }
    if (type === 'table') {
      newBlock.template = 'tasks';
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
                <button type="button" onClick={() => addCustomBlock('contact')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                  <Phone size={16} className="text-green-400" /> Kontakt
                </button>
                <button type="button" onClick={() => addCustomBlock('links')} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm">
                  <Link2 size={16} className="text-purple-400" /> Länkar
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
