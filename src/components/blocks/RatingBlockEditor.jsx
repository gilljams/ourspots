import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, RotateCcw, Star } from 'lucide-react';

// Rating Block Editor
function RatingBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving, hideReorder }) {
  const [title, setTitle] = useState(block.title || 'Betyg');
  const [isExpanded, setIsExpanded] = useState(false);

  const syncToParent = (newTitle) => {
    onUpdate(block.id, { 
      title: newTitle, 
      ratings: block.ratings || {} 
    });
  };

  const resetRatings = () => {
    if (window.confirm('Vill du nollställa alla betyg? Detta kan inte ångras.')) {
      onUpdate(block.id, { title, ratings: {} });
    }
  };

  const ratingCount = Object.keys(block.ratings || {}).length;

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
          <Star size={16} className="text-yellow-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || 'Betyg'}
          </span>
          {ratingCount > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({ratingCount} röster)</span>
          )}
        </button>
        <div className="flex gap-1 flex-shrink-0">
          {!hideReorder && (
            <>
              <button type="button" onClick={() => onMove(block.id, -1)} disabled={index === 0} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => onMove(block.id, 1)} disabled={index === total - 1} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
                <ArrowDown size={14} />
              </button>
            </>
          )}
          <button type="button" onClick={() => onRemove(block.id)} className="w-7 h-7 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Title input */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Rubrik</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                syncToParent(e.target.value);
              }}
              placeholder="T.ex. 'Betygsätt restaurangen'"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-base focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Reset button */}
          {ratingCount > 0 && (
            <button
              type="button"
              onClick={resetRatings}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <RotateCcw size={12} />
              Nollställ betyg
            </button>
          )}

          {/* Preview */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">Förhandsvisning</div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={20} className="text-gray-600" />
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Användare kan ge 1-5 stjärnor. Snittbetyget visas automatiskt.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { RatingBlockEditor };
export default RatingBlockEditor;
