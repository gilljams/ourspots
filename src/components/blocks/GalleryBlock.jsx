import React, { useState } from 'react';
import ImageLightbox from '../ImageLightbox';

// Gallery block - extra images shown as thumbnails, opens in lightbox
export const GalleryBlock = ({ data, onUpdate }) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const images = data.images || [];
  
  if (images.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic py-2">
        Inga extra bilder tillagda
      </div>
    );
  }
  
  const openLightbox = (index) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };
  
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => openLightbox(idx)}
            className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all relative group"
          >
            <img 
              src={img.url.includes('cloudinary.com') 
                ? img.url.replace('/upload/', '/upload/c_fill,w_256,h_256,q_auto/') 
                : img.url
              } 
              alt={img.caption || ''} 
              className="w-full h-full object-cover"
            />
            {img.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white truncate">{img.caption}</span>
              </div>
            )}
          </button>
        ))}
      </div>
      
      {/* Lightbox */}
      {showLightbox && (
        <ImageLightbox
          images={images.map(img => ({ url: img.url, caption: img.caption }))}
          initialIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
};
