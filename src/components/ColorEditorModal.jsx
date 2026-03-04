import React, { useState, useRef } from 'react';
import { X, Plus, Check, Trash2, GripVertical, ChevronDown } from 'lucide-react';
import { useFullscreenModal } from '../utils/useFullscreenModal';
import { useDragReorder } from '../utils/useDragReorder';

const ROOM_SUGGESTIONS = ['Fasad', 'Kök', 'Vardagsrum', 'Sovrum', 'Badrum', 'Hall', 'Tak', 'Garage'];

// Generate year options: current year down to 1950
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, i) => CURRENT_YEAR - i);

/**
 * ColorEditorModal – fullscreen modal for editing color/paint entries.
 * Follows the same pattern as ListEditorModal / SimpleTableEditorModal.
 *
 * Data model per entry:
 *   { id, room, colorName, colorCode, hex, note, years: [2024, 2020, ...] }
 *
 * Legacy fields brand/product are migrated into note on load.
 */
export function ColorEditorModal({ entries: initialEntries, title, onSave, onCancel }) {
  const [entries, setEntries] = useState(() =>
    (initialEntries || []).map((e, i) => {
      // Migrate legacy brand/product → note
      let note = e.note || '';
      if (!note && (e.brand || e.product)) {
        note = [e.brand, e.product].filter(Boolean).join(', ');
      }
      return {
        ...e,
        note,
        years: e.years || [],
        id: e.id || `entry-${i}-${Date.now()}`,
      };
    })
  );
  const [editingId, setEditingId] = useState(null);
  const scrollRef = useRef(null);

  const HEADER_HEIGHT = 52;

  const { viewportHeight, viewportOffset } = useFullscreenModal({
    bgColor: '#111827',
    headerHeight: HEADER_HEIGHT,
  });

  const addEntry = (roomName = '') => {
    const newId = `entry-${Date.now()}`;
    const newEntry = {
      id: newId,
      room: roomName,
      colorName: '',
      colorCode: '',
      hex: '#888888',
      note: '',
      years: [],
    };
    setEntries(prev => [...prev, newEntry]);
    setEditingId(newId);
    // Scroll so the new entry's top (Room field) is visible, not the very bottom
    setTimeout(() => {
      const el = scrollRef.current?.querySelector(`[data-entry-id="${newId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const updateEntry = (entryId, field, value) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, [field]: value } : e));
  };

  const toggleYear = (entryId, year) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e;
      const years = e.years || [];
      return {
        ...e,
        years: years.includes(year)
          ? years.filter(y => y !== year)
          : [...years, year].sort((a, b) => b - a),
      };
    }));
  };

  const removeEntry = (entryId) => {
    setEntries(prev => prev.filter(e => e.id !== entryId));
    if (editingId === entryId) setEditingId(null);
  };

  const {
    draggedId, dragOverId, touchDragId, touchY,
    handleDragStart, handleDragOver, handleDragLeave,
    handleDrop, handleDragEnd, handleTouchStart,
  } = useDragReorder({
    rows: entries,
    setRows: setEntries,
    selectMode: false,
    selectedIds: new Set(),
    listRef: scrollRef,
  });

  // Strip legacy fields before saving
  const handleSave = () => {
    const cleaned = entries.map(({ brand, product, ...rest }) => rest);
    onSave(cleaned);
  };

  const contentHeight = viewportHeight - HEADER_HEIGHT;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1999] bg-gray-900" />

      {/* Main modal */}
      <div
        className="fixed left-0 right-0 z-[2000] bg-gray-900 flex flex-col"
        style={{
          top: `calc(${viewportOffset}px + env(safe-area-inset-top))`,
          height: `calc(${viewportHeight}px - env(safe-area-inset-top))`,
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-3 border-b border-white/5 bg-gray-950/50"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base font-medium text-white truncate">
              {title || 'Kulör'}
            </span>
            <span className="text-xs text-gray-400 bg-white/10 px-1.5 py-0.5 rounded-full">
              {entries.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          style={{ height: `${contentHeight}px`, paddingBottom: '100px' }}
        >
          {/* Empty state */}
          {entries.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                <Plus size={24} className="text-gray-500" />
              </div>
              <p className="font-medium">Inga färger ännu</p>
              <p className="text-sm mt-1 text-gray-600">Lägg till en yta nedan</p>
              <div className="flex flex-wrap gap-1.5 justify-center mt-4 px-6">
                {ROOM_SUGGESTIONS.map((room) => (
                  <button
                    key={room}
                    type="button"
                    onClick={() => addEntry(room)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    {room}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {entries.map((entry, i) => (
                <div
                  key={entry.id}
                  data-entry-id={entry.id}
                  data-row-id={entry.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, entry.id)}
                  onDragOver={(e) => handleDragOver(e, entry.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, entry.id)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all ${
                    draggedId === entry.id ? 'opacity-50' : ''
                  } ${
                    dragOverId === entry.id ? 'bg-blue-500/10 border-t-2 border-blue-500' : ''
                  } ${
                    touchDragId === entry.id ? 'opacity-50 scale-105' : ''
                  }`}
                  style={touchDragId === entry.id ? { transform: `translateY(${touchY}px)` } : {}}
                >
                  {/* Compact row – tap to expand */}
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer active:bg-white/[0.02]"
                    onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                  >
                    <div
                      className="text-gray-500 cursor-grab active:cursor-grabbing touch-none"
                      onTouchStart={(e) => handleTouchStart(e, entry.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={16} />
                    </div>
                    <div
                      className="w-8 h-8 rounded-lg border border-white/10 flex-shrink-0 shadow-inner"
                      style={{ backgroundColor: entry.hex || '#888' }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-200 truncate block">
                        {entry.room || 'Namnlös yta'}
                      </span>
                      {(entry.colorCode || entry.colorName || entry.note) && (
                        <span className="text-xs text-gray-500 truncate block">
                          {[entry.colorName, entry.colorCode, entry.note].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                    {entry.years && entry.years.length > 0 && (
                      <span className="text-xs text-gray-600 flex-shrink-0">
                        {entry.years[0]}{entry.years.length > 1 ? ` +${entry.years.length - 1}` : ''}
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      className={`text-gray-500 transition-transform flex-shrink-0 ${editingId === entry.id ? '' : '-rotate-90'}`}
                    />
                  </div>

                  {/* Expanded edit fields */}
                  {editingId === entry.id && (
                    <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-white/5">
                      {/* Room name */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Rum / Yta</label>
                        <input
                          type="text"
                          value={entry.room}
                          onChange={(e) => updateEntry(entry.id, 'room', e.target.value)}
                          placeholder="Fasad, Kök..."
                          autoFocus
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        {!entry.room && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ROOM_SUGGESTIONS.filter(r => !entries.some(e => e.room === r)).map((room) => (
                              <button
                                key={room}
                                type="button"
                                onClick={() => updateEntry(entry.id, 'room', room)}
                                className="px-2 py-0.5 rounded bg-white/5 text-xs text-gray-500 hover:text-gray-300 hover:bg-white/10"
                              >
                                {room}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Color picker + name + code — all on one row */}
                      <div className="flex gap-2 items-end">
                        <div className="flex-shrink-0">
                          <label className="text-xs text-gray-500 mb-1 block">Färg</label>
                          <input
                            type="color"
                            value={entry.hex || '#888888'}
                            onChange={(e) => updateEntry(entry.id, 'hex', e.target.value)}
                            className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-xs text-gray-500 mb-1 block">Namn</label>
                          <input
                            type="text"
                            value={entry.colorName}
                            onChange={(e) => updateEntry(entry.id, 'colorName', e.target.value)}
                            placeholder="Äggskal..."
                            className="w-full px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-xs text-gray-500 mb-1 block">Kod</label>
                          <input
                            type="text"
                            value={entry.colorCode}
                            onChange={(e) => updateEntry(entry.id, 'colorCode', e.target.value)}
                            placeholder="S 3020-Y30R"
                            className="w-full px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Note (merged brand + product) */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Notering</label>
                        <input
                          type="text"
                          value={entry.note}
                          onChange={(e) => updateEntry(entry.id, 'note', e.target.value)}
                          placeholder="Fabrikat, glans, typ..."
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Years (multi-select chips) */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Målad år</label>
                        <div className="flex flex-wrap gap-1">
                          {(entry.years || []).map(y => (
                            <button
                              key={y}
                              type="button"
                              onClick={() => toggleYear(entry.id, y)}
                              className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-xs font-medium hover:bg-blue-500/30 transition-colors"
                            >
                              {y} ×
                            </button>
                          ))}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) toggleYear(entry.id, Number(e.target.value));
                            }}
                            className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-gray-400 focus:outline-none focus:border-blue-500 cursor-pointer"
                            style={{ colorScheme: 'dark' }}
                          >
                            <option value="">+ År</option>
                            {YEAR_OPTIONS.filter(y => !(entry.years || []).includes(y)).map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Actions: delete */}
                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={12} /> Ta bort
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add button */}
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => addEntry('')}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 hover:bg-white/[0.02] transition-colors text-sm mx-0 px-3"
            >
              <Plus size={16} /> Lägg till yta
            </button>
          )}
        </div>

        {/* Floating save button (FAB) */}
        <button
          type="button"
          onClick={handleSave}
          className="absolute z-[2001] right-4 bottom-4 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center"
        >
          <Check size={24} strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}

export default ColorEditorModal;
