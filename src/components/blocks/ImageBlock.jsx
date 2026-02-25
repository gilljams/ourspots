import React, { useState, useEffect } from 'react';
import { Maximize2, Images } from 'lucide-react';
import { getTransformedImageUrl, getFocalPointStyles } from '../../utils/imageUtils';
import ImageLightbox from '../ImageLightbox';

export const ImageBlock = ({ data, isPlaying = false, animation = 'none', galleryImages = [] }) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [animationActive, setAnimationActive] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [showSecondLoop, setShowSecondLoop] = useState(false);
  const [showFilmEnding, setShowFilmEnding] = useState(false);
  const [showParkedBike, setShowParkedBike] = useState(false);
  const focalStyles = getFocalPointStyles(data.focalPoint);
  
  // Get optimized full image URL - max 1600px wide for good mobile quality without being huge
  const getFullImageUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/c_limit,w_1600,q_auto:good/');
  };
  
  // Handle animation start/stop based on audio playing state
  useEffect(() => {
    if (isPlaying && animation !== 'none' && !animationActive) {
      setAnimationKey(prev => prev + 1); // Reset animation
      setAnimationActive(true);
      setShowSecondLoop(false);
      setShowFilmEnding(false);
      setShowParkedBike(false);
    } else if (!isPlaying && animationActive) {
      // Fade out animation smoothly
      setAnimationActive(false);
      setShowSecondLoop(false);
      setShowFilmEnding(false);
      setShowParkedBike(false);
    }
  }, [isPlaying, animation, animationActive]);
  
  // Utökad cykelanimation: andra loop vid 7s, filmslut vid 14s
  useEffect(() => {
    let secondLoopTimer;
    let filmEndingTimer;
    let parkedBikeTimer;
    let resetTimer;
    
    if (animationActive && animation === 'cykel') {
      // Starta andra loopen efter 7 sekunder
      secondLoopTimer = setTimeout(() => {
        setShowSecondLoop(true);
      }, 7000);
      
      // Starta filmslut-sekvensen efter 14 sekunder
      filmEndingTimer = setTimeout(() => {
        setShowFilmEnding(true);
      }, 14000);
      
      // Visa den parkerade cykeln efter 16 sekunder (2s efter fade to black)
      parkedBikeTimer = setTimeout(() => {
        setShowParkedBike(true);
      }, 16000);
      
      // Återställ efter hela animationen (ca 24 sekunder)
      resetTimer = setTimeout(() => {
        setShowFilmEnding(false);
        setShowParkedBike(false);
      }, 24000);
    }
    
    return () => {
      if (secondLoopTimer) clearTimeout(secondLoopTimer);
      if (filmEndingTimer) clearTimeout(filmEndingTimer);
      if (parkedBikeTimer) clearTimeout(parkedBikeTimer);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [animationActive, animation]);
  
  // Build array of all images for lightbox (hero + gallery)
  const allImages = [
    { url: data.url, caption: null },
    ...galleryImages.map(img => ({ url: img.url, caption: img.caption || null }))
  ];
  const hasMultipleImages = allImages.length > 1;
  
  // Open lightbox at specific index
  const openLightbox = (index = 0) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };
  
  // Get animation image source
  const getAnimationImage = () => {
    if (animation === 'cykel') return '/media/cykel.png';
    if (animation === 'gris') return '/media/gris.png';
    return null;
  };
  
  return (
    <>
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-4 border border-white/10 shadow-[0_12px_36px_-18px_rgba(0,0,0,0.7)]">
        {imageError ? (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">Bilden kunde inte laddas</span>
            </div>
          </div>
        ) : (
          <img 
            src={getTransformedImageUrl(data.url, data.focalPoint ? 'custom' : data.cropMode, 800, 600, data.focalPoint)} 
            alt="" 
            className={`w-full h-full object-cover transition-transform ${animationActive ? 'image-ken-burns' : ''}`}
            style={focalStyles}
            onError={() => setImageError(true)}
          />
        )}
        
        {/* Animation overlay */}
        {animationActive && animation !== 'none' && (
          <div 
            key={animationKey}
            className="animation-plupp-container"
          >
            <div className={animation === 'gris' ? 'animation-plupp-gris' : 'animation-plupp'}>
              <img 
                src={getAnimationImage()} 
                alt="" 
                className="animation-plupp-img"
              />
            </div>
          </div>
        )}
        
        {/* Andra cykel-loop */}
        {showSecondLoop && animationActive && animation === 'cykel' && (
          <div className="animation-plupp-container">
            <div className="animation-plupp animation-plupp-loop2">
              <img 
                src="/media/cykel.png" 
                alt="" 
                className="animation-plupp-img"
              />
            </div>
          </div>
        )}
        
        {/* Filmslut-sekvens med fade till svart och strålkastare */}
        {showFilmEnding && animation === 'cykel' && (
          <div className="film-ending-container">
            {/* Fade till svart */}
            <div className="film-fade-to-black" />
            
            {/* "... och nu" text */}
            <div className="film-ending-text-container">
              <span className="film-ending-text">... och nu</span>
            </div>
            
            {/* Strålkastare och parkerad cykel */}
            {showParkedBike && (
              <>
                <div className="spotlight-container">
                  <div className="spotlight-beam" />
                </div>
                <div className="parked-bike-container">
                  <div className="parked-bike-circle">
                    <img 
                      src="/media/cykel_parkerad.png" 
                      alt="" 
                      className="parked-bike-img"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Image count badge (if multiple images) */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/50 text-white/90 text-xs flex items-center gap-1">
            <Images size={12} />
            <span>{allImages.length}</span>
          </div>
        )}
        
        <button
          onClick={() => openLightbox(0)}
          className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition-all"
          title={hasMultipleImages ? 'Visa alla bilder' : 'Visa hela bilden'}
        >
          <Maximize2 size={14} />
        </button>
      </div>
      
      {/* Gallery thumbnails (if multiple images) */}
      {hasMultipleImages && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {allImages.slice(1).map((img, idx) => (
            <button
              key={idx}
              onClick={() => openLightbox(idx + 1)}
              className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all"
            >
              <img 
                src={img.url.includes('cloudinary.com') 
                  ? img.url.replace('/upload/', '/upload/c_fill,w_128,h_96,q_auto/') 
                  : img.url
                } 
                alt={img.caption || ''} 
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
      
      {/* Lightbox */}
      {showLightbox && (
        <ImageLightbox
          images={allImages}
          initialIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
};
