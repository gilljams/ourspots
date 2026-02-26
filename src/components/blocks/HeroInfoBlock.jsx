import React from 'react';
import { MapPin, Map as MapIcon, Edit2, X, MessageCircle, Calendar } from 'lucide-react';
import { useConfirm } from '../../utils/useConfirm';
import { RatingInline } from './RatingInline';

// HeroInfoBlock — unified info zone between image/gallery and content blocks.
// Combines location address, action buttons, and rating into
// a single visually cohesive block with left=info, right=actions layout.
// Date tags + audio play rendered on hero image (ImageBlock).
// Planner button sits in the action buttons row, left of collection map.
export const HeroInfoBlock = ({
  // Location props
  locationData,
  onShowOnMap,
  onEditNote,
  canDelete,
  onDelete,
  // Audio
  hasAudio,
  isAudioPlaying,
  onToggleAudio,
  // Collection
  isCollection,
  collectionPlacesCount,
  onShowCollectionMap,
  whatsappGroupUrl,
  // Metadata: rating
  ratingData,
  currentUser,
  onRate,
  // Metadata: planner
  planningData,
  onShowPlanner,
}) => {
  const confirm = useConfirm();
  const hasLocation = locationData && locationData.lat && locationData.lng;
  const hasRating = !!ratingData;
  const hasPlanner = isCollection && planningData && onShowPlanner;
  const hasMetadata = hasRating;

  if (!hasLocation && !hasMetadata && !hasPlanner) return null;

  const handleShowOnMap = () => {
    if (onShowOnMap && hasLocation) {
      onShowOnMap({ lat: locationData.lat, lng: locationData.lng });
    }
  };

  const handleDelete = async () => {
    if (await confirm({ title: 'Ta bort position?', message: 'Positionen tas bort från objektet.', confirmText: 'Ta bort', variant: 'danger' })) {
      onDelete?.();
    }
  };

  const openGoogleMaps = () => {
    if (hasLocation) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${locationData.lat},${locationData.lng}`, '_blank');
    }
  };

  const openWaze = () => {
    if (hasLocation) {
      window.open(`https://waze.com/ul?ll=${locationData.lat},${locationData.lng}&navigate=yes`, '_blank');
    }
  };

  // Collect action buttons for the right side
  const actionButtons = [];

  // WhatsApp (collection only)
  if (isCollection && whatsappGroupUrl) {
    actionButtons.push(
      <button
        key="whatsapp"
        onClick={() => window.open(whatsappGroupUrl, '_blank')}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all flex-shrink-0"
        title="WhatsApp-grupp"
      >
        <MessageCircle size={15} />
      </button>
    );
  }

  // Planner button (before collection map)
  if (hasPlanner) {
    actionButtons.push(
      <button
        key="planner"
        onClick={onShowPlanner}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all flex-shrink-0"
        title={`Visa planering (${planningData.days} dagar)`}
      >
        <Calendar size={15} />
      </button>
    );
  }

  // Collection map button
  if (isCollection && collectionPlacesCount > 0 && onShowCollectionMap) {
    actionButtons.push(
      <button
        key="collmap"
        onClick={onShowCollectionMap}
        className="h-8 px-2.5 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-all"
        title="Visa alla platser på karta"
      >
        <MapIcon size={15} />
        <span className="text-xs font-medium">{collectionPlacesCount} {collectionPlacesCount === 1 ? 'plats' : 'platser'}</span>
      </button>
    );
  }

  // Non-collection: show on map
  if (!isCollection && onShowOnMap && hasLocation) {
    actionButtons.push(
      <button
        key="map"
        onClick={handleShowOnMap}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
        title="Visa på karta"
      >
        <MapIcon size={15} />
      </button>
    );
  }

  // Non-collection: Google Maps
  if (!isCollection && hasLocation) {
    actionButtons.push(
      <button
        key="google"
        onClick={openGoogleMaps}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
        title="Google Maps"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      </button>
    );
  }

  // Non-collection: Waze
  if (!isCollection && hasLocation) {
    actionButtons.push(
      <button
        key="waze"
        onClick={openWaze}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
        title="Waze"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.8-3.2c-.3-.5-.8-.8-1.4-.8H9.2c-.6 0-1.1.3-1.4.8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
        </svg>
      </button>
    );
  }

  // Edit note
  if (onEditNote) {
    actionButtons.push(
      <button
        key="edit"
        onClick={onEditNote}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-all"
        title={locationData?.note ? 'Redigera anteckning' : 'Lägg till anteckning'}
      >
        <Edit2 size={15} />
      </button>
    );
  }

  // Delete
  if (canDelete && onDelete) {
    actionButtons.push(
      <button
        key="delete"
        onClick={handleDelete}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
        title="Ta bort position"
      >
        <X size={15} />
      </button>
    );
  }

  return (
    <div className="mt-3 flex items-start gap-2">
      {/* Left: info column */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Address */}
        {hasLocation && (
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-300 truncate">
              {locationData.address || `${locationData.lat.toFixed(5)}, ${locationData.lng.toFixed(5)}`}
            </span>
          </div>
        )}

        {/* Rating */}
        {hasRating && (
          <div className="flex items-center">
            <RatingInline
              data={ratingData}
              currentUser={currentUser}
              onRate={onRate}
            />
          </div>
        )}

        {/* Note */}
        {locationData?.note && (
          <div className="text-xs text-gray-500 italic">
            "{locationData.note}"
          </div>
        )}
      </div>

      {/* Right: action buttons – vertically centered, right-aligned */}
      {actionButtons.length > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {actionButtons}
        </div>
      )}
    </div>
  );
};
