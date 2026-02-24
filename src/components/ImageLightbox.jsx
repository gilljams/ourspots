import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

// Get full quality image URL for lightbox
const getFullImageUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/c_limit,w_1600,q_auto:good/');
};

const ImageLightbox = ({ 
  images, // Array of { url, caption? }
  initialIndex = 0, 
  onClose 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const containerRef = useRef(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Reset loading state when image changes
  useEffect(() => {
    setImageLoaded(false);
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const goToNext = () => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  };

  const goToPrevious = () => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  // Touch handlers for swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[2000] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center gap-2">
          {hasMultiple && (
            <span className="text-sm text-white/70">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main image area */}
      <div 
        className="flex-1 flex items-center justify-center relative px-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Navigation arrows (desktop) */}
        {hasMultiple && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors hidden md:flex items-center justify-center z-10"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors hidden md:flex items-center justify-center z-10"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        {/* Loading spinner */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Image */}
        <img 
          src={getFullImageUrl(currentImage.url)} 
          alt={currentImage.caption || ''} 
          className={`max-w-full max-h-[70vh] object-contain transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
      </div>

      {/* Caption */}
      {currentImage.caption && (
        <div className="text-center text-white/80 text-sm px-4 py-2">
          {currentImage.caption}
        </div>
      )}

      {/* Thumbnail strip (if multiple images) */}
      {hasMultiple && (
        <div className="p-4">
          <div className="flex justify-center gap-2 overflow-x-auto max-w-full">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex 
                    ? 'border-white ring-2 ring-white/50' 
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img 
                  src={img.url.replace('/upload/', '/upload/c_fill,w_128,h_96,q_auto/')} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dots indicator (mobile, if multiple) */}
      {hasMultiple && (
        <div className="flex justify-center gap-1.5 pb-4 md:hidden">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white w-4' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;
