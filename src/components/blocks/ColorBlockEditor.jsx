import React, { useState, useRef } from 'react';
import { X, ArrowUp, ArrowDown, ChevronDown, Palette, Plus, GripVertical } from 'lucide-react';

const ROOM_SUGGESTIONS = ['Fasad', 'Kök', 'Vardagsrum', 'Sovrum', 'Badrum', 'Hall', 'Tak', 'Garage'];

/**
 * ColorBlockEditor – editor for color/paint entries per room.
 * Data model: { entries: [{ id, room, colorName, colorCode, hex, brand, product }] }
 */
function ColorBlockEditor({ block, onUpdate, onRemove, onMove, index, total, saving }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const entries = block.entries || [];

  const updateEntries = (newEntries) => {
    onUpdate(block.id, { entries: newEntries });
  };

  const addEntry = (roomName = '') => {
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      room: roomName,
      colorName: '',
      colorCode: '',
      hex: '#888888',
      brand: '',
      product: '',
    };
    updateEntries([...entries, newEntry]);
    setEditingId(newEntry.id);
  };

  const updateEntry = (entryId, field, value) => {
    updateEntries(entries.map(e => e.id === entryId ? { ...e, [field]: value } : e));
  };

  const removeEntry = (entryId) => {
    updateEntries(entries.filter(e => e.id !== entryId));
    if (editingId === entryId) setEditingId(null);
  };

  const moveEntry = (entryId, direction) => {
    const idx = entries.findIndex(e => e.id === entryId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= entries.length) return;
    const newEntries = [...entries];
    [newEntries[idx], newEntries[newIdx]] = [newEntries[newIdx], newEntries[idx]];
    updateEntries(newEntries);
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
        <div className="px-3 pb-3 space-y-2">
          {/* Existing entries */}
          {entries.map((entry, i) => (
            <div key={entry.id} className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
              {/* Entry row – compact view / tap to expand */}
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
              >
                {/* Swatch */}
                <div
                  className="w-7 h-7 rounded-md border border-white/10 flex-shrink-0"
                  style={{ backgroundColor: entry.hex || '#888' }}
                />
                {/* Room + color code */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-200 truncate block">
                    {entry.room || 'Namnlös yta'}
                  </span>
                  {(entry.colorCode || entry.colorName) && (
                    <span className="text-xs text-gray-500 truncate block">
                      {[entry.colorName, entry.colorCode].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-500 transition-transform flex-shrink-0 ${editingId === entry.id ? '' : '-rotate-90'}`}
                />
              </div>

              {/* Expanded edit fields */}
              {editingId === entry.id && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
                  {/* Room name */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Rum / Yta</label>
                    <input
                      type="text"
                      value={entry.room}
                      onChange={(e) => updateEntry(entry.id, 'room', e.target.value)}
                      placeholder="T.ex. Fasad, Kök..."
                      disabled={saving}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {/* Color picker + hex */}
                  <div className="flex gap-2">
                    <div className="flex-shrink-0">
                      <label className="text-xs text-gray-500 mb-1 block">Färg</label>
                      <input
                        type="color"
                        value={entry.hex || '#888888'}
                        onChange={(e) => updateEntry(entry.id, 'hex', e.target.value)}
                        disabled={saving}
                        className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Färgnamn</label>
                      <input
                        type="text"
                        value={entry.colorName}
                        onChange={(e) => updateEntry(entry.id, 'colorName', e.target.value)}
                        placeholder="T.ex. Dimgrön, Äggskal..."
                        disabled={saving}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  {/* Color code (NCS/RAL) */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Färgkod (NCS/RAL)</label>
                    <input
                      type="text"
                      value={entry.colorCode}
                      onChange={(e) => updateEntry(entry.id, 'colorCode', e.target.value)}
                      placeholder="T.ex. S 3020-Y30R"
                      disabled={saving}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {/* Brand + product */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Fabrikat</label>
                      <input
                        type="text"
                        value={entry.brand}
                        onChange={(e) => updateEntry(entry.id, 'brand', e.target.value)}
                        placeholder="T.ex. Beckers"
                        disabled={saving}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Produkt / Glans</label>
                      <input
                        type="text"
                        value={entry.product}
                        onChange={(e) => updateEntry(entry.id, 'product', e.target.value)}
                        placeholder="T.ex. Elegant, matt"
                        disabled={saving}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  {/* Move / delete entry */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveEntry(entry.id, -1)} disabled={i === 0 || saving} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30 text-xs">
                        <ArrowUp size={12} />
                      </button>
                      <button type="button" onClick={() => moveEntry(entry.id, 1)} disabled={i === entries.length - 1 || saving} className="w-7 h-7 rounded bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30 text-xs">
                        <ArrowDown size={12} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      disabled={saving}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Quick-add room buttons */}
          {entries.length === 0 && (
            <div className="pt-1">
              <div className="text-xs text-gray-500 mb-2">Snabblägg till:</div>
              <div className="flex flex-wrap gap-1.5">
                {ROOM_SUGGESTIONS.map((room) => (
                  <button
                    key={room}
                    type="button"
                    onClick={() => addEntry(room)}
                    disabled={saving}
                    className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    {room}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add button */}
          <button
            type="button"
            onClick={() => addEntry('')}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 hover:bg-white/[0.02] transition-colors text-xs"
          >
            <Plus size={14} /> Lägg till yta
          </button>
        </div>
      )}
    </div>
  );
}

export { ColorBlockEditor };
export default ColorBlockEditor;
