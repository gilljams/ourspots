import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Calendar, Plus } from 'lucide-react';

// DateTag block editor component
function DateTagBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [tags, setTags] = useState(block.tags || []);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newRangeStart, setNewRangeStart] = useState('');
  const [newRangeEnd, setNewRangeEnd] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Use ref to always have latest tags for sync
  const tagsRef = React.useRef(tags);
  tagsRef.current = tags;

  // Sync tags from block when it changes externally
  useEffect(() => {
    setTags(block.tags || []);
  }, [block.id]);

  const syncToParent = (newTags) => {
    tagsRef.current = newTags;
    onUpdate(block.id, { tags: newTags });
  };

  const addYearTag = () => {
    if (!newYear) return;
    const newTags = [...tags, { type: 'year', value: newYear }];
    setTags(newTags);
    syncToParent(newTags);
    setShowAddMenu(false);
    setNewYear(new Date().getFullYear().toString());
  };

  const addRangeTag = () => {
    if (!newRangeStart || !newRangeEnd) return;
    const newTags = [...tags, { type: 'range', start: newRangeStart, end: newRangeEnd }];
    setTags(newTags);
    syncToParent(newTags);
    setShowAddMenu(false);
    setNewRangeStart('');
    setNewRangeEnd('');
  };

  const removeTag = (tagIndex) => {
    const newTags = tags.filter((_, i) => i !== tagIndex);
    setTags(newTags);
    syncToParent(newTags);
  };

  const formatTag = (tag) => {
    if (tag.type === 'year') {
      return tag.value;
    } else if (tag.type === 'range') {
      const start = new Date(tag.start);
      const end = new Date(tag.end);
      const formatDate = (d) => d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      return `${formatDate(start)} – ${formatDate(end)}`;
    }
    return '';
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
          <Calendar size={16} className="text-cyan-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            Datum
          </span>
          {tags.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">({tags.length} st)</span>
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
        <div className="px-3 pb-3 space-y-3">
          {/* Existing tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <div 
                  key={i}
                  className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm ${
                    tag.type === 'year' 
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}
                >
                  <span>{formatTag(tag)}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(i)}
                    className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add button / menu */}
          {!showAddMenu ? (
            <button
              type="button"
              onClick={() => setShowAddMenu(true)}
              disabled={saving}
              className="w-full py-3 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg border border-blue-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Lägg till datum
            </button>
          ) : (
            <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-white/10">
              {/* Year option */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">År (t.ex. besöksår)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="2025"
                    min="1900"
                    max="2100"
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addYearTag}
                    className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-sm"
                  >
                    Lägg till
                  </button>
                </div>
              </div>
              
              {/* Date range option */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Datumperiod (t.ex. event)</label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="date"
                    value={newRangeStart}
                    onChange={(e) => setNewRangeStart(e.target.value)}
                    className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-gray-500 self-center">→</span>
                  <input
                    type="date"
                    value={newRangeEnd}
                    onChange={(e) => setNewRangeEnd(e.target.value)}
                    className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={addRangeTag}
                    disabled={!newRangeStart || !newRangeEnd}
                    className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-sm disabled:opacity-50"
                  >
                    Lägg till
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddMenu(false)}
                className="text-sm text-gray-500 hover:text-gray-400"
              >
                Avbryt
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { DateTagBlockEditor };
export default DateTagBlockEditor;
