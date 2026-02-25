import React from 'react';
import { MapPin, Map as MapIcon, X, Calendar, Play, Pause, Edit2, MessageCircle } from 'lucide-react';

export const LocationBlock = ({ data, onDelete, canDelete, positionNumber, isPrimaryLocation, onShowOnMap, onEditNote, hasAudio, isAudioPlaying, onToggleAudio, isCollection, collectionPlacesCount, onShowCollectionMap, whatsappGroupUrl, isExtraLocation, planningData, onShowPlanner }) => {

  const handleShowOnMap = () => {
    if (onShowOnMap && data.lat && data.lng) {
      onShowOnMap({ lat: data.lat, lng: data.lng });
    }
  };
  
  const handleDelete = () => {
    if (window.confirm('Ta bort denna position?')) {
      onDelete();
    }
  };

  const openGoogleMaps = () => {
    if (data.lat && data.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`, '_blank');
    }
  };

  const openWaze = () => {
    if (data.lat && data.lng) {
      window.open(`https://waze.com/ul?ll=${data.lat},${data.lng}&navigate=yes`, '_blank');
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin size={16} className="text-gray-400 flex-shrink-0" />
          {isPrimaryLocation && (
            <span className="text-xs font-medium text-blue-400">
              primär
            </span>
          )}
          {positionNumber && (
            <span className="text-xs font-medium text-orange-400">
              #{positionNumber}
            </span>
          )}
          <span className="text-sm text-gray-300 truncate">
            {data.address || (data.lat && data.lng ? `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}` : 'Ingen plats')}
          </span>
        </div>
        {data.lat && data.lng && (
        <div className="flex items-center gap-1">
          {/* Collection: WhatsApp button */}
          {isCollection && whatsappGroupUrl && (
            <button
              onClick={() => window.open(whatsappGroupUrl, '_blank')}
              className="w-9 h-9 rounded-lg bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center text-green-400 hover:text-green-300 transition-all flex-shrink-0"
              title="WhatsApp-grupp"
            >
              <MessageCircle size={16} />
            </button>
          )}
          {/* Audio play button - shown if audio exists (centralized playback) */}
          {hasAudio && (
            <button
              onClick={onToggleAudio}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                isAudioPlaying 
                  ? 'bg-blue-500/30 text-blue-300 ring-2 ring-blue-500/50 ring-offset-1 ring-offset-transparent' 
                  : 'bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400'
              }`}
              style={isAudioPlaying ? { animation: 'pulse-glow 1s ease-in-out infinite' } : {}}
              title={isAudioPlaying ? 'Pausa' : 'Spela'}
            >
              {isAudioPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
            </button>
          )}
          {/* Collection: Show all places on map button */}
          {isCollection && collectionPlacesCount > 0 && onShowCollectionMap && (
            <button
              onClick={onShowCollectionMap}
              className="h-9 px-3 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-all"
              title="Visa alla platser på karta"
            >
              <MapIcon size={16} />
              <span className="text-sm font-medium">{collectionPlacesCount} {collectionPlacesCount === 1 ? 'plats' : 'platser'}</span>
            </button>
          )}
          {/* Collection: Show planner button */}
          {isCollection && planningData && onShowPlanner && (
            <button
              onClick={onShowPlanner}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all flex-shrink-0"
              title={`Visa planering (${planningData.days} dagar)`}
            >
              <Calendar size={16} />
            </button>
          )}
          {/* Non-collection: Show on map button */}
          {!isCollection && onShowOnMap && (
            <button
              onClick={handleShowOnMap}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
              title="Visa på karta"
            >
              <MapIcon size={16} />
            </button>
          )}
          {/* Google Maps button - only for primary location, not extras */}
          {!isCollection && !isExtraLocation && (
            <button
              onClick={openGoogleMaps}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
              title="Google Maps"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </button>
          )}
          {/* Waze button - only for primary location, not extras */}
          {!isCollection && !isExtraLocation && (
            <button
              onClick={openWaze}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
              title="Waze"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.8-3.2c-.3-.5-.8-.8-1.4-.8H9.2c-.6 0-1.1.3-1.4.8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </button>
          )}
          {/* Edit note button */}
          {onEditNote && (
            <button
              onClick={onEditNote}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
              title={data.note ? 'Redigera anteckning' : 'Lägg till anteckning'}
            >
              <Edit2 size={16} />
            </button>
          )}
          {/* Delete button */}
          {canDelete && onDelete && (
            <button
              onClick={handleDelete}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
              title="Ta bort position"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
      </div>
      {/* Show note if available */}
      {data.note && (
        <div className="ml-6 text-xs text-gray-500 italic">
          "{data.note}"
        </div>
      )}
    </div>
  );
};
