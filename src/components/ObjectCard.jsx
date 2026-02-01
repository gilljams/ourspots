import React from 'react';
import { Star, Share2, Users, Folder, MapPin, Map as MapIcon, Navigation, Home, CornerDownRight, ChevronRight, Clock } from 'lucide-react';
import { getTransformedImageUrl, getFocalPointStyles } from '../utils/imageUtils';
import { getIconComponent, PREDEFINED_ICONS } from '../utils/iconHelpers';

// Helper function to calculate countdown text
const getCountdownText = (targetDate) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return null; // Past date
  if (diffDays === 0) return { text: 'Idag!', highlight: true };
  if (diffDays === 1) return { text: 'Imorgon', highlight: true };
  if (diffDays <= 7) return { text: `om ${diffDays} dagar`, highlight: false };
  if (diffDays <= 14) return { text: `om ${Math.ceil(diffDays / 7)} veckor`, highlight: false };
  if (diffDays <= 60) return { text: `om ${Math.ceil(diffDays / 7)} veckor`, highlight: false };
  return null; // Too far in the future
};

// Get nearest future date from dateTag blocks
const getNearestFutureDate = (blocks) => {
  const dateTagBlocks = blocks.filter(b => b.type === 'dateTag');
  if (dateTagBlocks.length === 0) return null;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  let nearestDate = null;
  let nearestDiff = Infinity;
  
  for (const block of dateTagBlocks) {
    const tags = block.data?.tags || [];
    for (const tag of tags) {
      let dateToCheck = null;
      if (tag.type === 'range' && tag.start) {
        dateToCheck = new Date(tag.start);
      }
      // Skip year-only tags
      if (dateToCheck) {
        dateToCheck.setHours(0, 0, 0, 0);
        const diff = dateToCheck - now;
        if (diff >= 0 && diff < nearestDiff) {
          nearestDiff = diff;
          nearestDate = dateToCheck;
        }
      }
    }
  }
  
  return nearestDate;
};

function ObjectCard({ object, onClick, currentUser, childCount, distance, categories, isFavorite, onToggleFavorite, onNavigate, onShare, isOrphanChild, parentChain, showAsChild }) {
  // Find category to get icon
  const category = categories.find(c => c.id === object.type);
  const IconComponent = category ? getIconComponent(category.icon) : (PREDEFINED_ICONS[object.type]?.icon || Home);
  const titleBlock = object.blocks.find(b => b.type === 'title');
  const imageBlock = object.blocks.find(b => b.type === 'image');
  const locationBlock = object.blocks.find(b => b.type === 'location');
  const textBlock = object.blocks.find(b => b.type === 'text');
  
  // Get countdown for nearest future date
  const nearestDate = getNearestFutureDate(object.blocks || []);
  const countdown = nearestDate ? getCountdownText(nearestDate) : null;
  const isOwner = currentUser && object.ownerId === currentUser.uid;
  const isSharedWithMe = object.isSharedWithMe;
  const myShareRole = isSharedWithMe ? object.shares?.[currentUser?.email?.toLowerCase()]?.role : null;

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(object.id);
  };

  const handleShareClick = (e) => {
    e.stopPropagation();
    if (onShare) onShare(object);
  };

  const openWaze = (e) => {
    e.stopPropagation();
    if (locationBlock?.data?.lat && locationBlock?.data?.lng) {
      window.open(`https://waze.com/ul?ll=${locationBlock.data.lat},${locationBlock.data.lng}&navigate=yes`, '_blank');
    }
  };

  const handleShowOnMap = (e) => {
    e.stopPropagation();
    if (onNavigate && locationBlock?.data?.lat && locationBlock?.data?.lng) {
      onNavigate({ lat: locationBlock.data.lat, lng: locationBlock.data.lng });
    }
  };

  const hasLocation = locationBlock?.data?.lat && locationBlock?.data?.lng;
  
  // Get a preview snippet from text block
  const textPreview = textBlock?.data?.content?.slice(0, 80)?.replace(/[#*_-]/g, '')?.trim();

  // Breadcrumb for orphan children or search results showing children
  const showBreadcrumb = showAsChild && parentChain && parentChain.length > 0;

  return (
    <div onClick={onClick} className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-blue-400/50 transition-all cursor-pointer transform hover:scale-[1.02] relative group">
      {/* Parent breadcrumb for orphan/search children */}
      {showBreadcrumb && (
        <div className="px-3 py-1.5 bg-blue-500/10 border-b border-white/5 flex items-center gap-1 text-[10px] text-blue-300/80 overflow-hidden">
          <CornerDownRight size={10} className="flex-shrink-0 opacity-60" />
          {parentChain.map((name, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={8} className="flex-shrink-0 opacity-40" />}
              <span className="truncate">{name}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      {imageBlock ? (
        <>
          {/* Top left buttons: Favorite + Share */}
          <div className={`absolute ${showBreadcrumb ? 'top-8' : 'top-2'} left-2 z-10 flex items-center gap-1.5`}>
            {currentUser && (
              <button
                onClick={handleFavoriteClick}
                className="p-1.5 rounded-full bg-gray-900/70 backdrop-blur-sm hover:bg-gray-800/90 hover:scale-110 transition-all duration-200"
                title={isFavorite ? 'Ta bort från favoriter' : 'Lägg till i favoriter'}
              >
                <Star 
                  size={16} 
                  className={`transition-colors ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-300'}`}
                />
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleShareClick}
                className="p-1.5 rounded-full bg-gray-900/70 backdrop-blur-sm hover:bg-gray-800/90 hover:scale-110 transition-all duration-200"
                title="Dela"
              >
                <Share2 size={16} className="text-gray-400 hover:text-blue-300" />
              </button>
            )}
          </div>
          {/* Top right badges: Shared indicator + Child count */}
          <div className={`absolute ${showBreadcrumb ? 'top-8' : 'top-2'} right-2 z-10 flex items-center gap-1.5`}>
            {isSharedWithMe && (
              <div className="bg-purple-500/20 backdrop-blur-sm text-purple-300 text-xs px-2 py-1 rounded-full border border-purple-500/30 flex items-center gap-1" title={`Delad med dig som ${myShareRole === 'editor' ? 'redigerare' : 'läsare'}`}>
                <Users size={12} />
              </div>
            )}
            {childCount > 0 && (
              <div className="bg-white/10 backdrop-blur-sm text-gray-200 text-xs px-2 py-1 rounded-full border border-white/15 flex items-center gap-1">
                <Folder size={12} className="text-gray-300" />
                {childCount}
              </div>
            )}
          </div>
          <div className="w-full h-40 overflow-hidden relative">
            <img 
              src={getTransformedImageUrl(imageBlock.data.url, imageBlock.data.focalPoint ? 'custom' : imageBlock.data.cropMode, 800, 320, imageBlock.data.focalPoint)} 
              alt="" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              style={getFocalPointStyles(imageBlock.data.focalPoint)}
            />
            {/* Countdown badge at bottom left */}
            {countdown && (
              <div className={`absolute bottom-2 left-2 z-10 backdrop-blur-sm text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                countdown.highlight 
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40' 
                  : 'bg-gray-900/70 text-gray-300 border border-white/10'
              }`}>
                <Clock size={11} />
                {countdown.text}
              </div>
            )}
          </div>
        </>
      ) : null}
      <div className={imageBlock ? "p-4" : "p-4"}>
        {!category && isOwner && (
          <div className="mb-2 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/20">
            ⚠️ Ogiltig kategori - redigera objektet
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <IconComponent size={18} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            {titleBlock && <h3 className="text-lg font-semibold text-white truncate">{titleBlock.data.text}</h3>}
          </div>
          {/* Favorite + Share buttons for cards without image */}
          {!imageBlock && (
            <div className="flex items-center gap-1">
              {currentUser && (
                <button
                  onClick={handleFavoriteClick}
                  className="p-1.5 rounded-full hover:bg-white/10 hover:scale-110 transition-all duration-200 flex-shrink-0"
                  title={isFavorite ? 'Ta bort från favoriter' : 'Lägg till i favoriter'}
                >
                  <Star 
                    size={16} 
                    className={`transition-colors ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-300'}`}
                  />
                </button>
              )}
              {isOwner && (
                <button
                  onClick={handleShareClick}
                  className="p-1.5 rounded-full hover:bg-white/10 hover:scale-110 transition-all duration-200 flex-shrink-0"
                  title="Dela"
                >
                  <Share2 size={16} className="text-gray-400 hover:text-blue-300" />
                </button>
              )}
              {isSharedWithMe && (
                <div className="p-1.5 rounded-full flex-shrink-0" title={`Delad med dig som ${myShareRole === 'editor' ? 'redigerare' : 'läsare'}`}>
                  <Users size={16} className="text-purple-400" />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Compact info row for cards without image */}
        {!imageBlock && (childCount > 0 || distance !== undefined) && (
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            {childCount > 0 && (
              <span className="flex items-center gap-1">
                <Folder size={12} />
                {childCount} objekt
              </span>
            )}
            {distance !== undefined && (
              <span className="flex items-center gap-1 text-blue-400">
                <MapPin size={12} />
                {distance.toFixed(1)} km
              </span>
            )}
          </div>
        )}
        
        {/* Location info - only address for cards with image */}
        {imageBlock && locationBlock?.data?.address && (
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <MapPin size={14} className="flex-shrink-0" />
            <span className="truncate flex-1">{locationBlock.data.address}</span>
            {distance !== undefined && (
              <span className="text-blue-400 flex-shrink-0">{distance.toFixed(1)} km</span>
            )}
          </div>
        )}
        
        {/* Action buttons */}
        {hasLocation && (
          <div className="flex gap-2">
            <button
              onClick={handleShowOnMap}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-sm"
            >
              <MapIcon size={14} />
              <span>Karta</span>
            </button>
            <button
              onClick={openWaze}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-sm"
            >
              <Navigation size={14} />
              <span>Navigera</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ObjectCard;
