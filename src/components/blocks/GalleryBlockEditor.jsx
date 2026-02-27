import React, { useState, useRef } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Images, Upload, Loader, Edit2 } from 'lucide-react';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, resizeImage } from '../../utils/imageUtils';
import { useToast } from '../../utils/useToast';

// Gallery block editor component - upload multiple images
function GalleryBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const toast = useToast();
  const [images, setImages] = useState(block.images || []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingCaption, setEditingCaption] = useState(null);
  const fileInputRef = useRef(null);
  
  const MAX_IMAGES = 4;
  
  const syncImages = (newImages) => {
    setImages(newImages);
    onUpdate(block.id, { images: newImages });
  };
  
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const remainingSlots = MAX_IMAGES - images.length;
    const filesToUpload = files.slice(0, remainingSlots);
    
    if (filesToUpload.length === 0) {
      toast.error(`Max ${MAX_IMAGES} bilder tillåtna`);
      return;
    }
    
    setUploading(true);
    
    try {
      const uploadedImages = [];
      
      for (const file of filesToUpload) {
        // Resize to smaller size for gallery (1000px, lower quality)
        let fileToUpload = file;
        try {
          const resizedBlob = await resizeImage(file, 1000, 0.65);
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
        
        uploadedImages.push({
          url: data.secure_url,
          caption: ''
        });
      }
      
      syncImages([...images, ...uploadedImages]);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Kunde inte ladda upp bild. Försök igen!');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const removeImage = (idx) => {
    const newImages = images.filter((_, i) => i !== idx);
    syncImages(newImages);
  };
  
  const updateCaption = (idx, caption) => {
    const newImages = [...images];
    newImages[idx] = { ...newImages[idx], caption };
    syncImages(newImages);
    setEditingCaption(null);
  };
  
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Collapsible header */}
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <ChevronDown 
            size={16} 
            className={`text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`} 
          />
          <Images size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            Galleri ({images.length}/{MAX_IMAGES})
          </span>
        </button>
        <div className="flex gap-1 flex-shrink-0">
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
      
      {/* Expandable content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Image grid – compact thumbnails for editor */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative rounded-lg overflow-hidden border border-white/10">
                  <img 
                    src={img.url.includes('cloudinary.com') 
                      ? img.url.replace('/upload/', '/upload/c_fill,w_128,h_128,q_auto/') 
                      : img.url
                    }
                    alt={img.caption || ''}
                    className="w-full aspect-square object-cover"
                  />
                  {/* Always-visible action buttons */}
                  <div className="absolute top-1 right-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingCaption(idx)}
                      className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                      title="Bildtext"
                    >
                      <Edit2 size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="w-6 h-6 rounded-full bg-black/60 text-red-400 flex items-center justify-center"
                      title="Ta bort"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  {/* Caption indicator */}
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-0.5">
                      <span className="text-[10px] text-white truncate block">{img.caption}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Caption edit modal */}
          {editingCaption !== null && (
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <label className="text-xs text-gray-400 mb-1 block">Bildtext</label>
              <input
                type="text"
                defaultValue={images[editingCaption]?.caption || ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateCaption(editingCaption, e.target.value);
                  }
                }}
                onBlur={(e) => updateCaption(editingCaption, e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Skriv bildtext..."
                autoFocus
              />
            </div>
          )}
          
          {/* Upload button */}
          {images.length < MAX_IMAGES && (
            <label className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-white/20 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <>
                  <Loader size={18} className="text-blue-400 animate-spin" />
                  <span className="text-sm text-gray-400">Laddar upp...</span>
                </>
              ) : (
                <>
                  <Upload size={18} className="text-blue-400" />
                  <span className="text-sm text-gray-400">
                    Lägg till bilder ({images.length}/{MAX_IMAGES})
                  </span>
                </>
              )}
            </label>
          )}
          
          {/* Info text */}
          <p className="text-xs text-gray-500">
            Galleribilderna visas som miniatyrer under huvudbilden. Klicka för att öppna i karusell.
          </p>
        </div>
      )}
    </div>
  );
}

export { GalleryBlockEditor };
export default GalleryBlockEditor;
