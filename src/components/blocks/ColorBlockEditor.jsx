import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Palette, Edit2 } from 'lucide-react';
import { ColorEditorModal } from '../ColorEditorModal';

/**
 * ColorBlockEditor – compact editor for the color block.
 * Shows summary + "Redigera" button that opens ColorEditorModal.
 * Same pattern as TableBlockEditor with ListEditorModal.
 */
function ColorBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [defaultCollapsed, setDefaultCollapsed] = useState(block.defaultCollapsed ?? false);

  const entries = block.entries || [];

  const syncToParent = (newEntries, newDefaultCollapsed = defaultCollapsed) => {
    onUpdate(block.id, {
      entries: newEntries,
      defaultCollapsed: newDefaultCollapsed,
    });
  };

  const handleDefaultCollapsedChange = (val) => {
    setDefaultCollapsed(val);
    syncToParent(entries, val);
  };

  // Summary for collapsed state
  const getSummary = () => {
    if (entries.length === 0) return 'Inga färger';
    return entries.map(e => e.room || '?').join(', ');
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
          <Palette size={16} className="text-amber-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300 truncate">
            Kolör
          </span>
          {entries.length > 0 && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              ({entries.length})
            </span>
          )}
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
        <div className="px-3 pb-3 space-y-3">
          {/* Preview of entries */}
          {entries.length > 0 && (
            <div className="space-y-1">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02]">
                  <div
                    className="w-5 h-5 rounded border border-white/10 flex-shrink-0"
                    style={{ backgroundColor: entry.hex || '#888' }}
                  />
                  <span className="text-xs text-gray-300 truncate">
                    {entry.room || 'Namnlös'}
                  </span>
                  {entry.colorCode && (
                    <span className="text-xs text-gray-500 font-mono truncate">
                      {entry.colorCode}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Default collapsed toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-400">Ihopfälld som standard</span>
            <button
              type="button"
              onClick={() => handleDefaultCollapsedChange(!defaultCollapsed)}
              className={`relative w-9 h-5 rounded-full transition-colors ${defaultCollapsed ? 'bg-blue-500' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                defaultCollapsed ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Open editor button */}
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            disabled={saving}
            className="w-full py-3 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg border border-blue-500/20 transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            Redigera färger
          </button>
        </div>
      )}

      {/* Fullscreen color editor modal */}
      {showEditor && (
        <ColorEditorModal
          entries={entries}
          title="Kolör"
          onSave={(newEntries) => {
            syncToParent(newEntries);
            setShowEditor(false);
          }}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}

export { ColorBlockEditor };
export default ColorBlockEditor;
