import React, { useState } from 'react';
import { Star } from 'lucide-react';

// Compact inline rating – Google Maps style: ⭐⭐⭐⭐☆ 4.2 (3)
// Tap stars directly to vote (no expand/collapse)
export const RatingInline = ({ data, currentUser, onRate }) => {
  const [hoveredStar, setHoveredStar] = useState(0);
  const ratings = data?.ratings || {};

  const getUserEmailKey = (email) => email ? email.replace(/\./g, '_DOT_') : null;
  const currentUserKey = currentUser?.email ? getUserEmailKey(currentUser.email) : null;
  const currentUserRating = currentUserKey ? ratings[currentUserKey]?.rating : null;

  const ratingValues = Object.values(ratings).map(r => r.rating).filter(r => r > 0);
  const averageRating = ratingValues.length > 0
    ? ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length
    : 0;
  const ratingCount = ratingValues.length;

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

  const canVote = !!currentUserKey && !!onRate;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => {
          // When hovering (if can vote): show hover fill. Otherwise show average fill.
          const showFilled = canVote
            ? (hoveredStar ? hoveredStar >= star : currentUserRating >= star)
            : averageRating >= star - 0.25;

          return canVote ? (
            <button
              key={star}
              type="button"
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="touch-manipulation p-0.5 transition-transform hover:scale-110"
            >
              <Star
                size={14}
                className={`transition-colors ${showFilled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
              />
            </button>
          ) : (
            <Star
              key={star}
              size={14}
              className={showFilled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
            />
          );
        })}
      </div>
      {ratingCount > 0 ? (
        <span className="text-xs font-semibold text-yellow-400 ml-0.5">{averageRating.toFixed(1)}</span>
      ) : (
        <span className="text-xs text-gray-500 ml-0.5">–</span>
      )}
      <span className="text-xs text-gray-500">({ratingCount})</span>
    </div>
  );
};
