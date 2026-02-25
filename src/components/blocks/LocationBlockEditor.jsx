import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, MapPin, Globe } from 'lucide-react';

// Location block editor component
function LocationBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving, locationIndexOffset = 0 }) {
  const [note, setNote] = useState(block.note || '');
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Display number accounts for locations before customBlocks (e.g., primary location)
  const displayNumber = index + 1 + locationIndexOffset;
  
  // Use ref for blur handler
  const noteRef = React.useRef(note);
  noteRef.current = note;
  
  const syncToParent = () => {
    onUpdate(block.id, { note: noteRef.current });
  };
  
  // Format coordinates for display
  const formatCoords = () => {
    if (block.lat != null && block.lng != null) {
      return `${block.lat.toFixed(5)}, ${block.lng.toFixed(5)}`;
    }
    return 'Inga koordinater';
  };
  
  // Summary for collapsed state
  const getSummary = () => {
    const parts = [];
    if (block.address) parts.push(block.address);
    else if (block.lat != null) parts.push(formatCoords());
    if (note) parts.push(`"${note.substring(0, 30)}${note.length > 30 ? '...' : ''}"`);
    return parts.length > 0 ? parts.join(' • ') : formatCoords();
  };
  
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Collapsible header */}
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <ChevronDown 
            size={16} 
            className={`text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`} 
          />
          <MapPin size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300">
            Plats #{displayNumber}
          </span>
          {!isExpanded && (
            <span className="text-xs text-gray-500 truncate ml-1">
              {getSummary()}
            </span>
          )}
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button type="button" onClick={() => onMove(block.id, -1)} disabled={index === 0} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ArrowUp size={14} />
          </button>
          <button type="button" onClick={() => onMove(block.id, 1)} disabled={index === total - 1} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ArrowDown size={14} />
          </button>
          <button type="button" onClick={() => onRemove(block.id)} className="w-7 h-7 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* Expandable content */}
      {isExpanded && (
        <div className="space-y-3 p-3 pt-0">
          {/* Coordinates display (read-only) */}
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-400 flex-shrink-0" />
            <div className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm">
              {formatCoords()}
            </div>
          </div>
          
          {/* Address if available */}
          {block.address && (
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm">
                {block.address}
              </div>
            </div>
          )}
          
          {/* Note field (editable) */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Anteckning</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={syncToParent}
              placeholder="T.ex. 'Bästa kantarellstället i oktober'"
              disabled={saving}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { LocationBlockEditor };
export default LocationBlockEditor;
