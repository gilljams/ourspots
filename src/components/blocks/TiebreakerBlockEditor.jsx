import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Swords } from 'lucide-react';

// Tiebreaker Block Editor - rock-paper-scissors for tie-breaking
function TiebreakerBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState(block.title || 'Tiebreaker');
  const [bestOf, setBestOf] = useState(block.bestOf || 3);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? false);

  useEffect(() => {
    setTitle(block.title || 'Tiebreaker');
    setBestOf(block.bestOf || 3);
    setDefaultCollapsed(block.defaultCollapsed ?? false);
  }, [block.id, block.title, block.bestOf, block.defaultCollapsed]);

  const syncToParent = (updates) => {
    onUpdate(block.id, { title, bestOf, defaultCollapsed, ...updates });
  };

  const handleTitleChange = (value) => {
    setTitle(value);
    syncToParent({ title: value });
  };

  const handleBestOfChange = (value) => {
    setBestOf(value);
    syncToParent({ bestOf: value });
  };

  const handleDefaultCollapsedChange = (value) => {
    setDefaultCollapsed(value);
    syncToParent({ defaultCollapsed: value });
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
          <Swords size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            {title || 'Tiebreaker'}
          </span>
          <span className="text-xs text-gray-500 flex-shrink-0">
            ({bestOf === 1 ? '1 runda' : `bäst av ${bestOf}`})
          </span>
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button type="button" onClick={() => onMove(block.id, -1)} disabled={index === 0 || saving} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ArrowUp size={14} />
          </button>
          <button type="button" onClick={() => onMove(block.id, 1)} disabled={index === total - 1 || saving} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ArrowDown size={14} />
          </button>
          <button type="button" onClick={() => onRemove(block.id)} disabled={saving} className="w-7 h-7 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 text-base bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
              placeholder="T.ex. Avgörande"
            />
          </div>

          {/* Best of selection */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Matchformat</label>
            <div className="flex gap-2">
              {[1, 3, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleBestOfChange(n)}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                    bestOf === n
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {n === 1 ? '1 runda' : `Bäst av ${n}`}
                </button>
              ))}
            </div>
          </div>

          {/* Default collapsed toggle */}
          <div className="flex items-center justify-between py-2 border-t border-white/10">
            <span className="text-xs text-gray-400">Ihopfälld som standard</span>
            <button
              type="button"
              onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                defaultCollapsed ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                defaultCollapsed ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Info */}
          <div className="bg-white/5 rounded-lg p-3 flex items-start gap-3">
            <span className="text-sm flex-shrink-0 mt-0.5">✊✌️🖐️</span>
            <p className="text-xs text-gray-500">
              Följare kan utmana varandra till sten-sax-påse direkt i kortet. 
              Perfekt för att avgöra delad placering!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export { TiebreakerBlockEditor };
export default TiebreakerBlockEditor;
