import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Minus } from 'lucide-react';

// Section block editor component - simple title separator
function SectionBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || 'Sektion');
  const [uppercase, setUppercase] = useState(block.uppercase !== false);
  const [isExpanded, setIsExpanded] = useState(false);

  const titleRef = React.useRef(title);
  titleRef.current = title;

  const syncTitle = () => {
    onUpdate(block.id, { title: titleRef.current, uppercase });
  };

  const handleUppercaseChange = (newValue) => {
    setUppercase(newValue);
    onUpdate(block.id, { title: titleRef.current, uppercase: newValue });
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
          <Minus size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            Sektion: {title}
          </span>
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
        <div className="px-3 pb-3 space-y-3">
          {/* Title input */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rubrik</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={syncTitle}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="Sektionsrubrik..."
            />
          </div>

          {/* Uppercase toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Versaler</span>
            <button
              type="button"
              onClick={() => handleUppercaseChange(!uppercase)}
              className={`relative w-10 h-5 rounded-full transition-colors ${uppercase ? 'bg-blue-500' : 'bg-white/20'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${uppercase ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Preview */}
          <div className="pt-2 border-t border-white/10">
            <label className="block text-xs text-gray-500 mb-2">Förhandsgranskning</label>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-blue-500/50" />
              <span className={`text-sm font-semibold text-blue-400 tracking-wide ${uppercase ? 'uppercase' : ''}`}>
                {title || 'Sektion'}
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-blue-500/30 to-blue-500/50" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { SectionBlockEditor };
export default SectionBlockEditor;
