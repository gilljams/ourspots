import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Music } from 'lucide-react';

// Audio Block Editor - for admin-only audio blocks
function AudioBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [title, setTitle] = useState(block.title || '');
  const [url, setUrl] = useState(block.url || '');
  const [discrete, setDiscrete] = useState(block.discrete !== false); // Default to true (discrete)
  const [animation, setAnimation] = useState(block.animation || 'none'); // 'none', 'cykel', 'gris'
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync with block changes
  useEffect(() => {
    setTitle(block.title || '');
    setUrl(block.url || '');
    setDiscrete(block.discrete !== false);
    setAnimation(block.animation || 'none');
  }, [block.id, block.title, block.url, block.discrete, block.animation]);

  const handleTitleChange = (value) => {
    setTitle(value);
    onUpdate(block.id, { title: value });
  };

  const handleUrlChange = (value) => {
    setUrl(value);
    onUpdate(block.id, { url: value });
  };

  const handleDiscreteChange = (value) => {
    setDiscrete(value);
    onUpdate(block.id, { discrete: value });
  };

  const handleAnimationChange = (value) => {
    setAnimation(value);
    onUpdate(block.id, { animation: value });
  };

  // Summary for collapsed state
  const getSummary = () => {
    if (title) return title;
    if (url) return url.split('/').pop() || 'Ljudfil';
    return 'Ingen ljudfil';
  };

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Collapsible Header */}
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
          <Music size={16} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">Ljud</span>
          {!isExpanded && (
            <span className="text-xs text-gray-500 truncate ml-1">
              {getSummary()}
            </span>
          )}
        </button>
        <div className="flex gap-1 flex-shrink-0">
          {onMove && index > 0 && (
            <button type="button" onClick={() => onMove(block.id, -1)} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center">
              <ArrowUp size={14} />
            </button>
          )}
          {onMove && index < total - 1 && (
            <button type="button" onClick={() => onMove(block.id, 1)} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center">
              <ArrowDown size={14} />
            </button>
          )}
          {onRemove && (
            <button type="button" onClick={() => onRemove(block.id)} className="w-7 h-7 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
      <div className="p-3 space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Titel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="T.ex. Vår låt"
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">URL till ljudfil</label>
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="/ourspots/media/låt.mp3 eller https://..."
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Lägg filer i public/media/ för /ourspots/media/filnamn.mp3
          </p>
        </div>
        
        {/* Discrete toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div>
            <span className="text-sm text-white">Diskret läge</span>
            <p className="text-xs text-gray-500">Visa endast play-knapp vid plats</p>
          </div>
          <button
            type="button"
            onClick={() => handleDiscreteChange(!discrete)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              discrete ? 'bg-blue-500' : 'bg-white/20'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
              discrete ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Animation selector - only shown when discrete mode is on */}
        {discrete && (
          <div className="pt-3 border-t border-white/5">
            <label className="text-sm text-white block mb-2">Animation</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAnimationChange('none')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
                  animation === 'none' 
                    ? 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-500/50' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Ingen
              </button>
              <button
                type="button"
                onClick={() => handleAnimationChange('cykel')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
                  animation === 'cykel' 
                    ? 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-500/50' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Cykel
              </button>
              <button
                type="button"
                onClick={() => handleAnimationChange('gris')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
                  animation === 'gris' 
                    ? 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-500/50' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Gris
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Visar en rolig animation över bilden vid uppspelning</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export { AudioBlockEditor };
export default AudioBlockEditor;
