import React, { useState } from 'react';
import { Star, ChevronDown } from 'lucide-react';

// Rating Block - star ratings from users
export const RatingBlock = ({ data, currentUser, shares = {}, onRate, canEdit = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const title = data.title || 'Betyg';
  const ratings = data.ratings || {};
  
  // Get current user's email key
  const getUserEmailKey = (email) => {
    if (!email) return null;
    return email.replace(/\./g, '_DOT_');
  };
  
  const currentUserKey = currentUser?.email ? getUserEmailKey(currentUser.email) : null;
  const currentUserRating = currentUserKey ? ratings[currentUserKey]?.rating : null;
  
  // Calculate average rating
  const ratingValues = Object.values(ratings).map(r => r.rating).filter(r => r > 0);
  const averageRating = ratingValues.length > 0 
    ? ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length 
    : 0;
  const ratingCount = ratingValues.length;
  
  // Handle rating click
  const handleRate = (stars) => {
    if (!currentUserKey || !onRate) return;
    
    const newRatings = { ...ratings };
    if (currentUserRating === stars) {
      delete newRatings[currentUserKey];
    } else {
      newRatings[currentUserKey] = {
        rating: stars,
        displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonym',
        timestamp: Date.now()
      };
    }
    onRate(newRatings);
  };
  
  // Render star for average display
  const renderAvgStar = (starNum, size = 16) => {
    const filled = averageRating >= starNum - 0.5;
    return (
      <Star
        key={starNum}
        size={size}
        className={filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
      />
    );
  };
  
  // Render interactive star for voting
  const renderVoteStar = (starNum) => {
    const filled = hoveredStar >= starNum || (!hoveredStar && currentUserRating >= starNum);
    return (
      <button
        key={starNum}
        type="button"
        onClick={() => handleRate(starNum)}
        onMouseEnter={() => setHoveredStar(starNum)}
        onMouseLeave={() => setHoveredStar(0)}
        className="transition-all hover:scale-110 cursor-pointer touch-manipulation p-1"
      >
        <Star
          size={28}
          className={`transition-colors ${filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
        />
      </button>
    );
  };
  
  return (
    <div className="bg-white/5 rounded-xl overflow-hidden">
      {/* Compact header - always visible */}
      <button
        type="button"
        onClick={() => currentUserKey && setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-3 ${currentUserKey ? 'hover:bg-white/5 cursor-pointer' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Star size={16} className="text-yellow-400 flex-shrink-0" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Show average stars */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => renderAvgStar(star, 14))}
          </div>
          {ratingCount > 0 ? (
            <span className="text-sm font-semibold text-yellow-400">{averageRating.toFixed(1)}</span>
          ) : (
            <span className="text-xs text-gray-500">Ingen än</span>
          )}
          <span className="text-xs text-gray-500">({ratingCount})</span>
          {currentUserKey && (
            <ChevronDown 
              size={16} 
              className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            />
          )}
        </div>
      </button>
      
      {/* Expanded: Vote section */}
      {isExpanded && currentUserKey && (
        <div className="px-3 pb-3 border-t border-white/10">
          <div className="text-xs text-gray-400 mt-2 mb-1">
            {currentUserRating ? `Ditt betyg: ${currentUserRating} ★` : 'Tryck för att betygsätta'}
          </div>
          <div className="flex items-center justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => renderVoteStar(star))}
          </div>
          {currentUserRating && (
            <button
              type="button"
              onClick={() => handleRate(currentUserRating)}
              className="mt-2 text-xs text-gray-500 hover:text-red-400"
            >
              Ta bort mitt betyg
            </button>
          )}
        </div>
      )}
      
      {/* Not logged in hint */}
      {!currentUserKey && (
        <div className="px-3 pb-2 text-xs text-gray-500">
          Logga in för att betygsätta
        </div>
      )}
    </div>
  );
};
