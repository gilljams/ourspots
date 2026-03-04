import React, { useState, useRef } from 'react';
import { X, Plus, Check, Trash2, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { useFullscreenModal } from '../utils/useFullscreenModal';

const ROOM_SUGGESTIONS = ['Fasad', 'Kök', 'Vardagsrum', 'Sovrum', 'Badrum', 'Hall', 'Tak', 'Garage'];

/**
 * ColorEditorModal – fullscreen modal for editing color/paint entries.
 * Follows the same pattern as ListEditorModal / SimpleTableEditorModal.
 */
export function ColorEditorModal({ entries: initialEntries, title, onSave, onCancel }) {
  const [entries, setEntries] = useState(() =>
    (initialEntries || []).map((e, i) => ({
      ...e,
      id: e.id || `entry-${i}-${Date.now()}`,
    }))
  );
  const [editingId, setEditingId] = useState(null);
  const scrollRef = useRef(null);

  const HEADER_HEIGHT = 52;

  const { viewportHeight, viewportOffset } = useFullscreenModal({
    bgColor: '#111827',
    headerHeight: HEADER_HEIGHT,
  });

  const addEntry = (roomName = '') => {
    const newEntry = {
      id: `entry-${Date.now()}`,
      room: roomName,
      colorName: '',
      colorCode: '',
      hex: '#888888',
      brand: '',
      product: '',
    };
    setEntries(prev => [...prev, newEntry]);
    setEditingId(newEntry.id);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  };

  const updateEntry = (entryId, field, value) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, [field]: value } : e));
  };

  const removeEntry = (entryId) => {
    setEntries(prev => prev.filter(e => e.id !== entryId));
    if (editingId === entryId) setEditingId(null);
  };

  const moveEntry = (entryId, direction) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entryId);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const newEntries = [...prev];
      [newEntries[idx], newEntries[newIdx]] = [newEntries[newIdx], newEntries[idx]];
      return newEntries;
    });
  };

  const handleSave = () => onSave(entries);

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
              {title || 'Kolör'}
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
          {/* Quick-add suggestions when empty */}
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
                <div key={entry.id}>
                  {/* Compact row – tap to expand */}
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer active:bg-white/[0.02]"
                    onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                  >
                    {/* Color swatch */}
                    <div
                      className="w-8 h-8 rounded-lg border border-white/10 flex-shrink-0 shadow-inner"
                      style={{ backgroundColor: entry.hex || '#888' }}
                    />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-200 truncate block">
                        {entry.room || 'Namnlös yta'}
                      </span>
                      {(entry.colorCode || entry.colorName || entry.brand) && (
                        <span className="text-xs text-gray-500 truncate block">
                          {[entry.colorName, entry.colorCode, entry.brand].filter(Boolean).join(' · ')}
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
                    <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/5">
                      {/* Room name */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Rum / Yta</label>
                        <input
                          type="text"
                          value={entry.room}
                          onChange={(e) => updateEntry(entry.id, 'room', e.target.value)}
                          placeholder="T.ex. Fasad, Kök..."
                          autoFocus
                          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        {/* Quick room suggestions */}
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

                      {/* Color picker + color name */}
                      <div className="flex gap-2">
                        <div className="flex-shrink-0">
                          <label className="text-xs text-gray-500 mb-1 block">Färg</label>
                          <input
                            type="color"
                            value={entry.hex || '#888888'}
                            onChange={(e) => updateEntry(entry.id, 'hex', e.target.value)}
                            className="w-12 h-12 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">Färgnamn</label>
                          <input
                            type="text"
                            value={entry.colorName}
                            onChange={(e) => updateEntry(entry.id, 'colorName', e.target.value)}
                            placeholder="T.ex. Dimgrön, Äggskal..."
                            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
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
                          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-base font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500"
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
                            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">Produkt / Glans</label>
                          <input
                            type="text"
                            value={entry.product}
                            onChange={(e) => updateEntry(entry.id, 'product', e.target.value)}
                            placeholder="T.ex. Elegant, matt"
                            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Actions: move / delete */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveEntry(entry.id, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
                            <ArrowUp size={14} />
                          </button>
                          <button type="button" onClick={() => moveEntry(entry.id, 1)} disabled={i === entries.length - 1} className="w-8 h-8 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
                            <ArrowDown size={14} />
                          </button>
                        </div>
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
