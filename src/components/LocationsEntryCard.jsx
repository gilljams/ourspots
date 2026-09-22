import React from 'react';
import { Map as MapIcon, Navigation, CloudUpload, ChevronRight } from 'lucide-react';
import { formatDistanceMeters, bearingToCompass } from '../utils/geoUtils';

/**
 * Primary way into the map for objects that collect several positions.
 *
 * The direction is given as a compass word rather than an arrow: without a
 * device compass an arrow would imply "point the phone this way", which it
 * cannot deliver.
 */
export default function LocationsEntryCard({ count, pendingCount = 0, nearest, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/15 to-blue-600/5 hover:from-blue-500/20 hover:to-blue-600/10 active:from-blue-500/25 transition-all p-4 flex items-center gap-4 touch-manipulation"
    >
      <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
        <MapIcon size={22} className="text-blue-300" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-white font-medium">
          {count} {count === 1 ? 'plats' : 'platser'} på kartan
        </div>

        {nearest ? (
          <div className="flex items-center gap-1.5 text-sm text-blue-200/90 mt-0.5">
            <Navigation size={13} className="flex-shrink-0" />
            <span>
              Närmaste {formatDistanceMeters(nearest.distance)} åt {bearingToCompass(nearest.bearing)}
            </span>
          </div>
        ) : (
          <div className="text-sm text-gray-400 mt-0.5">Öppna kartan</div>
        )}

        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-300 mt-1">
            <CloudUpload size={12} className="flex-shrink-0" />
            <span>{pendingCount} väntar på att skickas</span>
          </div>
        )}
      </div>

      <ChevronRight size={20} className="text-blue-300/60 flex-shrink-0" />
    </button>
  );
}
