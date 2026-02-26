import React from 'react';
import { Calendar } from 'lucide-react';
import { RatingInline } from './RatingInline';
import { DateTagBlock } from './DateTagBlock';

// MetadataRow – compact strip between gallery thumbnails and location
// Shows: inline rating · date pills · planner button
export const MetadataRow = ({
  ratingData,
  dateTagData,
  currentUser,
  onRate,
  planningData,
  onShowPlanner,
  isCollection
}) => {
  const hasRating = !!ratingData;
  const hasDateTags = dateTagData?.tags?.length > 0;
  const hasPlanner = isCollection && planningData && onShowPlanner;

  if (!hasRating && !hasDateTags) return null;

  return (
    <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-3">
      {/* Inline rating */}
      {hasRating && (
        <RatingInline
          data={ratingData}
          currentUser={currentUser}
          onRate={onRate}
        />
      )}

      {/* Dot separator */}
      {hasRating && hasDateTags && (
        <span className="text-gray-600 text-xs">·</span>
      )}

      {/* Date pills + planner button */}
      {hasDateTags && (
        <div className="flex items-center gap-1.5">
          <DateTagBlock data={dateTagData} />
          {hasPlanner && (
            <button
              onClick={onShowPlanner}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all flex-shrink-0"
              title={`Visa planering (${planningData.days} dagar)`}
            >
              <Calendar size={14} />
            </button>
          )}
        </div>
      )}

      {/* Planner without dates – still show it */}
      {!hasDateTags && hasPlanner && (
        <button
          onClick={onShowPlanner}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all flex-shrink-0"
          title={`Visa planering (${planningData.days} dagar)`}
        >
          <Calendar size={14} />
        </button>
      )}
    </div>
  );
};
